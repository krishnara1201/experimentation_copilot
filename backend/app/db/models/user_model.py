from typing import List, Optional
from datetime import date, datetime, timezone   
from app.db.models.experiment_model import Experiment
from sqlmodel import SQLModel, Field, Relationship
from app.db.session import get_session

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    experiments: List["Experiment"] = Relationship(back_populates="owner")
    
class UserReceived(SQLModel):
    id: int
    username: str
    email: str
    is_active: bool
    created_at: datetime
