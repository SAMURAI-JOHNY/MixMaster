"""Локальные unit-тесты валидации метаданных файла (без S3)."""
from __future__ import annotations

import pytest
from fastapi import HTTPException

from core.storage import validate_file_meta


@pytest.mark.unit
def test_validate_file_meta_ok_png() -> None:
    ext, content_type = validate_file_meta("photo.png", "image/png", 1024)
    assert ext == ".png"
    assert content_type == "image/png"


@pytest.mark.unit
def test_validate_file_meta_rejects_bad_extension() -> None:
    with pytest.raises(HTTPException) as exc_info:
        validate_file_meta("notes.txt", "text/plain", 100)
    assert exc_info.value.status_code == 400
    assert "Unsupported" in str(exc_info.value.detail)
