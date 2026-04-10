from sqlalchemy.orm import Session
from sqlalchemy import asc, desc
from database.models import Ingredient, RecipeIngredient
from typing import List, Optional

from schemas.ingredients import IngredientCreate, IngredientSearch, IngredientUpdate


def get_ingredient(db: Session, ingredient_id: int):
    return db.query(Ingredient).filter(Ingredient.id == ingredient_id).first()


def get_ingredient_by_name(db: Session, name: str):
    return db.query(Ingredient).filter(Ingredient.name == name).first()


def get_ingredients(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Ingredient).offset(skip).limit(limit).all()


def query_ingredients(
    db: Session,
    q: Optional[str] = None,
    min_volume: Optional[int] = None,
    max_volume: Optional[int] = None,
    sort_by: str = "name",
    sort_order: str = "asc",
    page: int = 1,
    limit: int = 20,
):
    query = db.query(Ingredient)

    if q:
        query = query.filter(Ingredient.name.ilike(f"%{q}%"))
    if min_volume is not None:
        query = query.filter(Ingredient.volume >= min_volume)
    if max_volume is not None:
        query = query.filter(Ingredient.volume <= max_volume)

    total = query.count()

    sort_column = {
        "name": Ingredient.name,
        "volume": Ingredient.volume,
    }.get(sort_by, Ingredient.name)
    order_fn = desc if sort_order == "desc" else asc

    items = (
        query.order_by(order_fn(sort_column), Ingredient.id.asc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return items, total


def create_ingredient(db: Session, ingredient: IngredientCreate):
    """Создать новый ингредиент"""
    db_ingredient = Ingredient(
        name=ingredient.name,
        volume=ingredient.volume,
        image_url=ingredient.image_url
    )
    db.add(db_ingredient)
    db.commit()
    db.refresh(db_ingredient)
    return db_ingredient


def update_ingredient(db: Session, ingredient_id: int, ingredient_update: IngredientUpdate):
    db_ingredient = db.query(Ingredient).filter(Ingredient.id == ingredient_id).first()
    if not db_ingredient:
        return None

    update_data = ingredient_update.dict(exclude_unset=True)
    old_image = db_ingredient.image_url

    # Проверяем уникальность названия, если оно изменяется
    if 'name' in update_data and update_data['name'] != db_ingredient.name:
        existing = db.query(Ingredient).filter(
            Ingredient.name == update_data['name'],
            Ingredient.id != ingredient_id
        ).first()
        if existing:
            raise ValueError(f"Ingredient with name '{update_data['name']}' already exists")

    for field, value in update_data.items():
        setattr(db_ingredient, field, value)

    if "image_url" in update_data and old_image and old_image != db_ingredient.image_url:
        from crud.file_attachments import purge_storage_url

        purge_storage_url(db, old_image)

    db.commit()
    db.refresh(db_ingredient)
    return db_ingredient


def delete_ingredient(db: Session, ingredient_id: int):
    db_ingredient = db.query(Ingredient).filter(Ingredient.id == ingredient_id).first()
    if not db_ingredient:
        return False

    used_in_recipes = db.query(RecipeIngredient).filter(
        RecipeIngredient.ingredient_id == ingredient_id
    ).first()

    if used_in_recipes:
        return None

    from crud.file_attachments import purge_all_for_entity
    from database.models import FileEntityType

    purge_all_for_entity(
        db,
        FileEntityType.INGREDIENT.value,
        ingredient_id,
        db_ingredient.image_url,
    )

    db.delete(db_ingredient)
    db.commit()
    return True


def search_ingredients(db: Session, search: IngredientSearch, skip: int = 0, limit: int = 100):
    query = db.query(Ingredient)

    if search.name:
        query = query.filter(Ingredient.name.ilike(f"%{search.name}%"))

    if search.min_volume is not None:
        query = query.filter(Ingredient.volume >= search.min_volume)

    if search.max_volume is not None:
        query = query.filter(Ingredient.volume <= search.max_volume)

    return query.offset(skip).limit(limit).all()


def get_ingredients_with_recipe_count(db: Session, skip: int = 0, limit: int = 100):
    """Получить ингредиенты с количеством рецептов, где они используются"""
    from sqlalchemy import func

    query = db.query(
        Ingredient,
        func.count(RecipeIngredient.id).label('recipe_count')
    ).outerjoin(
        RecipeIngredient, Ingredient.id == RecipeIngredient.ingredient_id
    ).group_by(Ingredient.id)

    return query.offset(skip).limit(limit).all()


def get_ingredients_by_ids(db: Session, ingredient_ids: List[int]):
    return db.query(Ingredient).filter(Ingredient.id.in_(ingredient_ids)).all()


def bulk_create_ingredients(db: Session, ingredients: List[IngredientCreate]):
    db_ingredients = []
    for ingredient in ingredients:
        db_ingredient = Ingredient(
            name=ingredient.name,
            volume=ingredient.volume
        )
        db.add(db_ingredient)
        db_ingredients.append(db_ingredient)

    db.commit()

    # Обновляем ID для всех созданных объектов
    for ingredient in db_ingredients:
        db.refresh(ingredient)

    return db_ingredients


def increase_ingredient_volume(db: Session, ingredient_id: int, amount: int):
    """Увеличить объем ингредиента на указанное количество"""
    db_ingredient = db.query(Ingredient).filter(Ingredient.id == ingredient_id).first()
    if not db_ingredient:
        return None

    db_ingredient.volume += amount
    db.commit()
    db.refresh(db_ingredient)
    return db_ingredient


def decrease_ingredient_volume(db: Session, ingredient_id: int, amount: int):
    db_ingredient = db.query(Ingredient).filter(Ingredient.id == ingredient_id).first()
    if not db_ingredient:
        return None

    if db_ingredient.volume < amount:
        return None

    db_ingredient.volume -= amount
    db.commit()
    db.refresh(db_ingredient)
    return db_ingredient


def get_popular_ingredients(db: Session, limit: int = 10):
    from sqlalchemy import func

    return db.query(
        Ingredient,
        func.count(RecipeIngredient.id).label('usage_count')
    ).join(
        RecipeIngredient, Ingredient.id == RecipeIngredient.ingredient_id
    ).group_by(
        Ingredient.id
    ).order_by(
        func.count(RecipeIngredient.id).desc()
    ).limit(limit).all()


def check_ingredient_availability(db: Session, ingredient_id: int, required_volume: int):
    ingredient = db.query(Ingredient).filter(Ingredient.id == ingredient_id).first()
    if not ingredient:
        return False

    return ingredient.volume >= required_volume