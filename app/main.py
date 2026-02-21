from __future__ import annotations

import json
import os
from typing import Optional

from fastapi import FastAPI, HTTPException, Request, Response, UploadFile, File, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import tempfile
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from dotenv import load_dotenv
from openai import OpenAI
from elevenlabs.client import ElevenLabs

from .config import get_settings
from .schemas import ReflectRequest, ReflectResponse, Insights, PathHypothesis, EvalResult
from .prompts import EXTRACT_PROMPT, SYNTHESIZE_PROMPT, EVAL_PROMPT, REPAIR_PROMPT
from .routers import auth as auth_router
from .routers import sessions as sessions_router

load_dotenv()

settings = get_settings()

# ---------------------------------------------------------------------------
# Rate limiter
# ---------------------------------------------------------------------------
limiter = Limiter(key_func=get_remote_address)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(title="Pathfinder API", version="0.2.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth_router.router)
app.include_router(sessions_router.router)

# ---------------------------------------------------------------------------
# Legacy OpenAI / ElevenLabs clients (used by existing endpoints below)
# ---------------------------------------------------------------------------
_legacy_client = OpenAI(api_key=settings.openai_api_key or None)
MODEL = settings.openai_model
PRETTY_JSON = settings.pretty_json
MAX_RETRIES = settings.max_retries
RETRY_MIN_SCORE = settings.retry_min_score

_elevenlabs = ElevenLabs(api_key=settings.elevenlabs_api_key or None)
ELEVEN_VOICE_ID = settings.elevenlabs_voice_id
ELEVEN_MODEL_ID = settings.elevenlabs_model_id


# ---------------------------------------------------------------------------
# Helpers (legacy)
# ---------------------------------------------------------------------------

def json_response(data: dict):
    if PRETTY_JSON:
        return Response(content=json.dumps(data, indent=2), media_type="application/json")
    return data


def _safe_json(s: str) -> dict:
    try:
        return json.loads(s)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model returned invalid JSON: {e}")


def _enforce_pass_gate(eval_dict: dict) -> dict:
    scores = [
        eval_dict.get("faithfulness", 0),
        eval_dict.get("non_prescriptive", 0),
        eval_dict.get("clarity", 0),
        eval_dict.get("actionability", 0),
        eval_dict.get("overreach", 0),
        eval_dict.get("advice_risk", 0),
    ]
    issues = eval_dict.get("issues", []) or []
    eval_dict["pass_gate"] = (min(scores) >= 4) and (len(issues) == 0)
    return eval_dict


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health", tags=["meta"])
def health():
    return {"ok": True, "version": app.version}


# ---------------------------------------------------------------------------
# Legacy endpoints (kept for backwards compatibility)
# ---------------------------------------------------------------------------

@app.post("/reflect", response_model=ReflectResponse, tags=["legacy"])
@limiter.limit("20/minute")
def reflect(req: ReflectRequest, request: Request):
    user_text = req.text.strip()

    extract = _legacy_client.responses.create(
        model=MODEL,
        input=[
            {"role": "system", "content": EXTRACT_PROMPT},
            {"role": "user", "content": user_text},
        ],
    )
    insights_dict = _safe_json(extract.output_text)

    synth = _legacy_client.responses.create(
        model=MODEL,
        input=[
            {"role": "system", "content": SYNTHESIZE_PROMPT},
            {"role": "user", "content": json.dumps({"user_text": user_text, "insights": insights_dict})},
        ],
    )
    synth_dict = _safe_json(synth.output_text)

    insights = Insights(**insights_dict)
    paths = [PathHypothesis(**p) for p in synth_dict.get("path_hypotheses", [])]

    validated = ReflectResponse(
        insights=insights,
        reflection=synth_dict.get("reflection", ""),
        clarifying_question=synth_dict.get("clarifying_question", ""),
        path_hypotheses=paths,
    )
    return json_response(validated.model_dump())


@app.post("/evaluate", response_model=EvalResult, tags=["legacy"])
@limiter.limit("20/minute")
def evaluate(payload: dict, request: Request):
    eval_resp = _legacy_client.responses.create(
        model=MODEL,
        input=[
            {"role": "system", "content": EVAL_PROMPT},
            {"role": "user", "content": json.dumps(payload)},
        ],
    )
    eval_dict = _safe_json(eval_resp.output_text)
    _enforce_pass_gate(eval_dict)
    validated = EvalResult(**eval_dict)
    return json_response(validated.model_dump())


@app.post("/reflect_guarded", tags=["legacy"])
@limiter.limit("10/minute")
def reflect_guarded(req: ReflectRequest, request: Request):
    user_text = req.text.strip()

    extract = _legacy_client.responses.create(
        model=MODEL,
        input=[
            {"role": "system", "content": EXTRACT_PROMPT},
            {"role": "user", "content": user_text},
        ],
    )
    insights_dict = _safe_json(extract.output_text)

    def run_synth(system_prompt: str, extra: Optional[dict] = None):
        payload = {"user_text": user_text, "insights": insights_dict}
        if extra:
            payload.update(extra)
        resp = _legacy_client.responses.create(
            model=MODEL,
            input=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(payload)},
            ],
        )
        return _safe_json(resp.output_text)

    def run_eval(reflect_obj: dict) -> dict:
        eval_payload = {
            "user_text": user_text,
            "insights": insights_dict,
            "reflection": reflect_obj.get("reflection", ""),
            "clarifying_question": reflect_obj.get("clarifying_question", ""),
            "path_hypotheses": reflect_obj.get("path_hypotheses", []),
        }
        resp = _legacy_client.responses.create(
            model=MODEL,
            input=[
                {"role": "system", "content": EVAL_PROMPT},
                {"role": "user", "content": json.dumps(eval_payload)},
            ],
        )
        d = _safe_json(resp.output_text)
        _enforce_pass_gate(d)
        d["_min_score"] = min([
            d.get("faithfulness", 0), d.get("non_prescriptive", 0),
            d.get("clarity", 0), d.get("actionability", 0),
            d.get("overreach", 0), d.get("advice_risk", 0),
        ])
        return d

    synth_obj = run_synth(SYNTHESIZE_PROMPT)
    eval1 = run_eval(synth_obj)
    retries_used = 0

    while (not eval1["pass_gate"]) and retries_used < MAX_RETRIES:
        if eval1.get("_min_score", 0) >= RETRY_MIN_SCORE:
            break
        synth_obj = run_synth(
            REPAIR_PROMPT,
            extra={"issues": eval1.get("issues", []), "issue_evidence": eval1.get("issue_evidence", [])},
        )
        eval1 = run_eval(synth_obj)
        retries_used += 1

    insights = Insights(**insights_dict)
    paths = [PathHypothesis(**p) for p in synth_obj.get("path_hypotheses", [])]
    reflect_response = ReflectResponse(
        insights=insights,
        reflection=synth_obj.get("reflection", ""),
        clarifying_question=synth_obj.get("clarifying_question", ""),
        path_hypotheses=paths,
    )

    eval_out = {k: v for k, v in eval1.items() if not k.startswith("_")}

    return {
        "result": reflect_response.model_dump(),
        "eval": EvalResult(**eval_out).model_dump(),
        "retries_used": retries_used,
    }


