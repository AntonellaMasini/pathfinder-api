import os, json

from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from openai import OpenAI
from typing import Optional
from elevenlabs.client import ElevenLabs

from .schemas import ReflectRequest, ReflectResponse, Insights, PathHypothesis, EvalResult
from .prompts import EXTRACT_PROMPT, SYNTHESIZE_PROMPT, EVAL_PROMPT, REPAIR_PROMPT

load_dotenv()  # loads .env

app = FastAPI(title="Pathfinder API", version="0.1.0")
client = OpenAI()  # reads OPENAI_API_KEY from env

MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
PRETTY_JSON = os.getenv("PRETTY_JSON", "false").lower() == "true"
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "1"))
RETRY_MIN_SCORE = int(os.getenv("RETRY_MIN_SCORE", "3"))

elevenlabs = ElevenLabs(
  api_key=os.getenv("ELEVENLABS_API_KEY"),
)

ELEVEN_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID")
ELEVEN_MODEL_ID = os.getenv("ELEVENLABS_MODEL_ID", "eleven_flash_v2_5")

def json_response(data: dict):
    if PRETTY_JSON:
        return Response(content=json.dumps(data, indent=2), media_type="application/json")
    return data  # FastAPI will serialize compactly

def _safe_json(s: str) -> dict:
    try:
        return json.loads(s)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model returned invalid JSON: {e}")

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/reflect", response_model=ReflectResponse)
def reflect(req: ReflectRequest):
    user_text = req.text.strip()

    # 1) Extract structured insights
    extract = client.responses.create(
        model=MODEL,
        input=[
            {"role": "system", "content": EXTRACT_PROMPT},
            {"role": "user", "content": user_text},
        ],
    )

    extract_text = extract.output_text
    insights_dict = _safe_json(extract_text)

    # 2) Synthesize reflection + hypotheses
    synth = client.responses.create(
        model=MODEL,
        input=[
            {"role": "system", "content": SYNTHESIZE_PROMPT},
            {"role": "user", "content": json.dumps({"user_text": user_text, "insights": insights_dict})},
        ],
    )

    synth_dict = _safe_json(synth.output_text)

    # Shape into response models (light validation)
    insights = Insights(**insights_dict)
    paths = [PathHypothesis(**p) for p in synth_dict.get("path_hypotheses", [])]

    validated = ReflectResponse(
        insights=insights,
        reflection=synth_dict.get("reflection", ""),
        clarifying_question=synth_dict.get("clarifying_question", ""),
        path_hypotheses=paths,
    )
    return json_response(validated.model_dump())

@app.post("/evaluate", response_model=EvalResult)
def evaluate(payload: dict):
    """
    payload should include:
    - user_text (string)
    - reflection (string)
    - clarifying_question (string, optional)
    - path_hypotheses (list, optional)
    - insights (object, optional)
    """
    eval = client.responses.create(
        model=MODEL,
        input=[
            {"role": "system", "content": EVAL_PROMPT},
            {"role": "user", "content": json.dumps(payload)}
        ],
    )

    eval_dict = _safe_json(eval.output_text)

    # Extra hardening: enforce pass_gate rules server-side too. If not, the evaluator itself would just be an LLM. 
    # Should not fully trust the model, even when it’s evaluating.
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

    validated = EvalResult(**eval_dict)
    return json_response(validated.model_dump())


@app.post("/reflect_guarded")
def reflect_guarded(req: ReflectRequest):
    user_text = req.text.strip()

    # 1) Extract insights (do once)
    extract = client.responses.create(
        model=MODEL,
        input=[
            {"role": "system", "content": EXTRACT_PROMPT},
            {"role": "user", "content": user_text},
        ],
    )
    insights_dict = _safe_json(extract.output_text)

    # helper: synth step
    def run_synth(system_prompt: str, extra: Optional[dict] = None):
        payload = {"user_text": user_text, "insights": insights_dict}
        if extra:
            payload.update(extra)
        resp = client.responses.create(
            model=MODEL,
            input=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(payload)},
            ],
        )
        return _safe_json(resp.output_text)

    # helper: eval step
    def run_eval(reflect_obj: dict):
        eval_payload = {
            "user_text": user_text,
            "insights": insights_dict,
            "reflection": reflect_obj.get("reflection", ""),
            "clarifying_question": reflect_obj.get("clarifying_question", ""),
            "path_hypotheses": reflect_obj.get("path_hypotheses", []),
        }
        resp = client.responses.create(
            model=MODEL,
            input=[
                {"role": "system", "content": EVAL_PROMPT},
                {"role": "user", "content": json.dumps(eval_payload)},
            ],
        )
        eval_dict = _safe_json(resp.output_text)

        # enforce pass_gate server-side
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
        eval_dict["_min_score"] = min(scores)
        return eval_dict

    # 2) First synth
    synth_obj = run_synth(SYNTHESIZE_PROMPT)
    eval1 = run_eval(synth_obj)

    retries_used = 0

    # 3) Optional single retry if fail
    while (not eval1["pass_gate"]) and retries_used < MAX_RETRIES:
        if eval1.get("_min_score", 0) >= RETRY_MIN_SCORE:
            break  # don't retry if it's "almost fine" (save tokens)

        synth_obj = run_synth(
            REPAIR_PROMPT,
            extra={
                "issues": eval1.get("issues", []),
                "issue_evidence": eval1.get("issue_evidence", []),
            },
        )
        eval1 = run_eval(synth_obj)
        retries_used += 1

    # 4) Validate + return (include eval)
    insights = Insights(**insights_dict)
    paths = [PathHypothesis(**p) for p in synth_obj.get("path_hypotheses", [])]
    reflect_response = ReflectResponse(
        insights=insights,
        reflection=synth_obj.get("reflection", ""),
        clarifying_question=synth_obj.get("clarifying_question", ""),
        path_hypotheses=paths,
    )

    return {
        "result": reflect_response.model_dump(),
        "eval": EvalResult(**{k: v for k, v in eval1.items() if not k.startswith("_")}).model_dump(),
        "retries_used": retries_used,
    }


@app.post("/tts")
def tts(payload: dict):
    text = (payload.get("text") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Missing 'text'")

    if not os.getenv("ELEVENLABS_API_KEY") or not ELEVEN_VOICE_ID:
        raise HTTPException(status_code=500, detail="ElevenLabs env vars not set")

    if len(text) > 1200:
        text = text[:1200] + "..."

    try:
        # Collect all audio chunks first, then return as single response
        audio_stream = elevenlabs.text_to_speech.convert(
            text=text,
            voice_id=ELEVEN_VOICE_ID,
            model_id=ELEVEN_MODEL_ID,
            output_format="mp3_44100_128",
        )
        # convert() returns a generator - collect all bytes
        chunks = []
        for chunk in audio_stream:
            if chunk:
                chunks.append(chunk)
        audio_bytes = b"".join(chunks)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=f"ElevenLabs TTS failed: {repr(e)}")

    return Response(content=audio_bytes, media_type="audio/mpeg")
