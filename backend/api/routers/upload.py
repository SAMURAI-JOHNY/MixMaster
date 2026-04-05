import os
from typing import List, Optional

from botocore.exceptions import ClientError
from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
)
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from api.routers.auth import get_bartender_user, get_current_user
from core import storage as st
from crud import file_attachments as crud_fa
from database.database import get_db
from database.models import Cocktail, FileEntityType, Ingredient, User, UserRole
from schemas.file_attachments import (
    FileAttachmentCreate,
    FileAttachmentRead,
    ViewUrlResponse,
)

router = APIRouter(prefix="/upload", tags=["upload"])
optional_bearer = HTTPBearer(auto_error=False)


class PresignUploadRequest(BaseModel):
    folder: str = Field(pattern="^(avatars|cocktails|ingredients)$")
    file_name: str = Field(min_length=3, max_length=255)
    content_type: str = Field(min_length=3, max_length=100)
    file_size: int = Field(gt=0)


class PresignUploadResponse(BaseModel):
    upload_url: str
    object_key: str
    storage_url: str
    expires_in: int


class PresignDownloadResponse(BaseModel):
    download_url: str
    expires_in: Optional[int] = None


class S3DirectUploadResponse(BaseModel):
    """Ответ после загрузки файла на сервер → S3 (без presigned PUT из браузера)."""

    url: str
    object_key: str


async def _upload_file_to_s3(folder: str, file: UploadFile) -> S3DirectUploadResponse:
    if st.STORAGE_PROVIDER != "s3":
        raise HTTPException(status_code=400, detail="Direct S3 upload requires STORAGE_PROVIDER=s3")
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")
    body = await file.read(st.S3_MAX_FILE_SIZE_BYTES + 1)
    if len(body) > st.S3_MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File size must be in range 1..{st.S3_MAX_FILE_SIZE_MB}MB",
        )
    if len(body) == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    raw_ct = file.content_type or ""
    ext, ct = st.validate_file_meta(file.filename, raw_ct, len(body))
    object_key = f"{folder}/{os.urandom(16).hex()}{ext}"
    s3 = st.get_s3_client()
    try:
        s3.put_object(
            Bucket=st.S3_BUCKET,
            Key=object_key,
            Body=body,
            ContentType=ct,
        )
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"S3 upload failed: {e}")
    return S3DirectUploadResponse(
        url=f"s3://{st.S3_BUCKET}/{object_key}",
        object_key=object_key,
    )


def _validate_object_key_prefix(folder: str, object_key: Optional[str]) -> None:
    if not object_key:
        return
    prefix = f"{folder}/"
    if not object_key.startswith(prefix):
        raise HTTPException(status_code=400, detail="object_key does not match folder")


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_bearer),
    db: Session = Depends(get_db),
) -> Optional[User]:
    if not credentials:
        return None
    from crud import users as crud_user
    from crud.users import verify_token

    username = verify_token(credentials.credentials)
    if not username:
        return None
    return crud_user.get_user_by_username(db, username=username)


@router.post("/presign-upload", response_model=PresignUploadResponse)
def presign_upload(
    request: PresignUploadRequest,
    current_user: User = Depends(get_current_user),
):
    if st.STORAGE_PROVIDER != "s3":
        raise HTTPException(
            status_code=400, detail="Presigned uploads require STORAGE_PROVIDER=s3"
        )

    ext, ct_eff = st.validate_file_meta(
        request.file_name, request.content_type, request.file_size
    )
    object_key = f"{request.folder}/{os.urandom(16).hex()}{ext}"

    s3 = st.get_s3_presign_client()
    try:
        upload_url = s3.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": st.S3_BUCKET,
                "Key": object_key,
                "ContentType": ct_eff,
            },
            ExpiresIn=st.S3_PRESIGNED_EXPIRES,
            HttpMethod="PUT",
        )
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Failed to presign upload: {e}")

    return PresignUploadResponse(
        upload_url=upload_url,
        object_key=object_key,
        storage_url=f"s3://{st.S3_BUCKET}/{object_key}",
        expires_in=st.S3_PRESIGNED_EXPIRES,
    )


