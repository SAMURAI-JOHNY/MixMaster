from pydantic import BaseModel
from typing import Optional, List


class IngredientCreate(BaseModel):
    name: str
    volume: int
    image_url: Optional[str] = None


# Для обновления ингредиента
class IngredientUpdate(BaseModel):
    name: Optional[str] = None
    volume: Optional[int] = None
    image_url: Optional[str] = None


# Для ответа с ингредиентом
class IngredientResponse(BaseModel):
    id: int
    name: str
    volume: int
    image_url: Optional[str] = None

    class Config:
        from_attributes = True


class IngredientWithRecipesResponse(BaseModel):
    id: int
    name: str
    volume: int
    recipe_count: int

    class Config:
        from_attributes = True


# Для поиска ингредиентов
class IngredientSearch(BaseModel):
    name: Optional[str] = None
    min_volume: Optional[int] = None
    max_volume: Optional[int] = None