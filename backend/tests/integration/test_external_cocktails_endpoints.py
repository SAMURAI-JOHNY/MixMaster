"""Внешний API: мок сервиса, проверка структуры и деградации."""
from __future__ import annotations

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient


@pytest.mark.integration
def test_external_search_ok_normalized(client: TestClient) -> None:
    fake_items = [
        {
            "external_id": "1",
            "name": "Margarita",
            "thumb_url": "https://x/t.png",
            "category": "Cocktail",
        }
    ]
    with patch(
        "api.routers.external_cocktails.search_cocktails_by_name",
        return_value=(fake_items, None),
    ):
        r = client.get("/api/v1/external/cocktails/search-by-name", params={"name": "Margarita"})
    assert r.status_code == 200
    data = r.json()
    assert data["degraded"] is False
    assert len(data["items"]) == 1
    assert data["items"][0]["external_id"] == "1"
    assert data["items"][0]["name"] == "Margarita"


@pytest.mark.integration
def test_external_search_degraded_still_200(client: TestClient) -> None:
    with patch(
        "api.routers.external_cocktails.search_cocktails_by_name",
        return_value=([], "ConnectTimeout: timed out"),
    ):
        r = client.get("/api/v1/external/cocktails/search-by-name", params={"name": "x"})
    assert r.status_code == 200
    data = r.json()
    assert data["degraded"] is True
    assert data["items"] == []
    assert data["message"] is not None


@pytest.mark.integration
def test_external_search_validation_empty_name(client: TestClient) -> None:
    r = client.get("/api/v1/external/cocktails/search-by-name", params={"name": ""})
    assert r.status_code == 422
