"""
Session management routes including SSE streaming for AI generation.

SSE design:
  - Client calls POST /sessions to create a session record
  - Client calls GET /sessions/{id}/stream to start/resume generation
  - Backend streams state events then a final `result` event

Auth note:
  The SSE stream route validates the token in the route handler (before the
  StreamingResponse is created), then passes primitive values to the async
  generator. This avoids the dependency-lifecycle issue where FastAPI closes
  the `get_db` session as soon as the route function returns (which happens
  before streaming is complete). The generator creates its own short-lived
  DB sessions for writes.
"""
from __future__ import annotations

import asyncio
import json
import queue as thread_queue
import threading
import uuid
from datetime import datetime, timezone
from typing import AsyncGenerator, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status, Header
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from .. import models
from ..auth import get_current_user, decode_token
from ..database import get_db, SessionLocal
from ..schemas import SessionCreate, SessionOut, SessionListItem, ResultOut
from ..services.ai import run_pipeline

router = APIRouter(prefix="/sessions", tags=["sessions"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def _get_owned_session(
    session_id: uuid.UUID,
    user: models.User,
    db: Session,
) -> models.Session:
    session = (
        db.query(models.Session)
        .filter(models.Session.id == session_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return session


def _session_list_item(s: models.Session) -> SessionListItem:
    first_archetype: Optional[str] = None
    if s.result and s.result.path_hypotheses:
        first = s.result.path_hypotheses[0]
        if isinstance(first, dict):
            first_archetype = first.get("name")
    return SessionListItem(
        id=s.id,
        user_text=s.user_text,
        status=s.status,
        created_at=s.created_at,
        completed_at=s.completed_at,
        first_archetype=first_archetype,
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("", response_model=list[SessionListItem])
def list_sessions(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List the authenticated user's sessions, most recent first."""
    rows = (
        db.query(models.Session)
        .filter(models.Session.user_id == user.id)
        .order_by(models.Session.created_at.desc())
        .limit(50)
        .all()
    )
    return [_session_list_item(s) for s in rows]


@router.post("", response_model=SessionOut, status_code=201)
def create_session(
    body: SessionCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new session with the user's free-form text."""
    session = models.Session(user_id=user.id, user_text=body.user_text)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/{session_id}", response_model=SessionOut)
def get_session(
    session_id: uuid.UUID,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch a single session (with result if complete)."""
    return _get_owned_session(session_id, user, db)


@router.delete("/{session_id}", status_code=204)
def delete_session(
    session_id: uuid.UUID,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a session and its result."""
    session = _get_owned_session(session_id, user, db)
    db.delete(session)
    db.commit()


@router.get("/{session_id}/stream")
async def stream_session(
    session_id: uuid.UUID,
    request: Request,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    x_openai_key: Optional[str] = Header(None, alias="X-OpenAI-Key"),
):
    """
    SSE endpoint that streams generation progress and the final result.

    Events:
      status  {"phase": "extracting"|"synthesizing"|"evaluating"|"repairing"|"done"}
      result  {reflection, clarifying_question, insights, path_hypotheses, eval, retries_used}
      done    {}
      error   {"message": "..."}

    Supports BYOK: pass X-OpenAI-Key header to use your own API key.
    
    Reconnect: send Last-Event-ID header. If the session is already `done`,
    the cached result is replayed immediately.
    """
    session = _get_owned_session(session_id, user, db)

    # ── Already done: serve cached result ──────────────────────────────────
    if session.status == "done" and session.result:
        r = session.result

        async def _cached() -> AsyncGenerator[str, None]:
            yield _sse("status", {"phase": "done"})
            yield _sse("result", {
                "reflection": r.reflection,
                "clarifying_question": r.clarifying_question,
                "insights": r.insights,
                "path_hypotheses": r.path_hypotheses,
                "eval": r.eval_data,
                "retries_used": r.retries_used,
            })
            yield _sse("done", {})

        return StreamingResponse(
            _cached(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    # ── Error state: tell client to retry ──────────────────────────────────
    if session.status == "error":
        async def _err() -> AsyncGenerator[str, None]:
            yield _sse("error", {
                "message": "Previous generation failed. Create a new session."
            })

        return StreamingResponse(
            _err(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache"},
        )

    # ── Already generating: reject to prevent duplicate work ───────────────
    if session.status == "generating":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Generation already in progress for this session",
        )

    # ── Start generation ────────────────────────────────────────────────────
    session.status = "generating"
    db.commit()

    # Extract primitive values before the `db` dependency closes
    session_id_val = session.id
    user_text = session.user_text

    return StreamingResponse(
        _generate_and_stream(session_id_val, user_text, x_openai_key),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ---------------------------------------------------------------------------
# SSE generator (runs after the route handler returns)
# ---------------------------------------------------------------------------

async def _generate_and_stream(
    session_id: uuid.UUID,
    user_text: str,
    openai_api_key: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """
    Async generator that:
    1. Runs the AI pipeline in a thread pool (non-blocking).
    2. Forwards status callbacks as SSE events while the pipeline runs.
    3. Saves the result to the DB and emits the final `result` event.
    
    Args:
        openai_api_key: Optional user-provided API key (BYOK).
    """
    status_q: thread_queue.Queue = thread_queue.Queue()

    def on_status(phase: str) -> None:
        status_q.put(("status", {"phase": phase}))

    def pipeline_thread() -> None:
        try:
            result = run_pipeline(user_text, on_status=on_status, openai_api_key=openai_api_key)
            status_q.put(("result", result))
        except Exception as exc:
            status_q.put(("error", str(exc)))
        finally:
            status_q.put(None)  # sentinel

    thread = threading.Thread(target=pipeline_thread, daemon=True)
    thread.start()

    error_message: Optional[str] = None
    result_data: Optional[dict] = None

    # Drain the queue while the thread runs
    while True:
        try:
            item = status_q.get(timeout=0.05)
        except thread_queue.Empty:
            await asyncio.sleep(0.01)
            continue

        if item is None:
            break

        event, data = item
        if event == "status":
            yield _sse("status", data)
        elif event == "result":
            result_data = data
        elif event == "error":
            error_message = data

    thread.join()

    if error_message or result_data is None:
        # Update session status to error
        with SessionLocal() as db:
            s = db.query(models.Session).filter(
                models.Session.id == session_id
            ).first()
            if s:
                s.status = "error"
                db.commit()
        yield _sse("error", {"message": error_message or "Generation failed"})
        return

    # Persist result
    with SessionLocal() as db:
        result_row = models.Result(
            session_id=session_id,
            reflection=result_data["reflection"],
            clarifying_question=result_data.get("clarifying_question", ""),
            insights=result_data["insights"],
            path_hypotheses=result_data["path_hypotheses"],
            eval_data=result_data.get("eval"),
            retries_used=result_data.get("retries_used", 0),
        )
        db.add(result_row)

        s = db.query(models.Session).filter(
            models.Session.id == session_id
        ).first()
        if s:
            s.status = "done"
            s.completed_at = datetime.now(timezone.utc)
        db.commit()

    yield _sse("result", {
        "reflection": result_data["reflection"],
        "clarifying_question": result_data.get("clarifying_question", ""),
        "insights": result_data["insights"],
        "path_hypotheses": result_data["path_hypotheses"],
        "eval": result_data.get("eval"),
        "retries_used": result_data.get("retries_used", 0),
    })
    yield _sse("done", {})
