"""Unit + integration tests for auth endpoints and utilities."""
from __future__ import annotations

import pytest
from app.auth import hash_password, verify_password, create_access_token, decode_token


# ---------------------------------------------------------------------------
# Unit tests — pure functions, no DB
# ---------------------------------------------------------------------------

def test_hash_password_is_not_plaintext():
    hashed = hash_password("mysecretpassword")
    assert hashed != "mysecretpassword"
    assert len(hashed) > 20


def test_verify_password_correct():
    hashed = hash_password("correcthorse")
    assert verify_password("correcthorse", hashed) is True


def test_verify_password_wrong():
    hashed = hash_password("correcthorse")
    assert verify_password("wrongpass", hashed) is False


def test_create_and_decode_token():
    user_id = "12345678-1234-5678-1234-567812345678"
    token = create_access_token(user_id)
    decoded = decode_token(token)
    assert decoded == user_id


def test_decode_invalid_token_returns_none():
    assert decode_token("not.a.valid.token") is None


# ---------------------------------------------------------------------------
# Integration tests — hit the HTTP endpoints
# ---------------------------------------------------------------------------

def test_register_success(client):
    resp = client.post(
        "/auth/register",
        json={"email": "new@example.com", "password": "password123"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "new@example.com"
    assert "id" in data
    assert "hashed_password" not in data


def test_register_duplicate_email(client):
    client.post(
        "/auth/register",
        json={"email": "dup@example.com", "password": "password123"},
    )
    resp = client.post(
        "/auth/register",
        json={"email": "dup@example.com", "password": "password123"},
    )
    assert resp.status_code == 400
    assert "already registered" in resp.json()["detail"]


def test_register_short_password(client):
    resp = client.post(
        "/auth/register",
        json={"email": "short@example.com", "password": "abc"},
    )
    assert resp.status_code == 422  # Pydantic validation error


def test_login_success(client):
    client.post(
        "/auth/register",
        json={"email": "login@example.com", "password": "password123"},
    )
    resp = client.post(
        "/auth/login",
        data={"username": "login@example.com", "password": "password123"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client):
    client.post(
        "/auth/register",
        json={"email": "wrongpw@example.com", "password": "rightpassword"},
    )
    resp = client.post(
        "/auth/login",
        data={"username": "wrongpw@example.com", "password": "wrongpassword"},
    )
    assert resp.status_code == 401


def test_login_unknown_email(client):
    resp = client.post(
        "/auth/login",
        data={"username": "ghost@example.com", "password": "doesntmatter"},
    )
    assert resp.status_code == 401


def test_me_endpoint(client, registered_user):
    resp = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {registered_user['token']}"},
    )
    assert resp.status_code == 200
    assert resp.json()["email"] == registered_user["email"]


def test_me_no_token(client):
    resp = client.get("/auth/me")
    assert resp.status_code == 401


def test_me_invalid_token(client):
    resp = client.get(
        "/auth/me",
        headers={"Authorization": "Bearer invalid.token.here"},
    )
    assert resp.status_code == 401
