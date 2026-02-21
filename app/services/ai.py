"""
AI pipeline: extract insights → synthesize path hypotheses → evaluate → repair.
Extracted from main.py so it can be called from SSE streaming routes.
"""
from __future__ import annotations

import json
from typing import Callable, Optional

from openai import OpenAI

from ..config import get_settings
from ..prompts import EXTRACT_PROMPT, SYNTHESIZE_PROMPT, EVAL_PROMPT, REPAIR_PROMPT

settings = get_settings()

# Module-level client; re-created if settings change (unlikely in prod)
_client: Optional[OpenAI] = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.openai_api_key or None)
    return _client


def _chat(system: str, user: str) -> str:
    """Single-turn chat completion. Returns output text."""
    client = _get_client()
    resp = client.responses.create(
        model=settings.openai_model,
        input=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    return resp.output_text


def _safe_json(s: str) -> dict:
    try:
        return json.loads(s)
    except Exception as exc:
        raise ValueError(f"Model returned invalid JSON: {exc}") from exc


def _enforce_pass_gate(eval_dict: dict) -> dict:
    """Re-compute pass_gate server-side (don't trust model output)."""
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


def run_pipeline(
    user_text: str,
    on_status: Optional[Callable[[str], None]] = None,
) -> dict:
    """
    Run the full Pathfinder AI pipeline.

    Args:
        user_text: The user's free-form career reflection.
        on_status: Optional sync callback called with phase strings:
                   "extracting", "synthesizing", "evaluating", "done".

    Returns:
        dict with keys: reflection, clarifying_question, insights,
        path_hypotheses, eval, retries_used.
    """

    def status(phase: str):
        if on_status:
            on_status(phase)

    # 1. Extract structured insights
    status("extracting")
    insights_dict = _safe_json(_chat(EXTRACT_PROMPT, user_text))

    # 2. Synthesize reflection + hypotheses
    status("synthesizing")
    synth_payload = json.dumps({"user_text": user_text, "insights": insights_dict})
    synth_obj = _safe_json(_chat(SYNTHESIZE_PROMPT, synth_payload))

    # 3. Evaluate
    status("evaluating")
    eval_payload = json.dumps({
        "user_text": user_text,
        "insights": insights_dict,
        "reflection": synth_obj.get("reflection", ""),
        "clarifying_question": synth_obj.get("clarifying_question", ""),
        "path_hypotheses": synth_obj.get("path_hypotheses", []),
    })
    eval_dict = _enforce_pass_gate(_safe_json(_chat(EVAL_PROMPT, eval_payload)))

    retries_used = 0

    # 4. Optional repair loop
    while (not eval_dict["pass_gate"]) and retries_used < settings.max_retries:
        if eval_dict.get("_min_score", 0) >= settings.retry_min_score:
            break  # "almost fine" — skip retry to save tokens

        status("repairing")
        repair_user = json.dumps({
            "user_text": user_text,
            "insights": insights_dict,
            "issues": eval_dict.get("issues", []),
            "issue_evidence": eval_dict.get("issue_evidence", []),
        })
        synth_obj = _safe_json(_chat(REPAIR_PROMPT, repair_user))

        eval_payload = json.dumps({
            "user_text": user_text,
            "insights": insights_dict,
            "reflection": synth_obj.get("reflection", ""),
            "clarifying_question": synth_obj.get("clarifying_question", ""),
            "path_hypotheses": synth_obj.get("path_hypotheses", []),
        })
        eval_dict = _enforce_pass_gate(_safe_json(_chat(EVAL_PROMPT, eval_payload)))
        retries_used += 1

    status("done")

    # Strip internal bookkeeping key before returning
    eval_dict.pop("_min_score", None)

    return {
        "reflection": synth_obj.get("reflection", ""),
        "clarifying_question": synth_obj.get("clarifying_question", ""),
        "insights": insights_dict,
        "path_hypotheses": synth_obj.get("path_hypotheses", []),
        "eval": eval_dict,
        "retries_used": retries_used,
    }
