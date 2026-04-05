from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc
from typing import List, Optional
from datetime import datetime

from database.models import Cocktail, Recipe
from schemas.cocktails import CocktailCreate, CocktailUpdate


def get_cocktail(db: Session, cocktail_id: int):
    return db.query(Cocktail).filter(Cocktail.id == cocktail_id).first()


def get_cocktail_by_name(db: Session, name: str):
    return db.query(Cocktail).filter(Cocktail.name == name).first()


def get_cocktails(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Cocktail).offset(skip).limit(limit).all()


def query_cocktails(
    db: Session,
    q: Optional[str] = None,
    category: Optional[str] = None,
    has_recipes: Optional[bool] = None,
    sort_by: str = "name",
    sort_order: str = "asc",
    page: int = 1,
    limit: int = 12,
):
    query = db.query(Cocktail)

    if q:
        query = query.filter(Cocktail.name.ilike(f"%{q}%"))
    if category:
        query = query.filter(Cocktail.category == category)
    if has_recipes is True:
        query = query.filter(Cocktail.recipes.any())
    elif has_recipes is False:
        query = query.filter(~Cocktail.recipes.any())

    total = query.count()

    sort_column = {
        "name": Cocktail.name,
        "created_at": Cocktail.created_at,
        "category": Cocktail.category,
    }.get(sort_by, Cocktail.name)

    order_fn = desc if sort_order == "desc" else asc
    items = (
        query.order_by(order_fn(sort_column), Cocktail.id.asc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return items, total


def create_cocktail(db: Session, cocktail: CocktailCreate):
    db_cocktail = Cocktail(
        name=cocktail.name,
        description=cocktail.description,
        instructions=cocktail.instructions,
        image_url=cocktail.image_url,
        category=cocktail.category,
        created_at=datetime.utcnow()
    )
    db.add(db_cocktail)
    db.commit()
    db.refresh(db_cocktail)
    return db_cocktail


def update_cocktail(db: Session, cocktail_id: int, cocktail_update: CocktailUpdate):
    db_cocktail = db.query(Cocktail).filter(Cocktail.id == cocktail_id).first()
    if not db_cocktail:
        return None

    update_data = cocktail_update.dict(exclude_unset=True)
    old_image = db_cocktail.image_url

    for field, value in update_data.items():
        setattr(db_cocktail, field, value)

    if "image_url" in update_data and old_image and old_image != db_cocktail.image_url:
        from crud.file_attachments import purge_storage_url

        purge_storage_url(db, old_image)

    db.commit()
    db.refresh(db_cocktail)
    return db_cocktail


def delete_cocktail(db: Session, cocktail_id: int, cascade: bool = True):
    """Удалить коктейль
    
    Args:
        db: Сессия базы данных
        cocktail_id: ID коктейля
        cascade: Если True, удаляет связанные рецепты. Если False, запрещает удаление при наличии рецептов.
    
    Returns:
        True если удалено успешно
        False если коктейль не найден
        None если есть рецепты и cascade=False
    """
    db_cocktail = db.query(Cocktail).filter(Cocktail.id == cocktail_id).first()
    if not db_cocktail:
        return False

    from crud.file_attachments import purge_all_for_entity
    from database.models import FileEntityType

    purge_all_for_entity(
        db,
        FileEntityType.COCKTAIL.value,
        cocktail_id,
        db_cocktail.image_url,
    )

    # Проверяем, есть ли связанные рецепты
    recipes = db.query(Recipe).filter(Recipe.cocktail_id == cocktail_id).all()
    if recipes:
        if cascade:
            # Удаляем все связанные ингредиенты рецептов
            from database.models import RecipeIngredient
            for recipe in recipes:
                db.query(RecipeIngredient).filter(RecipeIngredient.recipe_id == recipe.id).delete()
            # Удаляем все связанные рецепты
            db.query(Recipe).filter(Recipe.cocktail_id == cocktail_id).delete()
        else:
            # Запрещаем удаление
            return None

    db.delete(db_cocktail)
    db.commit()
    return True


def search_cocktails(db: Session, search_params: dict, skip: int = 0, limit: int = 100):
    query = db.query(Cocktail)

    if search_params.get('name'):
        query = query.filter(Cocktail.name.ilike(f"%{search_params['name']}%"))

    if search_params.get('category'):
        query = query.filter(Cocktail.category == search_params['category'])

    return query.offset(skip).limit(limit).all()


def get_cocktails_with_recipe_count(db: Session, skip: int = 0, limit: int = 100):
    """Получить коктейли с количеством рецептов"""
    from sqlalchemy.orm import aliased

    # Подзапрос для подсчета рецептов
    recipe_count = db.query(
        Recipe.cocktail_id,
        func.count(Recipe.id).label('recipe_count')
    ).group_by(Recipe.cocktail_id).subquery()

    query = db.query(
        Cocktail,
        func.coalesce(recipe_count.c.recipe_count, 0).label('recipe_count')
    ).outerjoin(
        recipe_count, Cocktail.id == recipe_count.c.cocktail_id
    ).order_by(
        desc(func.coalesce(recipe_count.c.recipe_count, 0)),
        Cocktail.name
    )

    return query.offset(skip).limit(limit).all()


def get_popular_cocktails(db: Session, limit: int = 10):
    """Получить самые популярные коктейли (по количеству рецептов)"""
    recipe_count = db.query(
        Recipe.cocktail_id,
        func.count(Recipe.id).label('recipe_count')
    ).group_by(Recipe.cocktail_id).subquery()

    return db.query(
        Cocktail,
        func.coalesce(recipe_count.c.recipe_count, 0).label('recipe_count')
    ).outerjoin(
        recipe_count, Cocktail.id == recipe_count.c.cocktail_id
    ).order_by(
        desc(func.coalesce(recipe_count.c.recipe_count, 0))
    ).limit(limit).all()


def get_cocktail_with_recipes(db: Session, cocktail_id: int):
    """Получить коктейль со всеми рецептами"""
    cocktail = db.query(Cocktail).filter(Cocktail.id == cocktail_id).first()
    if cocktail:
        # Явно загружаем рецепты
        recipes = db.query(Recipe).filter(Recipe.cocktail_id == cocktail_id).all()
        return cocktail, recipes
    return None, []


def get_cocktails_by_category(db: Session, category: str):
    return db.query(Cocktail).filter(Cocktail.category == category).all()


def bulk_create_cocktails(db: Session, cocktails: List[CocktailCreate]):
    db_cocktails = []
    for cocktail in cocktails:
        db_cocktail = Cocktail(
            name=cocktail.name,
            description=cocktail.description,
            instructions=cocktail.instructions,
            image_url=cocktail.image_url,
            category=cocktail.category,
            created_at=datetime.utcnow()
        )
        db.add(db_cocktail)
        db_cocktails.append(db_cocktail)

    db.commit()

    # Обновляем ID для всех созданных объектов
    for cocktail in db_cocktails:
        db.refresh(cocktail)

    return db_cocktails


def get_cocktail_stats(db: Session):
    from sqlalchemy import case

    # Общее количество коктейлей
    total_cocktails = db.query(func.count(Cocktail.id)).scalar()

    # Подзапрос для подсчета рецептов
    recipe_count = db.query(
        Recipe.cocktail_id,
        func.count(Recipe.id).label('recipe_count')
    ).group_by(Recipe.cocktail_id).subquery()

    # Коктейли с рецептами
    total_with_recipes = db.query(
        func.count(Cocktail.id)
    ).join(
        recipe_count, Cocktail.id == recipe_count.c.cocktail_id
    ).filter(
        recipe_count.c.recipe_count > 0
    ).scalar()

    # Коктейли без рецептов
    total_without_recipes = total_cocktails - total_with_recipes

    # Статистика по категориям
    categories_query = db.query(
        Cocktail.category,
        func.count(Cocktail.id).label('count')
    ).group_by(Cocktail.category).all()

    by_category = {cat: count for cat, count in categories_query if cat}

    return {
        'total_cocktails': total_cocktails,
        'total_with_recipes': total_with_recipes or 0,
        'total_without_recipes': total_without_recipes,
        'by_category': by_category
    }


def get_cocktails_without_recipes(db: Session, skip: int = 0, limit: int = 100):
    # Используем подзапрос для коктейлей с рецептами
    cocktails_with_recipes = db.query(Recipe.cocktail_id).distinct().subquery()

    query = db.query(Cocktail).filter(
        ~Cocktail.id.in_(db.query(cocktails_with_recipes.c.cocktail_id))
    )

    return query.offset(skip).limit(limit).all()


def update_cocktail_category(db: Session, cocktail_id: int, category: str):
    """Обновить категорию коктейля"""
    db_cocktail = db.query(Cocktail).filter(Cocktail.id == cocktail_id).first()
    if not db_cocktail:
        return None

    db_cocktail.category = category
    db.commit()
    db.refresh(db_cocktail)
    return db_cocktail


def get_cocktail_categories(db: Session):
    """Получить список уникальных категорий"""
    categories = db.query(Cocktail.category).distinct().all()
    return [cat[0] for cat in categories if cat[0]]