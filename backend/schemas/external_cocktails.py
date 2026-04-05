from typing import List, Optional

from pydantic import BaseModel, Field


class ExternalCocktailItem(BaseModel):
    external_id: str
    name: str
    thumb_url: Optional[str] = None
    category: Optional[str] = None


class ExternalCocktailSearchResponse(BaseModel):
    items: List[ExternalCocktailItem] = Field(default_factory=list)
    degraded: bool = False
    message: Optional[str] = None
