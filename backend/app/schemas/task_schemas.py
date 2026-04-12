from pydantic import BaseModel
from typing import Optional, List


class RepeatConfig(BaseModel):
    enabled: bool = False       # whether repetition is turned on at all
    days: List[int] = []        # which days of the week it repeats on


class TaskCreate(BaseModel):
    title: str                          # the event name shown on the calendar block
    color: str = "purple"               # color theme id — matches EVENT_COLORS keys in the frontend
    start_h: float = 9.0               # start time as decimal hour — frontend calls this startH
    dur_h: float = 1.0                 # duration in hours — frontend calls this durH
    day: int = 0                        # which day: 0 = today, 1 = tomorrow
    location: Optional[str] = None      # optional venue or place string
    description: Optional[str] = None   # optional freeform notes
    priority: str = "medium"            # "high", "medium", or "low" — affects scheduling and badge
    task_type: str = "flexible"         # "fixed" (locked), "flexible" (AI can move), "free" (filler)
    fixed_time: Optional[str] = None    # only populated for fixed tasks, stored as "HH:MM" e.g. "09:00"
    repeat: RepeatConfig = RepeatConfig()  # defaults to disabled with no days selected


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    color: Optional[str] = None
    start_h: Optional[float] = None
    dur_h: Optional[float] = None
    day: Optional[int] = None
    location: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    task_type: Optional[str] = None
    fixed_time: Optional[str] = None
    repeat: Optional[RepeatConfig] = None
    is_completed: Optional[bool] = None  # set to True when user hits the ✅ button
    is_missed: Optional[bool] = None     # set to True when user hits the ❌ button


class TaskOut(BaseModel):
    id: int                         # database-assigned ID the frontend uses for PATCH/DELETE calls
    title: str
    color: str
    start_h: float
    dur_h: float
    day: int
    location: Optional[str]
    description: Optional[str]
    priority: str
    task_type: str
    fixed_time: Optional[str]
    repeat: RepeatConfig
    is_completed: bool
    is_missed: bool
    miss_count: int                 # lifetime miss count — AI uses this to detect patterns
    complete_count: int             # lifetime completion count

    class Config:
        from_attributes = True      # lets Pydantic read from SQLAlchemy model attributes directly
                                    # required because TaskOut is built from a Task DB object, not a dict

