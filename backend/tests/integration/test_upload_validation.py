"""Граничные случаи загрузки / view-url без реального S3."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


@pytest.mark.integration
def test_view_url_query_too_short(client: TestClient) -> None:
    r = client.get("/api/v1/upload/view-url", params={"storage_url": "short"})
    assert r.status_code == 422
