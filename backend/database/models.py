import enum
from datetime import datetime

from sqlalchemy import ForeignKey, Enum, Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from typing import Optional, List
import bcrypt
from database.database import Base


class RecipeType(str, enum.Enum):
    IBA = "По версии IBA"
    USER = "Свой рецепт"


class UserRole(str, enum.Enum):
    BARTENDER = "бармен"
    AMATEUR = "любитель"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    role = Column(String, default=UserRole.AMATEUR.value, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    prepared_cocktails: Mapped[List["PreparedCocktail"]] = relationship(
        "PreparedCocktail",
        back_populates="user"
    )

    def verify_password(self, password: str) -> bool:
        return bcrypt.checkpw(password.encode('utf-8'), self.hashed_password.encode('utf-8'))

    @staticmethod
    def hash_password(password: str) -> str:
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


class Ingredient(Base):
    __tablename__ = "ingredients"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(unique=True, index=True)
    volume: Mapped[int] = mapped_column()
    image_url: Mapped[Optional[str]] = mapped_column(nullable=True)

    recipes: Mapped[List["RecipeIngredient"]] = relationship(
        "RecipeIngredient",
        back_populates="ingredient"
    )


class Cocktail(Base):
    __tablename__ = "cocktails"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(nullable=True)
    instructions: Mapped[Optional[str]] = mapped_column(nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(nullable=True)
    category: Mapped[Optional[str]] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    recipes: Mapped[List["Recipe"]] = relationship("Recipe", back_populates="cocktail")


class Recipe(Base):
    __tablename__ = "recipes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    # Используем Enum(RecipeType) для SQLAlchemy Enum
    type: Mapped[RecipeType] = mapped_column(Enum(RecipeType))
    description: Mapped[str] = mapped_column()
    is_completed: Mapped[bool] = mapped_column(default=False)
    cocktail_id: Mapped[int] = mapped_column(ForeignKey("cocktails.id"))

    cocktail: Mapped["Cocktail"] = relationship("Cocktail", back_populates="recipes")
    ingredients: Mapped[List["RecipeIngredient"]] = relationship(
        "RecipeIngredient",
        back_populates="recipe"
    )


class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"

    id: Mapped[int] = mapped_column(primary_key=True)
    recipe_id: Mapped[int] = mapped_column(ForeignKey("recipes.id"))
    ingredient_id: Mapped[int] = mapped_column(ForeignKey("ingredients.id"))
    volume_ml: Mapped[int] = mapped_column()

    recipe: Mapped["Recipe"] = relationship("Recipe", back_populates="ingredients")
    ingredient: Mapped["Ingredient"] = relationship("Ingredient", back_populates="recipes")


class PreparedCocktail(Base):
    __tablename__ = "prepared_cocktails"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    cocktail_id: Mapped[int] = mapped_column(ForeignKey("cocktails.id"))
    prepared_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="prepared_cocktails")
    cocktail: Mapped["Cocktail"] = relationship("Cocktail")
