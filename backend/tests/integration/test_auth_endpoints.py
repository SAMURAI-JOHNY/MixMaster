"""Интеграционные тесты аутентификации и структуры ответов."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from schemas.users import UserCreate
from crud import users as crud_user


@pytest.mark.integration
def test_register_login_verify_flow(client: TestClient, db_session) -> None:
    r = client.post(
        "/api/v1/auth/register",
        json={
            "username": "u_flow",
            "password": "password123",
            "role": "любитель",
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["username"] == "u_flow"
    assert "id" in body

    bad = client.post(
        "/api/v1/auth/login",
        json={"username": "u_flow", "password": "wrong"},
    )
    assert bad.status_code == 401

    ok = client.post(
        "/api/v1/auth/login",
        json={"username": "u_flow", "password": "password123"},
    )
    assert ok.status_code == 200
    tok = ok.json()
    assert "access_token" in tok
    assert "refresh_token" in tok
    assert tok.get("token_type") == "bearer"

    me = client.get(
        "/api/v1/auth/verify",
        headers={"Authorization": f"Bearer {tok['access_token']}"},
    )
    assert me.status_code == 200
    assert me.json()["valid"] is True
    assert me.json()["username"] == "u_flow"


@pytest.mark.integration
def test_register_duplicate_username(client: TestClient, db_session) -> None:
    crud_user.create_user(
        db_session,
        UserCreate(username="dup", password="x", role="любитель"),
    )
    r = client.post(
        "/api/v1/auth/register",
        json={"username": "dup", "password": "y", "role": "любитель"},
    )
    assert r.status_code == 400


@pytest.mark.integration
def test_verify_without_token_unauthorized(client: TestClient) -> None:
    r = client.get("/api/v1/auth/verify")
    assert r.status_code in (401, 403)
