from typing import List, Optional
from datetime import date, datetime, timezone   
from app.db.models.experiment_model import Experiment
from sqlmodel import SQLModel, Field, Relationship
from app.db.session import get_session
from pydantic import EmailStr

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    email: str = Field(index=True, unique=True)
    full_name: str
    hashed_password: str
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    experiments: List["Experiment"] = Relationship(back_populates="owner")

class UserReceived(SQLModel):
    id: int
    username: str
    email: str
    full_name: str
    is_active: bool
    created_at: datetime

class UserRegister(SQLModel):
    username: str
    email: EmailStr
    full_name: str
    password: str