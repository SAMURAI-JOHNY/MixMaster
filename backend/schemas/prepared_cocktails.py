from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class PreparedCocktailCreate(BaseModel):
    cocktail_id: int


class CheckIngredientsRequest(BaseModel):
    portions: int = 1


class PrepareCocktailRequest(BaseModel):
    portions: int = 1


class PreparedCocktailResponse(BaseModel):
    id: int
    user_id: int
    cocktail_id: int
    prepared_at: datetime

    class Config:
        from_attributes = True


class PreparedCocktailWithCocktail(PreparedCocktailResponse):
    cocktail_name: Optional[str] = None
    cocktail_image_url: Optional[str] = None

