from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from database.database import get_db
from schemas.users import (
    UserCreate,
    UserLogin,
    Token,
    UserChangePassword,
    User,
    UserUpdate,
    RefreshRequest,
)
from crud import users as crud_user
from crud.users import (
    authenticate_user,
    create_access_token,
    verify_token,
    create_refresh_token_string,
    hash_refresh_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
)
from database.models import UserRole
from database.models import RefreshToken

router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


# Зависимость для получения текущего пользователя
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials
    username = verify_token(token)
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = crud_user.get_user_by_username(db, username=username)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def get_bartender_user(
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.BARTENDER.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only bartenders can perform this action"
        )
    return current_user

@router.post("/register", response_model=User)
def register(user: UserCreate, db: Session = Depends(get_db)):
    return crud_user.create_user(db=db, user=user)

@router.post("/login", response_model=Token)
def login(form_data: UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires,
    )

    refresh_token = create_refresh_token_string()
    refresh_token_hash = hash_refresh_token(refresh_token)
    refresh_expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=refresh_token_hash,
            expires_at=refresh_expires_at,
        )
    )
    db.commit()
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.get("/verify")
def verify(current_user: User = Depends(get_current_user)):
    # Используется фронтом для проверки актуальности access token.
    return {"valid": True, "username": current_user.username, "role": current_user.role}


@router.post("/refresh", response_model=Token)
def refresh_tokens(refresh_request: RefreshRequest, db: Session = Depends(get_db)):
    refresh_token_hash = hash_refresh_token(refresh_request.refresh_token)

    rt = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token_hash == refresh_token_hash,
            RefreshToken.revoked.is_(False),
            RefreshToken.expires_at > datetime.utcnow(),
        )
        .first()
    )

    if rt is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = crud_user.get_user_by_username(db, username=rt.user.username)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires,
    )

    # Rotation refresh token: старый ревокаем, новый создаём.
    rt.revoked = True
    rt.revoked_at = datetime.utcnow()
    db.add(rt)
    db.commit()

    new_refresh_token = create_refresh_token_string()
    new_refresh_token_hash = hash_refresh_token(new_refresh_token)
    new_refresh_expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=new_refresh_token_hash,
            expires_at=new_refresh_expires_at,
        )
    )
    db.commit()
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
    }

@router.get("/me", response_model=User)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/change-password")
def change_password(
    passwords: UserChangePassword,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Проверяем текущий пароль
    if not current_user.verify_password(passwords.current_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Хэшируем новый пароль
    hashed_password = User.hash_password(passwords.new_password)
    current_user.hashed_password = hashed_password
    db.commit()
    
    return {"message": "Password updated successfully"}

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Ревокаем все активные refresh-токены пользователя.
    db.query(RefreshToken).filter(
        RefreshToken.user_id == current_user.id,
        RefreshToken.revoked.is_(False),
    ).update(
        {"revoked": True, "revoked_at": datetime.utcnow()},
        synchronize_session=False,
    )
    db.commit()
    return {"message": "Successfully logged out"}

@router.put("/me/avatar", response_model=User)
def update_avatar(
    avatar_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Обновить аватарку пользователя"""
    from crud.file_attachments import purge_storage_url

    old_url = current_user.avatar_url
    new_url = avatar_data.get("avatar_url")
    current_user.avatar_url = new_url
    db.commit()
    db.refresh(current_user)
    if old_url and old_url != new_url:
        purge_storage_url(db, old_url)
    return current_user

@router.put("/me", response_model=User)
def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Обновить профиль пользователя (username, role)"""
    try:
        updated_user = crud_user.update_user(db, current_user.id, user_update)
        if not updated_user:
            raise HTTPException(status_code=404, detail="User not found")
        return updated_user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    