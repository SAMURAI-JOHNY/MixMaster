"""Проверка защиты endpoint'ов ингредиентов."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from database.models import Ingredient


@pytest.mark.integration
def test_ingredients_query_requires_auth(client: TestClient) -> None:
    r = client.get("/api/v1/ingredients/query/")
    assert r.status_code in (401, 403)


@pytest.mark.integration
def test_ingredients_query_ok_with_token(
    client: TestClient,
    amateur_token: str,
    db_session,
) -> None:
    db_session.add(Ingredient(name="Rum", volume=500))
    db_session.commit()

    r = client.get(
        "/api/v1/ingredients/query/",
        headers={"Authorization": f"Bearer {amateur_token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    assert data["total"] >= 1
