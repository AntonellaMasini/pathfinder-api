"""
Test fixtures. Uses SQLite in-memory so no Postgres is required.
StaticPool ensures all connections share the same in-memory database.
"""
from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app

SQLITE_URL = "sqlite://"


@pytest.fixture(scope="session")
def engine():
    eng = create_engine(
        SQLITE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,  # single shared connection for in-memory DB
    )
    Base.metadata.create_all(bind=eng)
    yield eng
    Base.metadata.drop_all(bind=eng)
    eng.dispose()


@pytest.fixture()
def db_session(engine):
    TestingSession = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    session = TestingSession()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture()
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def registered_user(client):
    """Register a fresh user per test and return credentials + token."""
    uid = uuid.uuid4().hex[:8]
    email = f"user_{uid}@example.com"
    password = "testpassword123"

    resp = client.post("/auth/register", json={"email": email, "password": password})
    assert resp.status_code == 201, resp.text

    resp = client.post("/auth/login", data={"username": email, "password": password})
    assert resp.status_code == 200, resp.text

    return {"email": email, "password": password, "token": resp.json()["access_token"]}
