from sqlalchemy.orm import Session
from database.models import PreparedCocktail, Cocktail
from typing import List, Optional
from datetime import datetime


def create_prepared_cocktail(db: Session, user_id: int, cocktail_id: int):
    existing = db.query(PreparedCocktail).filter(
        PreparedCocktail.user_id == user_id,
        PreparedCocktail.cocktail_id == cocktail_id
    ).first()
    
    if existing:
        return existing
    
    prepared = PreparedCocktail(
        user_id=user_id,
        cocktail_id=cocktail_id,
        prepared_at=datetime.utcnow()
    )
    db.add(prepared)
    db.commit()
    db.refresh(prepared)
    return prepared


def get_user_prepared_cocktails(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(PreparedCocktail).filter(
        PreparedCocktail.user_id == user_id
    ).offset(skip).limit(limit).all()


def get_prepared_cocktails_with_cocktails(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    prepared = db.query(PreparedCocktail, Cocktail).join(
        Cocktail, PreparedCocktail.cocktail_id == Cocktail.id
    ).filter(
        PreparedCocktail.user_id == user_id
    ).offset(skip).limit(limit).all()
    
    result = []
    for prep, cocktail in prepared:
        result.append({
            "id": prep.id,
            "user_id": prep.user_id,
            "cocktail_id": prep.cocktail_id,
            "prepared_at": prep.prepared_at,
            "cocktail_name": cocktail.name,
            "cocktail_image_url": cocktail.image_url
        })
    
    return result


def is_cocktail_prepared(db: Session, user_id: int, cocktail_id: int) -> bool:
    prepared = db.query(PreparedCocktail).filter(
        PreparedCocktail.user_id == user_id,
        PreparedCocktail.cocktail_id == cocktail_id
    ).first()
    return prepared is not None

