from pydantic import BaseModel
from typing import Optional, List

# enabled — whether the task repeats at all
# days — list of day-of-week ints [0=Sun, 1=Mon ... 6=Sat]
# end_date — ISO string like "2026-05-01" — repeats stop after this date
class RepeatConfig(BaseModel):
    enabled:  bool = False
    days:     List[int] = []
    end_date: Optional[str] = None

# schema for CREATING a new task — what the frontend sends in the request body
class TaskCreate(BaseModel):
    title:      str
    color:      str   = "purple"
    start_h:    float = 9.0          # start hour as decimal e.g. 9.5 = 9:30am
    dur_h:      float = 1.0          # duration in hours e.g. 1.5 = 1h 30m
    day:        int   = 0            # days from today — 0=today, 1=tomorrow, 14=two weeks
    location:   Optional[str] = None
    description:Optional[str] = None
    priority:   str   = "medium"     # high / medium / low
    task_type:  str   = "flexible"   # fixed / flexible / free
    fixed_time: Optional[str] = None # only set for fixed tasks e.g. "09:00"
    repeat:     RepeatConfig = RepeatConfig()

# schema for UPDATING an existing task
# every field is optional — only fields sent get updated (PATCH behavior)
class TaskUpdate(BaseModel):
    title:       Optional[str]          = None
    color:       Optional[str]          = None
    start_h:     Optional[float]        = None
    dur_h:       Optional[float]        = None
    day:         Optional[int]          = None
    location:    Optional[str]          = None
    description: Optional[str]          = None
    priority:    Optional[str]          = None
    task_type:   Optional[str]          = None
    fixed_time:  Optional[str]          = None
    repeat:      Optional[RepeatConfig] = None
    is_completed:Optional[bool]         = None  # user marked task done
    is_missed:   Optional[bool]         = None  # user marked task missed

# schema for what gets sent BACK to the frontend after any task operation
# inherits nothing — explicitly lists every field so we control exactly what's returned
class TaskOut(BaseModel):
    id:            int
    title:         str
    color:         str
    start_h:       float
    dur_h:         float
    day:           int
    location:      Optional[str]
    description:   Optional[str]
    priority:      str
    task_type:     str
    fixed_time:    Optional[str]
    repeat:        RepeatConfig
    is_completed:  bool
    is_missed:     bool
    miss_count:    int
    complete_count:int

    class Config:
        # allows Pydantic to read data directly from SQLAlchemy model attributes
        from_attributes = True
