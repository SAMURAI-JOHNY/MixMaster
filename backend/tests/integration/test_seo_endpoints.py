"""Sitemap, robots.txt, JSON-LD."""
from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient


@pytest.mark.integration
def test_robots_txt_contains_sitemap_and_disallow_api(client: TestClient) -> None:
    r = client.get("/robots.txt")
    assert r.status_code == 200
    text = r.text
    assert "Sitemap:" in text
    assert "Disallow: /api/" in text


@pytest.mark.integration
def test_sitemap_lists_home_and_recipe(
    client: TestClient,
    sample_cocktail,
) -> None:
    r = client.get("/sitemap.xml")
    assert r.status_code == 200
    assert "application/xml" in r.headers.get("content-type", "")
    body = r.text
    assert "http://test.example/" in body
    assert f"/recipe/{sample_cocktail.id}" in body


@pytest.mark.integration
def test_json_ld_recipe_not_found(client: TestClient) -> None:
    r = client.get("/api/v1/seo/recipe/99999/json-ld")
    assert r.status_code == 404


@pytest.mark.integration
def test_json_ld_recipe_ok(client: TestClient, sample_cocktail) -> None:
    r = client.get(f"/api/v1/seo/recipe/{sample_cocktail.id}/json-ld")
    assert r.status_code == 200
    ct = r.headers.get("content-type", "")
    assert ct.startswith("application/json") or ct.startswith("application/ld+json")
    doc = json.loads(r.text)
    assert doc["@type"] == "Recipe"
    assert doc["name"] == "Test Margarita"
