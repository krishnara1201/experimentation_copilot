from typing import List, Optional
from datetime import date, datetime, timezone   
from sqlmodel import SQLModel, Field, Relationship
from enum import Enum
from app.db.models.experiment_model import Experiment

class Metric_type(str, Enum):
    NUMERIC = "numeric"
    CATEGORICAL = "categorical"
    BOOLEAN = "boolean"
    CONTINUOUS = "continuous"
    ORDINAL = "ordinal"

class Metric_direction(str, Enum):
    UP = "up"
    DOWN = "down"
    NEUTRAL = "neutral"

class Metric(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    experiment_id: int = Field(foreign_key="experiment.id")
    direction: Metric_direction = Field(default=Metric_direction.UP, index=True)
    type: Metric_type = Field(default=Metric_type.NUMERIC, index=True)
    is_primary: bool = Field(default=False)
    is_guardrail: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))