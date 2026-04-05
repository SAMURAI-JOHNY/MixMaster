from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime


class CocktailCreate(BaseModel):
    name: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    image_url: Optional[str] = None
    category: Optional[str] = None


class CocktailUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    image_url: Optional[str] = None
    category: Optional[str] = None


class CocktailBase(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CocktailWithRecipeCount(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    recipe_count: int

    class Config:
        from_attributes = True


class CocktailWithRecipes(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    created_at: datetime
    recipes: List[dict]

    class Config:
        from_attributes = True


class CocktailSearch(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    min_recipes: Optional[int] = None
    max_recipes: Optional[int] = None


class CocktailStats(BaseModel):
    total_cocktails: int
    total_with_recipes: int
    total_without_recipes: int
    by_category: dict


class CocktailQueryParams(BaseModel):
    q: Optional[str] = None
    category: Optional[str] = None
    has_recipes: Optional[bool] = None
    sort_by: Literal["name", "created_at", "category"] = "name"
    sort_order: Literal["asc", "desc"] = "asc"
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=12, ge=1, le=100)


class CocktailQueryResponse(BaseModel):
    items: List[CocktailBase]
    total: int
    page: int
    limit: int
    pages: int