from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from database.database import get_db
from crud import cocktails as crud_cocktail
from schemas.cocktails import (
    CocktailCreate, CocktailUpdate, CocktailBase,
    CocktailWithRecipeCount, CocktailWithRecipes, CocktailStats
)
from api.routers.auth import get_bartender_user

router = APIRouter(prefix="/cocktails", tags=["cocktails"])


@router.post("/", response_model=CocktailBase)
def create_cocktail(
        cocktail: CocktailCreate,
        db: Session = Depends(get_db)
):
    existing = crud_cocktail.get_cocktail_by_name(db, cocktail.name)
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Cocktail with name '{cocktail.name}' already exists"
        )

    return crud_cocktail.create_cocktail(db, cocktail)


@router.get("/", response_model=List[CocktailBase])
def get_cocktails(
        skip: int = 0,
        limit: int = 100,
        db: Session = Depends(get_db)
):
    return crud_cocktail.get_cocktails(db, skip=skip, limit=limit)


@router.get("/with-recipes/", response_model=List[CocktailWithRecipeCount])
def get_cocktails_with_recipe_count(
        skip: int = 0,
        limit: int = 100,
        db: Session = Depends(get_db)
):
    return crud_cocktail.get_cocktails_with_recipe_count(db, skip=skip, limit=limit)


@router.get("/popular/", response_model=List[CocktailWithRecipeCount])
def get_popular_cocktails(
        limit: int = 10,
        db: Session = Depends(get_db)
):
    return crud_cocktail.get_popular_cocktails(db, limit=limit)


@router.get("/{cocktail_id}", response_model=CocktailWithRecipes)
def get_cocktail(
        cocktail_id: int,
        db: Session = Depends(get_db)
):
    cocktail, recipes = crud_cocktail.get_cocktail_with_recipes(db, cocktail_id)
    if not cocktail:
        raise HTTPException(status_code=404, detail="Cocktail not found")

    # Преобразуем для ответа (Pydantic v2 использует model_validate вместо from_orm)
    # Создаем словарь из объекта cocktail, исключая recipes, чтобы избежать конфликта
    cocktail_dict = {
        "id": cocktail.id,
        "name": cocktail.name,
        "description": cocktail.description,
        "instructions": cocktail.instructions,
        "image_url": cocktail.image_url,
        "category": cocktail.category,
        "created_at": cocktail.created_at,
        "recipes": [{"id": r.id, "description": r.description} for r in recipes]
    }
    result = CocktailWithRecipes.model_validate(cocktail_dict)
    return result


@router.put("/{cocktail_id}", response_model=CocktailBase)
def update_cocktail(
        cocktail_id: int,
        cocktail_update: CocktailUpdate,
        db: Session = Depends(get_db),
        current_user = Depends(get_bartender_user)
):
    cocktail = crud_cocktail.update_cocktail(db, cocktail_id, cocktail_update)
    if not cocktail:
        raise HTTPException(status_code=404, detail="Cocktail not found")
    return cocktail


@router.delete("/{cocktail_id}")
def delete_cocktail(
        cocktail_id: int,
        db: Session = Depends(get_db),
        current_user = Depends(get_bartender_user)
):
    # Удаляем коктейль с каскадным удалением рецептов
    result = crud_cocktail.delete_cocktail(db, cocktail_id, cascade=True)
    if not result:
        raise HTTPException(status_code=404, detail="Cocktail not found")

    return {"message": "Cocktail deleted successfully"}


@router.get("/search/", response_model=List[CocktailBase])
def search_cocktails(
        name: Optional[str] = None,
        category: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
        db: Session = Depends(get_db)
):
    search_params = {
        'name': name,
        'category': category
    }
    return crud_cocktail.search_cocktails(db, search_params, skip=skip, limit=limit)


@router.get("/category/{category}", response_model=List[CocktailBase])
def get_cocktails_by_category(
        category: str,
        db: Session = Depends(get_db)
):
    return crud_cocktail.get_cocktails_by_category(db, category)


@router.get("/without-recipes/", response_model=List[CocktailBase])
def get_cocktails_without_recipes(
        skip: int = 0,
        limit: int = 100,
        db: Session = Depends(get_db)
):
    return crud_cocktail.get_cocktails_without_recipes(db, skip=skip, limit=limit)


@router.post("/bulk/", response_model=List[CocktailBase])
def bulk_create_cocktails(
        cocktails: List[CocktailCreate],
        db: Session = Depends(get_db)
):
    return crud_cocktail.bulk_create_cocktails(db, cocktails)


@router.get("/stats/", response_model=CocktailStats)
def get_cocktail_stats(db: Session = Depends(get_db)):
    stats = crud_cocktail.get_cocktail_stats(db)
    return CocktailStats(**stats)


@router.get("/categories/list/")
def get_cocktail_categories(db: Session = Depends(get_db)):
    categories = crud_cocktail.get_cocktail_categories(db)
    return {"categories": categories}


@router.put("/{cocktail_id}/category")
def update_cocktail_category(
        cocktail_id: int,
        category: str = Query(..., description="New category"),
        db: Session = Depends(get_db)
):
    cocktail = crud_cocktail.update_cocktail_category(db, cocktail_id, category)
    if not cocktail:
        raise HTTPException(status_code=404, detail="Cocktail not found")
    return cocktail