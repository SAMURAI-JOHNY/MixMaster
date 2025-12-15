from enum import Enum
from pydantic import BaseModel
from typing import List, Optional


class RecipeType(str, Enum):
    IBA = "По версии IBA"
    USER = "Свой рецепт"
    # или если нужны другие варианты:
    # ALCOHOLIC = "alcoholic"
    # NON_ALCOHOLIC = "non_alcoholic"


class RecipeIngredientCreate(BaseModel):
    ingredient_id: int
    volume_ml: int


class RecipeCreate(BaseModel):
    type: RecipeType
    description: str
    cocktail_id: int
    ingredients: List[RecipeIngredientCreate]


class RecipeUpdate(BaseModel):
    type: Optional[RecipeType] = None
    description: Optional[str] = None
    is_completed: Optional[bool] = None


class RecipeIngredientResponse(BaseModel):
    id: int
    recipe_id: int
    ingredient_id: int
    volume_ml: int
    ingredient: Optional[dict] = None

    class Config:
        from_attributes = True


class RecipeResponse(BaseModel):
    id: int
    type: RecipeType
    description: str
    is_completed: bool
    cocktail_id: int
    ingredients: Optional[List[RecipeIngredientResponse]] = None

    class Config:
        from_attributes = True