from pydantic import BaseModel
from typing import Optional

# Pydantic models for task creation, update, and output
class TaskCreate(BaseModel):
    name: str
    duration_minutes: int
    priority: str = "medium"
    task_type: str = "flexible"
    fixed_time: Optional[str] = None

class TaskUpdate(BaseModel):
    is_completed: Optional[bool] = None
    is_missed: Optional[bool] = None

class TaskOut(TaskCreate):
    id: int
    is_completed: bool
    is_missed: bool
    miss_count: int
    complete_count: int

    class Config:
        from_attributes = True
