from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from database.models import Cocktail, FileAttachment, Ingredient, User
from database.models import FileEntityType


def get_by_storage_url(db: Session, storage_url: str) -> Optional[FileAttachment]:
    return db.query(FileAttachment).filter(FileAttachment.storage_url == storage_url).first()


def get_by_id(db: Session, attachment_id: int) -> Optional[FileAttachment]:
    return db.query(FileAttachment).filter(FileAttachment.id == attachment_id).first()


def list_by_entity(db: Session, entity_type: str, entity_id: int) -> List[FileAttachment]:
    return (
        db.query(FileAttachment)
        .filter(
            FileAttachment.entity_type == entity_type,
            FileAttachment.entity_id == entity_id,
        )
        .order_by(FileAttachment.created_at.desc())
        .all()
    )


def create_attachment(
    db: Session,
    *,
    storage_url: str,
    object_key: Optional[str],
    entity_type: str,
    entity_id: int,
    original_filename: Optional[str],
    content_type: Optional[str],
    size_bytes: Optional[int],
    uploaded_by_user_id: Optional[int],
) -> FileAttachment:
    row = FileAttachment(
        storage_url=storage_url,
        object_key=object_key,
        entity_type=entity_type,
        entity_id=entity_id,
        original_filename=original_filename,
        content_type=content_type,
        size_bytes=size_bytes,
        uploaded_by_user_id=uploaded_by_user_id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def delete_attachment_row(db: Session, row: FileAttachment) -> None:
    db.delete(row)
    db.commit()


def storage_url_public_access(db: Session, storage_url: str) -> bool:
    if db.query(Cocktail).filter(Cocktail.image_url == storage_url).first():
        return True
    if db.query(Ingredient).filter(Ingredient.image_url == storage_url).first():
        return True
    return False


def storage_url_avatar_owner_id(db: Session, storage_url: str) -> Optional[int]:
    u = db.query(User).filter(User.avatar_url == storage_url).first()
    return u.id if u else None


def purge_storage_url(db: Session, storage_url: Optional[str]) -> None:
    if not storage_url:
        return
    from core import storage as st

    row = get_by_storage_url(db, storage_url)
    if row:
        st.delete_stored_file(row.storage_url, row.object_key)
        db.delete(row)
        db.commit()
    else:
        st.delete_stored_file(storage_url, st.object_key_from_storage_url(storage_url))


def purge_all_for_entity(
    db: Session,
    entity_type: str,
    entity_id: int,
    primary_storage_url: Optional[str],
) -> None:
    from core import storage as st

    rows = list_by_entity(db, entity_type, entity_id)
    seen_urls = set()
    for row in rows:
        if row.storage_url not in seen_urls:
            st.delete_stored_file(row.storage_url, row.object_key)
            seen_urls.add(row.storage_url)
        db.delete(row)
    if primary_storage_url and primary_storage_url not in seen_urls:
        st.delete_stored_file(
            primary_storage_url, st.object_key_from_storage_url(primary_storage_url)
        )
    db.commit()


def resolve_access_kind(
    db: Session, storage_url: str, current_user: Optional[User]
) -> Tuple[str, Optional[int]]:
    if storage_url_public_access(db, storage_url):
        return "public_entity", None
    owner_id = storage_url_avatar_owner_id(db, storage_url)
    if owner_id is not None:
        if current_user and current_user.id == owner_id:
            return "avatar", owner_id
        return "denied", owner_id
    att = get_by_storage_url(db, storage_url)
    if att:
        if att.entity_type == FileEntityType.USER_AVATAR.value:
            if current_user and current_user.id == att.entity_id:
                return "avatar", att.entity_id
            return "denied", att.entity_id
        if att.entity_type == FileEntityType.COCKTAIL.value:
            c = db.query(Cocktail).filter(Cocktail.id == att.entity_id).first()
            if c and c.image_url == storage_url:
                return "public_entity", None
            return "denied", None
        if att.entity_type == FileEntityType.INGREDIENT.value:
            ing = db.query(Ingredient).filter(Ingredient.id == att.entity_id).first()
            if ing and ing.image_url == storage_url:
                return "public_entity", None
            return "denied", None
    return "denied", None
