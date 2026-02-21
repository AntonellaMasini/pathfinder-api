"""
Integration tests for session CRUD endpoints.
The SSE /stream endpoint is tested with a mocked AI pipeline
so no OpenAI calls are made.
"""
from __future__ import annotations

import json
from unittest.mock import patch

import pytest


# ---------------------------------------------------------------------------
# Session CRUD
# ---------------------------------------------------------------------------

def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_create_session(client, registered_user):
    resp = client.post(
        "/sessions",
        json={"user_text": "I love building products and hate bureaucracy."},
        headers=_auth_headers(registered_user["token"]),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "pending"
    assert "id" in data


def test_create_session_too_short(client, registered_user):
    resp = client.post(
        "/sessions",
        json={"user_text": "short"},
        headers=_auth_headers(registered_user["token"]),
    )
    assert resp.status_code == 422


def test_create_session_unauthenticated(client):
    resp = client.post(
        "/sessions",
        json={"user_text": "I love building products and hate bureaucracy."},
    )
    assert resp.status_code == 401


def test_list_sessions_empty(client, registered_user):
    resp = client.get(
        "/sessions",
        headers=_auth_headers(registered_user["token"]),
    )
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_get_session(client, registered_user):
    create = client.post(
        "/sessions",
        json={"user_text": "I love building products and hate bureaucracy."},
        headers=_auth_headers(registered_user["token"]),
    )
    session_id = create.json()["id"]

    resp = client.get(
        f"/sessions/{session_id}",
        headers=_auth_headers(registered_user["token"]),
    )
    assert resp.status_code == 200
    assert resp.json()["id"] == session_id


def test_get_session_not_found(client, registered_user):
    resp = client.get(
        "/sessions/00000000-0000-0000-0000-000000000000",
        headers=_auth_headers(registered_user["token"]),
    )
    assert resp.status_code == 404


def test_get_session_other_user(client, db_session):
    """A session created by user A should not be accessible by user B."""
    # Register two users
    client.post("/auth/register", json={"email": "a@test.com", "password": "password123"})
    client.post("/auth/register", json={"email": "b@test.com", "password": "password123"})

    token_a = client.post(
        "/auth/login", data={"username": "a@test.com", "password": "password123"}
    ).json()["access_token"]
    token_b = client.post(
        "/auth/login", data={"username": "b@test.com", "password": "password123"}
    ).json()["access_token"]

    session_id = client.post(
        "/sessions",
        json={"user_text": "I love building products."},
        headers=_auth_headers(token_a),
    ).json()["id"]

    resp = client.get(
        f"/sessions/{session_id}",
        headers=_auth_headers(token_b),
    )
    assert resp.status_code == 403


def test_delete_session(client, registered_user):
    session_id = client.post(
        "/sessions",
        json={"user_text": "I love building products and hate bureaucracy."},
        headers=_auth_headers(registered_user["token"]),
    ).json()["id"]

    resp = client.delete(
        f"/sessions/{session_id}",
        headers=_auth_headers(registered_user["token"]),
    )
    assert resp.status_code == 204

    # Should be gone
    resp = client.get(
        f"/sessions/{session_id}",
        headers=_auth_headers(registered_user["token"]),
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# SSE stream (mocked pipeline)
# ---------------------------------------------------------------------------

MOCK_RESULT = {
    "reflection": "It sounds like you thrive on autonomy.",
    "clarifying_question": "What does a good day at work look like for you?",
    "insights": {
        "energizers": ["autonomy", "product building"],
        "drainers": ["bureaucracy"],
        "values": ["impact"],
        "skills": ["product thinking"],
        "work_styles": ["independent"],
        "constraints": [],
        "open_questions": [],
    },
    "path_hypotheses": [
        {
            "name": "Product Founder",
            "why_it_fits": "You seem to prefer building autonomously.",
            "risks": ["high uncertainty"],
            "micro_experiments": ["Interview 3 founders this week"],
            "environment_fit": {
                "likely_to_fit": ["startups"],
                "may_be_challenging": ["large corporations"],
            },
            "example_roles": ["Founder", "Solo builder"],
            "company_archetypes": ["early-stage startups"],
        }
    ],
    "eval": {
        "faithfulness": 5,
        "non_prescriptive": 5,
        "clarity": 5,
        "actionability": 5,
        "overreach": 5,
        "advice_risk": 5,
        "issues": [],
        "issue_evidence": [],
        "overall_assessment": "Excellent",
        "pass_gate": True,
    },
    "retries_used": 0,
}


def _make_session_ctx(db_session):
    """
    Return a callable that acts like SessionLocal() but yields the test's
    db_session as a context manager (without closing it on exit).
    """
    class _Ctx:
        def __enter__(self):
            return db_session

        def __exit__(self, *args):
            # Flush so data is visible within the session, but don't close
            # (the fixture handles rollback/close).
            db_session.flush()
            return False

    def _factory():
        return _Ctx()

    return _factory


def test_stream_session_generates_result(client, registered_user, db_session):
    """Mock run_pipeline and check that the SSE stream produces result + done events."""
    session_id = client.post(
        "/sessions",
        json={"user_text": "I love building products and hate bureaucracy."},
        headers=_auth_headers(registered_user["token"]),
    ).json()["id"]

    with patch("app.routers.sessions.run_pipeline", return_value=MOCK_RESULT), \
         patch("app.routers.sessions.SessionLocal", new=_make_session_ctx(db_session)):
        resp = client.get(
            f"/sessions/{session_id}/stream",
            headers=_auth_headers(registered_user["token"]),
        )

    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers["content-type"]

    events = _parse_sse(resp.text)
    event_names = [e["event"] for e in events]

    assert "result" in event_names
    assert "done" in event_names

    result_event = next(e for e in events if e["event"] == "result")
    data = json.loads(result_event["data"])
    assert data["reflection"] == MOCK_RESULT["reflection"]
    assert len(data["path_hypotheses"]) == 1


def test_stream_session_cached_if_done(client, registered_user, db_session):
    """If a session is already done, the stream should immediately return the cached result."""
    session_id = client.post(
        "/sessions",
        json={"user_text": "I love building products and hate bureaucracy."},
        headers=_auth_headers(registered_user["token"]),
    ).json()["id"]

    mock_sl = _make_session_ctx(db_session)

    # First stream to generate and persist the result
    with patch("app.routers.sessions.run_pipeline", return_value=MOCK_RESULT), \
         patch("app.routers.sessions.SessionLocal", new=mock_sl):
        client.get(
            f"/sessions/{session_id}/stream",
            headers=_auth_headers(registered_user["token"]),
        )

    # Second stream should return the cached result immediately
    resp = client.get(
        f"/sessions/{session_id}/stream",
        headers=_auth_headers(registered_user["token"]),
    )
    assert resp.status_code == 200
    events = _parse_sse(resp.text)
    event_names = [e["event"] for e in events]
    assert "result" in event_names
    assert "done" in event_names


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_sse(body: str) -> list[dict]:
    """Parse a raw SSE body into a list of {event, data} dicts."""
    events = []
    for chunk in body.strip().split("\n\n"):
        if not chunk.strip():
            continue
        event = "message"
        data = ""
        for line in chunk.splitlines():
            if line.startswith("event: "):
                event = line[len("event: "):]
            elif line.startswith("data: "):
                data = line[len("data: "):]
        events.append({"event": event, "data": data})
    return events
