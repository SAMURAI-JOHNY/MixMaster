"""
Тестовое окружение: SQLite в временном файле (одна БД на все соединения пула).
Для :memory: у SQLite каждое соединение — отдельная пустая БД, TestClient ломает схему.
"""
from __future__ import annotations

import os
import tempfile
from pathlib import Path

_test_db_dir = Path(tempfile.mkdtemp(prefix="mixmaster_pytest_"))
_test_db_file = _test_db_dir / "test.db"
os.environ["DATABASE_URL"] = f"sqlite:///{_test_db_file.as_posix()}"
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret-key-min-32-characters!!")
os.environ.setdefault("CORS_ORIGINS", "http://test")
os.environ.setdefault("PUBLIC_SITE_URL", "http://test.example")
os.environ.setdefault("STORAGE_PROVIDER", "local")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from database.database import Base, engine, SessionLocal
from main import app
from schemas.users import UserCreate
from crud import users as crud_user
from database.models import Cocktail


@pytest.fixture(autouse=True)
def _reset_db() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def db_session() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def bartender_user(db_session: Session):
    u = UserCreate(username="bartender_e2e", password="pw_test_123", role="бармен")
    return crud_user.create_user(db_session, u)


@pytest.fixture
def amateur_user(db_session: Session):
    u = UserCreate(username="amateur_e2e", password="pw_test_456", role="любитель")
    return crud_user.create_user(db_session, u)


@pytest.fixture
def bartender_token(client: TestClient, bartender_user) -> str:
    r = client.post(
        "/api/v1/auth/login",
        json={"username": "bartender_e2e", "password": "pw_test_123"},
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture
def amateur_token(client: TestClient, amateur_user) -> str:
    r = client.post(
        "/api/v1/auth/login",
        json={"username": "amateur_e2e", "password": "pw_test_456"},
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture
def sample_cocktail(db_session: Session) -> Cocktail:
    c = Cocktail(name="Test Margarita", description="Test", category="Classic")
    db_session.add(c)
    db_session.commit()
    db_session.refresh(c)
    return c
