import os
from pathlib import Path
from typing import Optional, Tuple

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
from fastapi import HTTPException

STORAGE_PROVIDER = os.getenv("STORAGE_PROVIDER", "s3").lower()
S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL")
# URL для presigned GET/PUT — должен открываться из браузера (не имя сервиса Docker «minio»).
S3_PRESIGN_ENDPOINT_URL = os.getenv("S3_PRESIGN_ENDPOINT_URL")
S3_REGION = os.getenv("S3_REGION", "us-east-1")
S3_BUCKET = os.getenv("S3_BUCKET")
S3_ACCESS_KEY_ID = os.getenv("S3_ACCESS_KEY_ID")
S3_SECRET_ACCESS_KEY = os.getenv("S3_SECRET_ACCESS_KEY")
S3_PRESIGNED_EXPIRES = int(os.getenv("S3_PRESIGNED_EXPIRES", "900"))
S3_MAX_FILE_SIZE_MB = int(os.getenv("S3_MAX_FILE_SIZE_MB", "8"))
S3_MAX_FILE_SIZE_BYTES = S3_MAX_FILE_SIZE_MB * 1024 * 1024

ALLOWED_IMAGE_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
EXT_TO_MIME = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
}


def _make_s3_client(endpoint_url: Optional[str]):
    if STORAGE_PROVIDER != "s3":
        return None
    if not all([S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY]):
        raise HTTPException(status_code=500, detail="S3 is not configured correctly")
    style = os.getenv("S3_ADDRESSING_STYLE", "").strip().lower()
    if style == "virtual":
        cfg = Config(signature_version="s3v4", s3={"addressing_style": "virtual"})
    elif style == "path" or endpoint_url:
        cfg = Config(signature_version="s3v4", s3={"addressing_style": "path"})
    else:
        cfg = Config(signature_version="s3v4")
    return boto3.client(
        "s3",
        region_name=S3_REGION,
        endpoint_url=endpoint_url or None,
        aws_access_key_id=S3_ACCESS_KEY_ID,
        aws_secret_access_key=S3_SECRET_ACCESS_KEY,
        config=cfg,
    )


def get_s3_client():
    """Серверные вызовы S3 (удаление и т.д.) — в Docker обычно http://minio:9000."""
    return _make_s3_client(S3_ENDPOINT_URL)


def get_s3_presign_client():
    """Только генерация presigned URL — хост должен быть доступен из браузера."""
    ep = S3_PRESIGN_ENDPOINT_URL or S3_ENDPOINT_URL
    return _make_s3_client(ep)


def validate_file_meta(
    file_name: str, content_type: str, file_size: int
) -> Tuple[str, str]:
    """Возвращает (расширение с точкой, итоговый Content-Type).

    Браузеры/ОС часто шлют пустой тип или application/octet-stream — подставляем по расширению.
    """
    ext = Path(file_name or "").suffix.lower()
    ct = (content_type or "").strip().lower() or "application/octet-stream"
    if ct not in ALLOWED_IMAGE_MIME_TYPES:
        inferred = EXT_TO_MIME.get(ext)
        if inferred:
            ct = inferred
    if ct not in ALLOWED_IMAGE_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported content type")
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported file extension")
    if file_size <= 0 or file_size > S3_MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File size must be in range 1..{S3_MAX_FILE_SIZE_MB}MB",
        )
    return ext, ct


def parse_s3_storage_url(storage_url: str) -> Optional[Tuple[str, str]]:
    if not storage_url.startswith("s3://"):
        return None
    rest = storage_url[5:]
    if "/" not in rest:
        return None
    bucket, key = rest.split("/", 1)
    if not bucket or not key:
        return None
    return bucket, key


def object_key_from_storage_url(storage_url: str) -> Optional[str]:
    parsed = parse_s3_storage_url(storage_url)
    if not parsed:
        return None
    bucket, key = parsed
    if S3_BUCKET and bucket != S3_BUCKET:
        return None
    return key


def delete_s3_object(object_key: str) -> None:
    client = get_s3_client()
    if not client:
        return
    try:
        client.delete_object(Bucket=S3_BUCKET, Key=object_key)
    except ClientError:
        pass


def delete_stored_file(storage_url: str, object_key: Optional[str] = None) -> None:
    if not storage_url.startswith("s3://"):
        return
    key = object_key or object_key_from_storage_url(storage_url)
    if key:
        delete_s3_object(key)
