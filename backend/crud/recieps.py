from sqlalchemy.orm import Session, joinedload
from database.models import Recipe, RecipeIngredient

from schemas.recieps import RecipeCreate


def get_recipe(db: Session, recipe_id: int):
    return db.query(Recipe).options(joinedload(Recipe.ingredients).joinedload(RecipeIngredient.ingredient)).filter(Recipe.id == recipe_id).first()


def get_recipes_by_cocktail(db: Session, cocktail_id: int):
    return db.query(Recipe).options(joinedload(Recipe.ingredients).joinedload(RecipeIngredient.ingredient)).filter(Recipe.cocktail_id == cocktail_id).all()


def create_recipe_with_ingredients_simple(db: Session, recipe_data: RecipeCreate):
    from database.models import RecipeType
    
    # Проверяем, что для типа "Свой рецепт" может быть только один рецепт на коктейль
    if recipe_data.type.value == "Свой рецепт":
        existing = db.query(Recipe).filter(
            Recipe.cocktail_id == recipe_data.cocktail_id,
            Recipe.type == RecipeType.USER
        ).first()
        if existing:
            raise ValueError("Для этого коктейля уже существует рецепт типа 'Свой рецепт'. Может быть только один такой рецепт.")
    
    # Создаем связи RecipeIngredient заранее
    recipe_ingredients = [
        RecipeIngredient(
            ingredient_id=ing.ingredient_id,
            volume_ml=ing.volume_ml
        )
        for ing in recipe_data.ingredients
    ]

    recipe = Recipe(
        type=recipe_data.type,
        description=recipe_data.description,
        cocktail_id=recipe_data.cocktail_id,
        ingredients=recipe_ingredients
    )

    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    return recipe


def add_ingredient_to_recipe(db: Session, ingredient_recipe):
    db_ingredient_recipe = RecipeIngredient(**ingredient_recipe.dict())
    db.add(db_ingredient_recipe)
    db.commit()
    db.refresh(db_ingredient_recipe)
    return db_ingredient_recipe


def complete_recipe(db: Session, recipe_id: int):
    db_recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if db_recipe:
        db_recipe.is_completed = True
        db.commit()
        db.refresh(db_recipe)
    return db_recipe


def update_recipe(db: Session, recipe_id: int, recipe_update):
    from database.models import RecipeType
    
    db_recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not db_recipe:
        return None
    
    # Получаем текущий тип как строку (может быть enum объектом)
    current_type_value = db_recipe.type.value if hasattr(db_recipe.type, 'value') else str(db_recipe.type)
    
    # Получаем новый тип, если он указан
    new_type_value = None
    if recipe_update.type:
        if hasattr(recipe_update.type, 'value'):
            new_type_value = recipe_update.type.value
        else:
            new_type_value = str(recipe_update.type)
    
    # Проверяем, что для типа "Свой рецепт" может быть только один рецепт на коктейль
    # Проверка нужна только если тип меняется на "Свой рецепт" (и текущий тип не "Свой рецепт")
    # Если текущий рецепт уже "Свой рецепт" и мы обновляем его без изменения типа, проверка не нужна
    if new_type_value and new_type_value == "Свой рецепт" and current_type_value != "Свой рецепт":
        # Тип меняется на "Свой рецепт", проверяем уникальность
        existing = db.query(Recipe).filter(
            Recipe.cocktail_id == db_recipe.cocktail_id,
            Recipe.type == RecipeType.USER,
            Recipe.id != recipe_id
        ).first()
        if existing:
            raise ValueError("Для этого коктейля уже существует рецепт типа 'Свой рецепт'. Может быть только один такой рецепт.")
    
    update_data = recipe_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        # Если это поле type, преобразуем в правильный enum
        if field == 'type':
            if isinstance(value, str):
                # Если строка, преобразуем в enum
                if value == "Свой рецепт":
                    setattr(db_recipe, field, RecipeType.USER)
                elif value == "По версии IBA":
                    setattr(db_recipe, field, RecipeType.IBA)
                else:
                    # Пытаемся найти соответствующий enum
                    try:
                        setattr(db_recipe, field, RecipeType(value))
                    except ValueError:
                        setattr(db_recipe, field, value)
            elif hasattr(value, 'value'):
                # Если enum объект, используем его напрямую
                setattr(db_recipe, field, value)
            else:
                setattr(db_recipe, field, value)
        else:
            setattr(db_recipe, field, value)
    
    db.commit()
    db.refresh(db_recipe)
    return db_recipe


def delete_recipe(db: Session, recipe_id: int):
    db_recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not db_recipe:
        return False
    
    # Удаляем связанные ингредиенты
    db.query(RecipeIngredient).filter(RecipeIngredient.recipe_id == recipe_id).delete()
    
    # Удаляем рецепт
    db.delete(db_recipe)
    db.commit()
    return True


def remove_ingredient_from_recipe(db: Session, recipe_id: int, ingredient_id: int):
    """Удалить ингредиент из рецепта"""
    db_recipe_ingredient = db.query(RecipeIngredient).filter(
        RecipeIngredient.recipe_id == recipe_id,
        RecipeIngredient.ingredient_id == ingredient_id
    ).first()
    
    if not db_recipe_ingredient:
        return False
    
    db.delete(db_recipe_ingredient)
    db.commit()
    return True


def update_recipe_ingredients(db: Session, recipe_id: int, ingredients: list):
    """Обновить все ингредиенты рецепта (удалить старые и добавить новые)"""
    # Проверяем существование рецепта
    db_recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not db_recipe:
        return None
    
    # Удаляем все старые ингредиенты
    db.query(RecipeIngredient).filter(RecipeIngredient.recipe_id == recipe_id).delete()
    
    # Добавляем новые ингредиенты
    for ing_data in ingredients:
        recipe_ingredient = RecipeIngredient(
            recipe_id=recipe_id,
            ingredient_id=ing_data.get('ingredient_id'),
            volume_ml=ing_data.get('volume_ml')
        )
        db.add(recipe_ingredient)
    
    db.commit()
    db.refresh(db_recipe)
    return db_recipe