@router.get("/view-url", response_model=ViewUrlResponse)
def view_url(
    storage_url: str = Query(..., min_length=8, max_length=1024),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    kind, _ = crud_fa.resolve_access_kind(db, storage_url, current_user)
    if kind == "denied":
        raise HTTPException(status_code=403, detail="Access denied to this file")

    if not storage_url.startswith("s3://"):
        if storage_url.startswith("http://") or storage_url.startswith("https://"):
            return ViewUrlResponse(url=storage_url, kind="direct")
        raise HTTPException(status_code=400, detail="Invalid storage_url")

    object_key = st.object_key_from_storage_url(storage_url)
    if not object_key:
        raise HTTPException(status_code=400, detail="Invalid S3 storage_url")

    if st.STORAGE_PROVIDER != "s3":
        raise HTTPException(status_code=503, detail="S3 storage is not active")

    s3 = st.get_s3_presign_client()
    try:
        download_url = s3.generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": st.S3_BUCKET, "Key": object_key},
            ExpiresIn=st.S3_PRESIGNED_EXPIRES,
            HttpMethod="GET",
        )
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Failed to presign download: {e}")

    return ViewUrlResponse(
        url=download_url,
        expires_in=st.S3_PRESIGNED_EXPIRES,
        kind="presigned",
    )


