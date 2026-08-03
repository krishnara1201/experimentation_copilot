from typing import List, Optional
from datetime import date, datetime, timezone   
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy.orm import relationship
from enum import Enum

class Summary(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    analysis_run_id: int = Field(foreign_key="analysis_run.id")
    summary_json: str = Field(default="{}")
    text_summary: Optional[str] = Field(default=None)