@app.post("/tts", tags=["legacy"])
@limiter.limit("20/minute")
def tts(
    payload: dict,
    request: Request,
    x_elevenlabs_key: Optional[str] = Header(None, alias="X-ElevenLabs-Key"),
    x_elevenlabs_voice: Optional[str] = Header(None, alias="X-ElevenLabs-Voice"),
):
    """
    Text-to-speech using ElevenLabs.
    
    Supports BYOK: pass X-ElevenLabs-Key and X-ElevenLabs-Voice headers.
    If no key is provided, returns 400 (TTS is optional).
    """
    text = (payload.get("text") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Missing 'text'")

    # Determine which credentials to use
    api_key = x_elevenlabs_key or settings.elevenlabs_api_key
    voice_id = x_elevenlabs_voice or ELEVEN_VOICE_ID

    if not api_key or not voice_id:
        raise HTTPException(
            status_code=400,
            detail="TTS not configured. Add your ElevenLabs API key in settings to enable voice playback."
        )

    text = text[:1200] + ("..." if len(text) > 1200 else "")

    try:
        # Create client with user's key if provided
        client = ElevenLabs(api_key=api_key)
        audio_stream = client.text_to_speech.convert(
            text=text,
            voice_id=voice_id,
            model_id=ELEVEN_MODEL_ID,
            output_format="mp3_44100_128",
        )
        audio_bytes = b"".join(chunk for chunk in audio_stream if chunk)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=f"ElevenLabs TTS failed: {repr(e)}")

    return Response(content=audio_bytes, media_type="audio/mpeg")


# ---------------------------------------------------------------------------
# Transcription (Whisper)
# ---------------------------------------------------------------------------

@app.post("/transcribe", tags=["legacy"])
@limiter.limit("20/minute")
async def transcribe(
    request: Request,
    audio: UploadFile = File(...),
    x_openai_key: Optional[str] = Header(None, alias="X-OpenAI-Key"),
):
    """
    Transcribe audio to text using OpenAI Whisper.
    Accepts audio files (webm, mp3, wav, m4a, etc.).
    
    Supports BYOK: pass X-OpenAI-Key header to use your own API key.
    """
    # Determine which API key to use (user-provided or server default)
    api_key = x_openai_key or settings.openai_api_key
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="No API key provided. Please add your OpenAI API key in settings."
        )

    # Read the uploaded audio file
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    # Determine file extension from content type or filename
    ext = ".webm"  # default for browser MediaRecorder
    if audio.filename:
        ext = Path(audio.filename).suffix or ext
    elif audio.content_type:
        type_to_ext = {
            "audio/webm": ".webm",
            "audio/mp3": ".mp3",
            "audio/mpeg": ".mp3",
            "audio/wav": ".wav",
            "audio/x-wav": ".wav",
            "audio/mp4": ".m4a",
            "audio/m4a": ".m4a",
        }
        ext = type_to_ext.get(audio.content_type, ".webm")

    # Write to temp file (Whisper API requires a file)
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        # Create client with appropriate key
        client = OpenAI(api_key=api_key)
        with open(tmp_path, "rb") as f:
            transcription = client.audio.transcriptions.create(
                model="whisper-1",
                file=f,
            )
        return {"text": transcription.text}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Transcription failed: {repr(e)}")
    finally:
        # Clean up temp file
        Path(tmp_path).unlink(missing_ok=True)


# ---------------------------------------------------------------------------
# Static files (serve frontend in production)
# ---------------------------------------------------------------------------

# Path to built frontend (created by Docker build)
_static_dir = Path(__file__).parent.parent / "static"

if _static_dir.exists():
    # Serve static assets (JS, CSS, images)
    app.mount("/assets", StaticFiles(directory=_static_dir / "assets"), name="assets")

    # Catch-all route: serve index.html for client-side routing
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Try to serve the exact file first
        file_path = _static_dir / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        # Otherwise serve index.html (for React Router)
        return FileResponse(_static_dir / "index.html")
