from pydantic import BaseModel
from typing import Optional, List

class RepeatConfig(BaseModel):
    enabled:  bool = False
    days:     List[int] = []
    end_date: Optional[str] = None  # ISO string e.g. "2026-05-01"

class TaskCreate(BaseModel):
    title:          str
    color:          str   = "purple"
    start_h:        float = 9.0
    dur_h:          float = 1.0
    day:            int   = 0
    location:       Optional[str] = None
    description:    Optional[str] = None
    priority:       str   = "medium"
    task_type:      str   = "flexible"
    fixed_time:     Optional[str] = None
    repeat:         RepeatConfig = RepeatConfig()
    repeat_group_id: Optional[str] = None

class TaskUpdate(BaseModel):
    title:          Optional[str]          = None
    color:          Optional[str]          = None
    start_h:        Optional[float]        = None
    dur_h:          Optional[float]        = None
    day:            Optional[int]          = None
    location:       Optional[str]          = None
    description:    Optional[str]          = None
    priority:       Optional[str]          = None
    task_type:      Optional[str]          = None
    fixed_time:     Optional[str]          = None
    repeat:         Optional[RepeatConfig] = None
    repeat_group_id: Optional[str]         = None
    is_completed:   Optional[bool]         = None
    is_missed:      Optional[bool]         = None

class TaskOut(BaseModel):
    id:              int
    title:           str
    color:           str
    start_h:         float
    dur_h:           float
    day:             int
    location:        Optional[str]
    description:     Optional[str]
    priority:        str
    task_type:       str
    fixed_time:      Optional[str]
    repeat:          RepeatConfig
    repeat_group_id: Optional[str]
    is_completed:    bool
    is_missed:       bool
    miss_count:      int
    complete_count:  int

    class Config:
        from_attributes = True

