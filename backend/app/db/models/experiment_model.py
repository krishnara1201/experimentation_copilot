from typing import List, Optional
from datetime import date, datetime, timezone   
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy.orm import relationship
from enum import Enum

class Experiment_status(str, Enum):
    DRAFT = "draft"
    RUNNING = "running"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"

class Experiment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    owner_id: int = Field(foreign_key="user.id")
    owner: "User" = Relationship(back_populates="experiments")
    status: Experiment_status = Field(default=Experiment_status.DRAFT, index=True)
    description: Optional[str] = Field(default=None)
    hypothesis: Optional [str] = Field(default=None)
    unit_of_randomization: Optional[str] = Field(default=None)
    start_date: Optional[date] = Field(default=None)
    end_date: Optional[date] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    metrics: List["Metric"] = Relationship(
        sa_relationship=relationship("Metric", cascade="all, delete-orphan")
    )
    variants: List["Variant"] = Relationship(
        sa_relationship=relationship("Variant", cascade="all, delete-orphan")
    )
    analysis_runs: List["Analysis_Run"] = Relationship(
        sa_relationship=relationship("Analysis_Run", cascade="all, delete-orphan")
    )