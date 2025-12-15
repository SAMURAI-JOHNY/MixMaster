from sqlalchemy.orm import Session
from database.models import User
from schemas.users import UserCreate
import bcrypt
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import HTTPException, status
from typing import Optional

SECRET_KEY = "your-secret-key-here-change-in-production"  # Измените на случайную строку
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def get_user(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(User).offset(skip).limit(limit).all()

def create_user(db: Session, user: UserCreate):
    # Проверяем, существует ли пользователь
    db_user = get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="Username already registered"
        )
    
    # Хэшируем пароль
    hashed_password = User.hash_password(user.password)
    
    db_user = User(
        username=user.username,
        hashed_password=hashed_password,
        full_name=user.full_name,
        avatar_url=user.avatar_url if hasattr(user, 'avatar_url') and user.avatar_url else None,
        role=user.role if hasattr(user, 'role') and user.role else "любитель"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, username: str, password: str):
    user = get_user_by_username(db, username)
    if not user:
        return False
    if not user.verify_password(password):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
        return username
    except JWTError:
        return None

def update_user(db: Session, user_id: int, user_update):
    """Обновить данные пользователя"""
    from schemas.users import UserUpdate
    db_user = get_user(db, user_id)
    if not db_user:
        return None
    
    update_data = user_update.dict(exclude_unset=True)
    
    # Проверяем уникальность username, если он меняется
    if 'username' in update_data and update_data['username'] != db_user.username:
        existing_user = get_user_by_username(db, username=update_data['username'])
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Username already exists"
            )
    
    for field, value in update_data.items():
        setattr(db_user, field, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user