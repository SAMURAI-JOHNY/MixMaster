from pydantic import BaseModel
from typing import List, Optional
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