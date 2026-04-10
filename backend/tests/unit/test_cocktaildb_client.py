"""Модульные тесты сервисного слоя интеграции TheCocktailDB (мок HTTP)."""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from services.cocktaildb_client import search_cocktails_by_name


@pytest.mark.unit
def test_search_normalizes_drinks() -> None:
    fake_response = MagicMock()
    fake_response.raise_for_status = MagicMock()
    fake_response.json.return_value = {
        "drinks": [
            {
                "idDrink": "42",
                "strDrink": "Margarita",
                "strDrinkThumb": "https://example.com/m.jpg",
                "strCategory": "Cocktail",
            }
        ]
    }
    mock_client_instance = MagicMock()
    mock_client_instance.get.return_value = fake_response
    mock_cm = MagicMock()
    mock_cm.__enter__.return_value = mock_client_instance
    mock_cm.__exit__.return_value = None

    with patch("services.cocktaildb_client.httpx.Client", return_value=mock_cm):
        items, err = search_cocktails_by_name("Margarita", max_retries=1)

    assert err is None
    assert len(items) == 1
    assert items[0]["external_id"] == "42"
    assert items[0]["name"] == "Margarita"
    assert items[0]["thumb_url"] == "https://example.com/m.jpg"
    assert items[0]["category"] == "Cocktail"


@pytest.mark.unit
def test_search_empty_name_returns_empty() -> None:
    items, err = search_cocktails_by_name("   ", max_retries=1)
    assert items == []
    assert err is None


@pytest.mark.unit
def test_search_null_drinks_returns_empty() -> None:
    fake_response = MagicMock()
    fake_response.raise_for_status = MagicMock()
    fake_response.json.return_value = {"drinks": None}
    mock_client_instance = MagicMock()
    mock_client_instance.get.return_value = fake_response
    mock_cm = MagicMock()
    mock_cm.__enter__.return_value = mock_client_instance
    mock_cm.__exit__.return_value = None

    with patch("services.cocktaildb_client.httpx.Client", return_value=mock_cm):
        items, err = search_cocktails_by_name("x", max_retries=1)

    assert items == []
    assert err is None


@pytest.mark.unit
def test_search_http_error_returns_message_after_retries() -> None:
    with patch("services.cocktaildb_client.httpx.Client") as client_cls:
        mock_client_instance = MagicMock()
        mock_client_instance.get.side_effect = OSError("network down")
        mock_cm = MagicMock()
        mock_cm.__enter__.return_value = mock_client_instance
        mock_cm.__exit__.return_value = None
        client_cls.return_value = mock_cm

        items, err = search_cocktails_by_name("Mojito", max_retries=2)

    assert items == []
    assert err is not None
    assert "OSError" in err or "network" in err.lower()
