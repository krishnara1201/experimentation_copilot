from typing import List, Optional
from datetime import date, datetime, timezone   
from backend.app.db.models.experiments import Experiment
from sqlmodel import SQLModel, Field, Relationship
from session import get_session

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    experiments: List["Experiment"] = Relationship(back_populates="owner")
    
