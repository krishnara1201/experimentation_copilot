from typing import List, Optional
from datetime import date, datetime, timezone   
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy.orm import relationship
from enum import Enum

class Analysis_Run_Status(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class Analysis_Run(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    experiment_id: int = Field(foreign_key="experiment.id")
    status: Analysis_Run_Status = Field(default=Analysis_Run_Status.PENDING, index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    completed_at: Optional[datetime] = Field(default=None)
    error_message: Optional[str] = Field(default=None)

# class Analysis_Result(SQLModel, table=True):
#     id: Optional[int] = Field(default=None, primary_key=True)
#     analysis_run_id: int = Field(foreign_key="analysis_run.id")
#     metric_id: int = Field(foreign_key="metric.id")
#     variant_id: int = Field(foreign_key="variant.id")
#     uplift: float = Field(default=0.0)
#     p_value: float = Field(default=1.0)
#     ci_lower: float = Field(default=0.0)
#     ci_upper: float = Field(default=0.0)
#     decision: Optional[str] = Field(default=None)
#     created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))