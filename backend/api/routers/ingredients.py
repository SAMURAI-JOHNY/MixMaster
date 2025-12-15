from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from crud.ingredients import decrease_ingredient_volume, increase_ingredient_volume, get_popular_ingredients, \
    bulk_create_ingredients, search_ingredients, delete_ingredient, update_ingredient, get_ingredient, get_ingredients, \
    create_ingredient, get_ingredient_by_name
from database.database import get_db
from schemas.ingredients import IngredientWithRecipesResponse, IngredientCreate, IngredientResponse, \
    IngredientSearch, IngredientUpdate
from api.routers.auth import get_current_user
from database.models import User

router = APIRouter(prefix="/ingredients", tags=["ingredients"])


@router.post("/", response_model=IngredientResponse)
def create_ingredient_endpoint(
        ingredient: IngredientCreate,
        db: Session = Depends(get_db)
):
    existing = get_ingredient_by_name(db, ingredient.name)
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Ingredient with name '{ingredient.name}' already exists"
        )

    return create_ingredient(db, ingredient)


@router.get("/", response_model=List[IngredientResponse])
def get_ingredients_endpoint(
        skip: int = 0,
        limit: int = 100,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    return get_ingredients(db, skip=skip, limit=limit)


@router.get("/{ingredient_id}", response_model=IngredientResponse)
def get_ingredient_endpoint(
        ingredient_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    ingredient = get_ingredient(db, ingredient_id)
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    return ingredient


@router.put("/{ingredient_id}", response_model=IngredientResponse)
def update_ingredient_endpoint(
        ingredient_id: int,
        ingredient_update: IngredientUpdate,
        db: Session = Depends(get_db)
):
    try:
        ingredient = update_ingredient(db, ingredient_id, ingredient_update)
        if not ingredient:
            raise HTTPException(status_code=404, detail="Ingredient not found")
        return ingredient
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


@router.delete("/{ingredient_id}")
def delete_ingredient_endpoint(
        ingredient_id: int,
        db: Session = Depends(get_db)
):
    result = delete_ingredient(db, ingredient_id)
    if result is None:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete ingredient that is used in recipes"
        )
    elif not result:
        raise HTTPException(status_code=404, detail="Ingredient not found")

    return {"message": "Ingredient deleted successfully"}


@router.get("/search/", response_model=List[IngredientResponse])
def search_ingredients_endpoint(
        name: Optional[str] = None,
        min_volume: Optional[int] = None,
        max_volume: Optional[int] = None,
        skip: int = 0,
        limit: int = 100,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    search_params = IngredientSearch(
        name=name,
        min_volume=min_volume,
        max_volume=max_volume
    )
    return search_ingredients(db, search_params, skip=skip, limit=limit)


@router.post("/bulk/", response_model=List[IngredientResponse])
def bulk_create_ingredients_endpoint(
        ingredients: List[IngredientCreate],
        db: Session = Depends(get_db)
):
    return bulk_create_ingredients(db, ingredients)


@router.get("/popular/", response_model=List[IngredientWithRecipesResponse])
def get_popular_ingredients_endpoint(
        limit: int = 10,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    return get_popular_ingredients(db, limit=limit)


@router.post("/{ingredient_id}/increase")
def increase_ingredient_volume_endpoint(
        ingredient_id: int,
        amount: int = Query(..., gt=0, description="Amount to increase"),
        db: Session = Depends(get_db)
):
    ingredient = increase_ingredient_volume(db, ingredient_id, amount)
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    return ingredient


@router.post("/{ingredient_id}/decrease")
def decrease_ingredient_volume_endpoint(
    ingredient_id: int,
    amount: int = Query(..., gt=0, description="Amount to decrease"),
    db: Session = Depends(get_db)
):
    ingredient = decrease_ingredient_volume(db, ingredient_id, amount)
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found or insufficient volume")
    return ingredient