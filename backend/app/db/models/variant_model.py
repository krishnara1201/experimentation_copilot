from typing import List, Optional
from datetime import date, datetime, timezone   
from sqlmodel import SQLModel, Field
from enum import Enum
from app.db.models.experiment_model import Experiment

class Variant(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    experiment_id: int = Field(foreign_key="experiment.id")
    is_control: bool = Field(default=False)
    allocation_percentage: float = Field(default=0.0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))