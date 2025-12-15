from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List
from crud import recieps as crud_recipe, cocktails as crud_cocktail
from database.database import get_db
from schemas.recieps import RecipeCreate, RecipeResponse, RecipeUpdate
from api.routers.auth import get_bartender_user

router = APIRouter(prefix="/recipes", tags=["recipes"])


@router.post("/")
def create_recipe(
    recipe: RecipeCreate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_bartender_user)
):
    db_cocktail = crud_cocktail.get_cocktail(db, cocktail_id=recipe.cocktail_id)
    if not db_cocktail:
        raise HTTPException(status_code=404, detail="Cocktail not found")

    try:
        return crud_recipe.create_recipe_with_ingredients_simple(db=db, recipe_data=recipe)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{recipe_id}", response_model=RecipeResponse)
def get_recipe(recipe_id: int, db: Session = Depends(get_db)):
    recipe = crud_recipe.get_recipe(db, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    recipe_dict = {
        "id": recipe.id,
        "type": recipe.type,
        "description": recipe.description,
        "is_completed": recipe.is_completed,
        "cocktail_id": recipe.cocktail_id,
        "ingredients": []
    }
    if recipe.ingredients:
        recipe_dict["ingredients"] = [
            {
                "id": ri.id,
                "recipe_id": ri.recipe_id,
                "ingredient_id": ri.ingredient_id,
                "volume_ml": ri.volume_ml,
                "ingredient": {
                    "id": ri.ingredient.id,
                    "name": ri.ingredient.name,
                    "volume": ri.ingredient.volume,
                    "image_url": ri.ingredient.image_url
                } if ri.ingredient else None
            }
            for ri in recipe.ingredients
        ]
    return RecipeResponse.model_validate(recipe_dict)


@router.get("/cocktail/{cocktail_id}", response_model=List[RecipeResponse])
def read_recipes_by_cocktail(cocktail_id: int, db: Session = Depends(get_db)):
    recipes = crud_recipe.get_recipes_by_cocktail(db, cocktail_id=cocktail_id)
    # Преобразуем для Pydantic v2
    result = []
    for recipe in recipes:
        recipe_dict = {
            "id": recipe.id,
            "type": recipe.type,
            "description": recipe.description,
            "is_completed": recipe.is_completed,
            "cocktail_id": recipe.cocktail_id,
            "ingredients": []
        }
        if recipe.ingredients:
            recipe_dict["ingredients"] = [
                {
                    "id": ri.id,
                    "recipe_id": ri.recipe_id,
                    "ingredient_id": ri.ingredient_id,
                    "volume_ml": ri.volume_ml,
                    "ingredient": {
                        "id": ri.ingredient.id,
                        "name": ri.ingredient.name,
                        "volume": ri.ingredient.volume,
                        "image_url": ri.ingredient.image_url
                    } if ri.ingredient else None
                }
                for ri in recipe.ingredients
            ]
        result.append(RecipeResponse.model_validate(recipe_dict))
    return result


@router.post("/{recipe_id}/ingredients")
def add_ingredient_to_recipe(
        recipe_id: int,
        ingredient_recipe,
        db: Session = Depends(get_db),
        current_user = Depends(get_bartender_user)
):
    db_recipe = crud_recipe.get_recipe(db, recipe_id=recipe_id)
    if not db_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    ingredient_recipe.recipe_id = recipe_id

    return crud_recipe.add_ingredient_to_recipe(db=db, ingredient_recipe=ingredient_recipe)


@router.delete("/{recipe_id}/ingredients/{ingredient_id}")
def remove_ingredient_from_recipe(
        recipe_id: int,
        ingredient_id: int,
        db: Session = Depends(get_db),
        current_user = Depends(get_bartender_user)
):
    success = crud_recipe.remove_ingredient_from_recipe(db, recipe_id, ingredient_id)
    if not success:
        raise HTTPException(status_code=404, detail="Recipe ingredient not found")
    return {"message": "Ingredient removed from recipe"}


@router.put("/{recipe_id}/ingredients")
def update_recipe_ingredients(
        recipe_id: int,
        ingredients: List[dict] = Body(...),
        db: Session = Depends(get_db),
        current_user = Depends(get_bartender_user)
):
    """Обновить все ингредиенты рецепта (удалить старые и добавить новые)"""
    updated_recipe = crud_recipe.update_recipe_ingredients(db, recipe_id, ingredients)
    if not updated_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return {"message": "Recipe ingredients updated successfully"}


@router.patch("/{recipe_id}/complete")
def complete_recipe(recipe_id: int, db: Session = Depends(get_db)):
    db_recipe = crud_recipe.complete_recipe(db, recipe_id=recipe_id)
    if not db_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return {"message": "Recipe completed"}


@router.put("/{recipe_id}")
def update_recipe_endpoint(
    recipe_id: int,
    recipe_update: RecipeUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_bartender_user)
):
    try:
        updated_recipe = crud_recipe.update_recipe(db, recipe_id, recipe_update)
        if not updated_recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")
        return updated_recipe
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{recipe_id}")
def remove_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_bartender_user)
):
    success = crud_recipe.delete_recipe(db, recipe_id)
    if not success:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return {"message": "Recipe deleted successfully"}
