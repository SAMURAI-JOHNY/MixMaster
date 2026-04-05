from fastapi import APIRouter, Query

from schemas.external_cocktails import ExternalCocktailItem, ExternalCocktailSearchResponse
from services.cocktaildb_client import search_cocktails_by_name

router = APIRouter(prefix="/external/cocktails", tags=["external_cocktails"])


@router.get("/search-by-name", response_model=ExternalCocktailSearchResponse)
def search_external_by_name(
    name: str = Query(..., min_length=1, max_length=120, description="Название для поиска в TheCocktailDB"),
) -> ExternalCocktailSearchResponse:
    items_raw, err = search_cocktails_by_name(name)
    items = [ExternalCocktailItem.model_validate(x) for x in items_raw]
    return ExternalCocktailSearchResponse(
        items=items,
        degraded=err is not None,
        message=err,
    )
