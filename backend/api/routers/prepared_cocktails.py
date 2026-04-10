from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database.database import get_db
from api.routers.auth import get_current_user
from database.models import User
from crud import prepared_cocktails as crud_prepared
from crud import cocktail_preparation as crud_prep
from schemas.prepared_cocktails import CheckIngredientsRequest, PrepareCocktailRequest

router = APIRouter(prefix="/prepared-cocktails", tags=["prepared-cocktails"])


@router.post("/check/{recipe_id}")
def check_ingredients_availability(
    recipe_id: int,
    request: CheckIngredientsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Проверить достаточность ингредиентов для рецепта"""
    result = crud_prep.check_ingredients_availability(db, recipe_id, current_user.id, request.portions)
    return result


@router.post("/prepare/{recipe_id}")
def prepare_cocktail(
    recipe_id: int,
    request: PrepareCocktailRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Приготовить коктейль из рецепта"""
    result = crud_prep.prepare_cocktail_from_recipe(db, current_user.id, recipe_id, request.portions)
    
    if not result["success"]:
        raise HTTPException(
            status_code=400,
            detail=result["message"],
            headers={"X-Error-Code": result.get("error", "unknown")}
        )
    
    return result


@router.get("/my", response_model=List[dict])
def get_my_prepared_cocktails(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить список приготовленных коктейлей текущего пользователя"""
    return crud_prepared.get_prepared_cocktails_with_cocktails(
        db, current_user.id, skip=skip, limit=limit
    )


@router.get("/check-prepared/{cocktail_id}")
def check_if_prepared(
    cocktail_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Проверить, был ли коктейль приготовлен пользователем"""
    is_prepared = crud_prepared.is_cocktail_prepared(db, current_user.id, cocktail_id)
    return {"is_prepared": is_prepared, "cocktail_id": cocktail_id}

