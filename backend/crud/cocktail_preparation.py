from sqlalchemy.orm import Session
from database.models import Recipe, RecipeIngredient, Ingredient
from typing import Dict, Optional
from crud import prepared_cocktails as crud_prepared


def check_ingredients_availability(
    db: Session, 
    recipe_id: int,
    user_id: Optional[int] = None,
    portions: int = 1
) -> Dict[str, any]:
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        return {
            "available": False,
            "missing_ingredients": [],
            "sufficient_ingredients": [],
            "error": "Recipe not found"
        }
    
    recipe_ingredients = db.query(RecipeIngredient).filter(
        RecipeIngredient.recipe_id == recipe_id
    ).all()
    
    missing = []
    sufficient = []
    
    for ri in recipe_ingredients:
        required_volume = ri.volume_ml * portions
        ingredient = db.query(Ingredient).filter(Ingredient.id == ri.ingredient_id).first()
        if not ingredient:
            missing.append({
                "ingredient_id": ri.ingredient_id,
                "ingredient_name": "Unknown",
                "required_volume": required_volume,
                "available_volume": 0
            })
        elif ingredient.volume < required_volume:
            missing.append({
                "ingredient_id": ingredient.id,
                "ingredient_name": ingredient.name,
                "required_volume": required_volume,
                "available_volume": ingredient.volume
            })
        else:
            sufficient.append({
                "ingredient_id": ingredient.id,
                "ingredient_name": ingredient.name,
                "required_volume": required_volume,
                "available_volume": ingredient.volume
            })
    
    return {
        "available": len(missing) == 0,
        "missing_ingredients": missing,
        "sufficient_ingredients": sufficient
    }


def prepare_cocktail_from_recipe(
    db: Session,
    user_id: int,
    recipe_id: int,
    portions: int = 1
) -> Dict[str, any]:
    availability = check_ingredients_availability(db, recipe_id, user_id, portions)
    
    if not availability["available"]:
        return {
            "success": False,
            "message": "Недостаточно ингредиентов для приготовления",
            "prepared_cocktail": None,
            "error": "insufficient_ingredients",
            "missing_ingredients": availability["missing_ingredients"]
        }

    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        return {
            "success": False,
            "message": "Рецепт не найден",
            "prepared_cocktail": None,
            "error": "recipe_not_found"
        }

    recipe_ingredients = db.query(RecipeIngredient).filter(
        RecipeIngredient.recipe_id == recipe_id
    ).all()

    for ri in recipe_ingredients:
        required_volume = ri.volume_ml * portions
        ingredient = db.query(Ingredient).filter(Ingredient.id == ri.ingredient_id).first()
        if not ingredient:
            db.rollback()
            return {
                "success": False,
                "message": f"Ингредиент с ID {ri.ingredient_id} не найден",
                "prepared_cocktail": None,
                "error": "ingredient_not_found"
            }
        if ingredient.volume < required_volume:
            db.rollback()
            return {
                "success": False,
                "message": f"Недостаточно ингредиента {ingredient.name}: требуется {required_volume}мл (для {portions} {'батча' if portions == 1 else 'батчей'}), доступно {ingredient.volume}мл",
                "prepared_cocktail": None,
                "error": "insufficient_ingredients"
            }

    for ri in recipe_ingredients:
        required_volume = ri.volume_ml * portions
        ingredient = db.query(Ingredient).filter(Ingredient.id == ri.ingredient_id).first()
        if ingredient:
            ingredient.volume -= required_volume
            if ingredient.volume < 0:
                ingredient.volume = 0

    prepared = crud_prepared.create_prepared_cocktail(db, user_id, recipe.cocktail_id)
    
    db.commit()
    
    return {
        "success": True,
        "message": "Коктейль успешно приготовлен",
        "prepared_cocktail": prepared,
        "error": None
    }

