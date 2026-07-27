from typing import List, Optional
from datetime import date, datetime, timezone   
from sqlmodel import SQLModel, Field, Relationship

class Experiment_status(str, Enum):
    DRAFT = "draft"
    RUNNING = "running"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"

class Experiment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    owner: int = Field(foreign_key="user.id")
    status: Experiment_status = Field(default=Experiment_status.DRAFT, index=True)
    hypothesis: str
    unit_of_randomization: str
    start_date: date
    end_date: date
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))