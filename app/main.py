import os, json
from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv
from openai import OpenAI

from .schemas import ReflectRequest, ReflectResponse, Insights, PathHypothesis
from .prompts import EXTRACT_PROMPT, SYNTHESIZE_PROMPT

load_dotenv()  # loads .env if present

app = FastAPI(title="Pathfinder API", version="0.1.0")
client = OpenAI()  # reads OPENAI_API_KEY from env

MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")

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

    return ReflectResponse(
        insights=insights,
        reflection=synth_dict.get("reflection", ""),
        clarifying_question=synth_dict.get("clarifying_question", ""),
        path_hypotheses=paths,
    )