@router.get("/presign-download", response_model=PresignDownloadResponse)
def presign_download(
    storage_url: str = Query(..., min_length=8, max_length=1024),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Аутентифицированная выдача pre-signed URL (тот же контроль доступа, что и view-url)."""
    kind, _ = crud_fa.resolve_access_kind(db, storage_url, current_user)
    if kind == "denied":
        raise HTTPException(status_code=403, detail="Access denied to this file")

    if not storage_url.startswith("s3://"):
        if storage_url.startswith("http://") or storage_url.startswith("https://"):
            return PresignDownloadResponse(download_url=storage_url)
        raise HTTPException(status_code=400, detail="Invalid storage_url")

    object_key = st.object_key_from_storage_url(storage_url)
    if not object_key:
        raise HTTPException(status_code=400, detail="Invalid S3 storage_url")

    if st.STORAGE_PROVIDER != "s3":
        raise HTTPException(status_code=503, detail="S3 storage is not active")

    s3 = st.get_s3_presign_client()
    try:
        download_url = s3.generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": st.S3_BUCKET, "Key": object_key},
            ExpiresIn=st.S3_PRESIGNED_EXPIRES,
            HttpMethod="GET",
        )
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Failed to presign download: {e}")

    return PresignDownloadResponse(
        download_url=download_url, expires_in=st.S3_PRESIGNED_EXPIRES
    )


@router.post("/s3/avatar", response_model=S3DirectUploadResponse)
async def upload_s3_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    return await _upload_file_to_s3("avatars", file)


@router.post("/s3/cocktail", response_model=S3DirectUploadResponse)
async def upload_s3_cocktail(
    file: UploadFile = File(...),
    current_user: User = Depends(get_bartender_user),
):
    return await _upload_file_to_s3("cocktails", file)


@router.post("/s3/ingredient", response_model=S3DirectUploadResponse)
async def upload_s3_ingredient(
    file: UploadFile = File(...),
    current_user: User = Depends(get_bartender_user),
):
    return await _upload_file_to_s3("ingredients", file)


def _replace_entity_attachments(
    db: Session,
    entity_type: str,
    entity_id: int,
    new_storage_url: str,
):
    existing = crud_fa.list_by_entity(db, entity_type, entity_id)
    to_remove = [r for r in existing if r.storage_url != new_storage_url]
    for row in to_remove:
        st.delete_stored_file(row.storage_url, row.object_key)
    for row in to_remove:
        db.delete(row)
    if to_remove:
        db.commit()


@router.post("/attachments", response_model=FileAttachmentRead)
def register_attachment(
    body: FileAttachmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.file_size and body.content_type:
        st.validate_file_meta(
            body.original_filename or "file.bin", body.content_type, body.file_size
        )
    elif body.content_type:
        st.validate_file_meta(body.original_filename or "file.bin", body.content_type, 1)

    et = body.entity_type
    if et == FileEntityType.USER_AVATAR.value:
        if body.entity_id != current_user.id:
            raise HTTPException(status_code=403, detail="Can only attach avatar to own profile")
    elif et in (FileEntityType.COCKTAIL.value, FileEntityType.INGREDIENT.value):
        if current_user.role != UserRole.BARTENDER.value:
            raise HTTPException(status_code=403, detail="Only bartenders can attach entity files")

        if et == FileEntityType.COCKTAIL.value:
            if not db.query(Cocktail).filter(Cocktail.id == body.entity_id).first():
                raise HTTPException(status_code=404, detail="Cocktail not found")
        else:
            if not db.query(Ingredient).filter(Ingredient.id == body.entity_id).first():
                raise HTTPException(status_code=404, detail="Ingredient not found")
    else:
        raise HTTPException(status_code=400, detail="Invalid entity_type")

    folder = {
        FileEntityType.USER_AVATAR.value: "avatars",
        FileEntityType.COCKTAIL.value: "cocktails",
        FileEntityType.INGREDIENT.value: "ingredients",
    }[et]
    _validate_object_key_prefix(folder, body.object_key)

    old = crud_fa.get_by_storage_url(db, body.storage_url)
    if old:
        raise HTTPException(status_code=409, detail="This file is already registered")

    _replace_entity_attachments(db, et, body.entity_id, body.storage_url)

    row = crud_fa.create_attachment(
        db,
        storage_url=body.storage_url,
        object_key=body.object_key,
        entity_type=et,
        entity_id=body.entity_id,
        original_filename=body.original_filename,
        content_type=body.content_type,
        size_bytes=body.file_size,
        uploaded_by_user_id=current_user.id,
    )
    return row


@router.get("/attachments", response_model=List[FileAttachmentRead])
def list_attachments(
    entity_type: str = Query(..., pattern="^(user_avatar|cocktail|ingredient)$"),
    entity_id: int = Query(..., gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if entity_type == FileEntityType.USER_AVATAR.value:
        if entity_id != current_user.id:
            raise HTTPException(status_code=403, detail="Forbidden")
    elif current_user.role != UserRole.BARTENDER.value:
        raise HTTPException(status_code=403, detail="Forbidden")

    return crud_fa.list_by_entity(db, entity_type, entity_id)


@router.delete("/attachments/{attachment_id}")
def delete_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = crud_fa.get_by_id(db, attachment_id)
    if not row:
        raise HTTPException(status_code=404, detail="Attachment not found")

    if row.entity_type == FileEntityType.USER_AVATAR.value:
        if row.entity_id != current_user.id:
            raise HTTPException(status_code=403, detail="Forbidden")
        u = db.query(User).filter(User.id == row.entity_id).first()
        if u and u.avatar_url == row.storage_url:
            u.avatar_url = None
    elif current_user.role != UserRole.BARTENDER.value:
        raise HTTPException(status_code=403, detail="Forbidden")
    else:
        if row.entity_type == FileEntityType.COCKTAIL.value:
            c = db.query(Cocktail).filter(Cocktail.id == row.entity_id).first()
            if c and c.image_url == row.storage_url:
                c.image_url = None
        elif row.entity_type == FileEntityType.INGREDIENT.value:
            ing = db.query(Ingredient).filter(Ingredient.id == row.entity_id).first()
            if ing and ing.image_url == row.storage_url:
                ing.image_url = None

    st.delete_stored_file(row.storage_url, row.object_key)
    db.delete(row)
    db.commit()
    return {"message": "Attachment deleted", "id": attachment_id}


@router.delete("/object")
def delete_object_by_key(
    object_key: str = Query(..., min_length=3, max_length=512),
    current_user: User = Depends(get_current_user),
):
    if st.STORAGE_PROVIDER != "s3":
        raise HTTPException(status_code=400, detail="Object delete requires STORAGE_PROVIDER=s3")
    if current_user.role != UserRole.BARTENDER.value:
        raise HTTPException(status_code=403, detail="Only bartenders can delete by object key")
    s3 = st.get_s3_client()
    try:
        s3.delete_object(Bucket=st.S3_BUCKET, Key=object_key)
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete object: {e}")
    return {"message": "Object deleted", "object_key": object_key}
