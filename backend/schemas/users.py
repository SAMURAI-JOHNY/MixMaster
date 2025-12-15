from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from database.models import UserRole

class UserBase(BaseModel):
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: Optional[str] = UserRole.AMATEUR.value
    
    @field_validator('role')
    @classmethod
    def validate_role(cls, v):
        if v is not None and v not in [UserRole.BARTENDER.value, UserRole.AMATEUR.value]:
            raise ValueError(f'Role must be either "{UserRole.BARTENDER.value}" or "{UserRole.AMATEUR.value}"')
        return v or UserRole.AMATEUR.value

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserChangePassword(BaseModel):
    current_password: str
    new_password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class User(UserBase):
    id: int
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None