"""T-1 / T-2: проверки контракта POST /api/v1/cocktails/ (docs/interface-contract.md, FR-4, US-5)."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


@pytest.mark.integration
def test_t1_create_cocktail_success_bartender(
    client: TestClient,
    bartender_token: str,
) -> None:
    """T-1: обычный случай — бармен создаёт коктейль по контракту ЛР3."""
    payload = {
        "name": "Negroni",
        "description": "Классика на джине",
        "instructions": (
            "Смешать в равных частях джин, кампари и красный вермут, подавать со льдом"
        ),
        "image_url": None,
        "category": "classic",
    }
    response = client.post(
        "/api/v1/cocktails/",
        headers={"Authorization": f"Bearer {bartender_token}"},
        json=payload,
    )

    # Временно неверный ожид. результат для демонстрации падения CI (ЛР4, задача 3).
    assert response.status_code == 201
    body = response.json()
    assert isinstance(body["id"], int)
    assert body["name"] == "Negroni"
    assert body["description"] == "Классика на джине"
    assert body["category"] == "classic"
    assert body["image_url"] is None
    assert "created_at" in body

    listed = client.get("/api/v1/cocktails/")
    assert listed.status_code == 200
    names = [item["name"] for item in listed.json()]
    assert "Negroni" in names


@pytest.mark.integration
def test_t2_create_cocktail_forbidden_for_amateur(
    client: TestClient,
    amateur_token: str,
) -> None:
    """T-2: ошибка по контракту — любитель получает 403, запись не создаётся."""
    payload = {
        "name": "Negroni Forbidden",
        "description": "Классика на джине",
        "instructions": None,
        "image_url": None,
        "category": "classic",
    }
    response = client.post(
        "/api/v1/cocktails/",
        headers={"Authorization": f"Bearer {amateur_token}"},
        json=payload,
    )

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Only bartenders can perform this action",
    }

    listed = client.get("/api/v1/cocktails/")
    assert listed.status_code == 200
    names = [item["name"] for item in listed.json()]
    assert "Negroni Forbidden" not in names
