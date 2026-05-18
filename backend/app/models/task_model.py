from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, JSON
from sqlalchemy.sql import func
from app.db_setup import Base

class Task(Base):
    __tablename__ = "tasks"

    id             = Column(Integer, primary_key=True, index=True)
    title          = Column(String, nullable=False)
    color          = Column(String, default="purple")
    start_h        = Column(Float, nullable=False, default=9)
    dur_h          = Column(Float, nullable=False, default=1)
    day            = Column(Integer, default=0)         # integer offset from today — 0=today
    location       = Column(String, nullable=True)
    description    = Column(String, nullable=True)
    priority       = Column(String, default="medium")   # high / medium / low
    task_type      = Column(String, default="flexible") # fixed / flexible / free
    fixed_time     = Column(String, nullable=True)
    repeat         = Column(JSON, default={"enabled": False, "days": [], "end_date": None})
    repeat_group_id = Column(String, nullable=True)     # UUID shared by all copies of a recurring series
    is_completed   = Column(Boolean, default=False)
    is_missed      = Column(Boolean, default=False)
    miss_count     = Column(Integer, default=0)
    complete_count = Column(Integer, default=0)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
