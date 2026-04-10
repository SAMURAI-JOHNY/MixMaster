"""Интеграционные тесты коктейлей: коды ответа, права, валидация."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


@pytest.mark.integration
def test_query_cocktails_validation_invalid_sort(client: TestClient, sample_cocktail) -> None:
    r = client.get("/api/v1/cocktails/query/", params={"sort_by": "invalid"})
    assert r.status_code == 422


@pytest.mark.integration
def test_get_cocktail_not_found(client: TestClient) -> None:
    r = client.get("/api/v1/cocktails/99999")
    assert r.status_code == 404
    assert "detail" in r.json()


@pytest.mark.integration
def test_get_cocktail_ok_structure(client: TestClient, sample_cocktail) -> None:
    r = client.get(f"/api/v1/cocktails/{sample_cocktail.id}")
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == sample_cocktail.id
    assert data["name"] == "Test Margarita"
    assert "recipes" in data


@pytest.mark.integration
def test_create_cocktail_forbidden_for_amateur(
    client: TestClient,
    amateur_token: str,
) -> None:
    r = client.post(
        "/api/v1/cocktails/",
        headers={"Authorization": f"Bearer {amateur_token}"},
        json={"name": "New", "description": "d"},
    )
    assert r.status_code == 403


@pytest.mark.integration
def test_create_cocktail_ok_bartender(
    client: TestClient,
    bartender_token: str,
) -> None:
    r = client.post(
        "/api/v1/cocktails/",
        headers={"Authorization": f"Bearer {bartender_token}"},
        json={"name": "Mojito Lab", "description": "Fresh", "category": "Classic"},
    )
    assert r.status_code == 200
    assert r.json()["name"] == "Mojito Lab"


@pytest.mark.integration
def test_query_pagination_and_filter(
    client: TestClient,
    bartender_token: str,
) -> None:
    for name in ("Alpha Z", "Beta Z"):
        client.post(
            "/api/v1/cocktails/",
            headers={"Authorization": f"Bearer {bartender_token}"},
            json={"name": name},
        )
    r = client.get(
        "/api/v1/cocktails/query/",
        params={"q": "Alpha", "page": 1, "limit": 10, "sort_by": "name", "sort_order": "asc"},
    )
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1
