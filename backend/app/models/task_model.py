from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, JSON
from sqlalchemy.sql import func
from app.db_setup import Base



class Task(Base):
    __tablename__ = "tasks"  # the actual table name SQLAlchemy creates in SQLite

    # ── Identity 
    id = Column(Integer, primary_key=True, index=True)  # auto-incrementing unique ID

    # ── Display info 
    title    = Column(String,  nullable=False)           # the task name shown on the calendar block
    color    = Column(String,  default="purple")         # color theme id matching EVENT_COLORS in the frontend
    location = Column(String,  nullable=True)            # optional
    description = Column(String, nullable=True)          # optional

    # ── Scheduling 
    start_h    = Column(Float,   nullable=False, default=9) # start time as a decimal hour — 9.5 means 9:30am
    dur_h      = Column(Float,   nullable=False, default=1) # duration in hours — 1.5 means 1h 30m
    day        = Column(Integer, default=0)                 # which day: 0 = today, 1 = tomorrow
    fixed_time = Column(String,  nullable=True)             # only used for fixed tasks, stores time as "HH:MM" e.g. "09:00"

    # ── Classification 
    priority  = Column(String, default="medium")   # how important: "high", "medium", or "low"
    task_type = Column(String, default="flexible") # scheduling behavior: "fixed" (locked time), "flexible" (AI can move it), "free" (lowest priority filler)

    # ── Repeat  
    # Stored as JSON matching the frontend repeat object:
    # { "enabled": true, "days": [1, 3, 5] }  days are 0=Sun through 6=Sat
    repeat = Column(JSON, default={"enabled": False, "days": []})

    # ── Completion tracking 
    is_completed   = Column(Boolean, default=False) # user marked this done
    is_missed      = Column(Boolean, default=False) # user marked this as missed
    miss_count     = Column(Integer, default=0)     # total lifetime misses — used by AI to detect patterns
    complete_count = Column(Integer, default=0)     # total lifetime completions

    # ── Metadata 
    created_at = Column(DateTime(timezone=True), server_default=func.now()) # set automatically by the DB on insert
