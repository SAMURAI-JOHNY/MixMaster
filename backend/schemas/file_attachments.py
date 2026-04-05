from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

EntityTypeLiteral = Literal["user_avatar", "cocktail", "ingredient"]


class FileAttachmentCreate(BaseModel):
    storage_url: str = Field(min_length=8, max_length=1024)
    object_key: Optional[str] = Field(default=None, max_length=512)
    entity_type: EntityTypeLiteral
    entity_id: int = Field(gt=0)
    original_filename: Optional[str] = Field(default=None, max_length=255)
    content_type: Optional[str] = Field(default=None, max_length=100)
    file_size: Optional[int] = Field(default=None, gt=0)


class FileAttachmentRead(BaseModel):
    id: int
    object_key: Optional[str]
    storage_url: str
    entity_type: str
    entity_id: int
    original_filename: Optional[str]
    content_type: Optional[str]
    size_bytes: Optional[int]
    uploaded_by_user_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class ViewUrlResponse(BaseModel):
    url: str
    expires_in: Optional[int] = None
    kind: Literal["presigned", "direct"] = "direct"
