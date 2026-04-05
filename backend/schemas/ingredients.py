from pydantic import BaseModel, Field
from typing import Optional, List, Literal


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


class IngredientQueryParams(BaseModel):
    q: Optional[str] = None
    min_volume: Optional[int] = Field(default=None, ge=0)
    max_volume: Optional[int] = Field(default=None, ge=0)
    sort_by: Literal["name", "volume"] = "name"
    sort_order: Literal["asc", "desc"] = "asc"
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)


class IngredientQueryResponse(BaseModel):
    items: List[IngredientResponse]
    total: int
    page: int
    limit: int
    pages: int