from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.db_setup import Base  # updated from app.database

# the task table
class Task(Base):
    __tablename__ = "tasks"  # the actual table name in the database

    id = Column(Integer, primary_key=True, index=True)          # unique ID auto-assigned to each task
    name = Column(String, nullable=False)                        # task name — required, can't be empty
    duration_minutes = Column(Integer, nullable=False)           # how long the task takes — required
    priority = Column(String, default="medium")                  # high / medium / low
    task_type = Column(String, default="flexible")               # fixed / flexible / free
    fixed_time = Column(String, nullable=True)                   # only set if task_type is "fixed"
    is_completed = Column(Boolean, default=False)                # user marked task as done
    is_missed = Column(Boolean, default=False)                   # user marked task as missed
    miss_count = Column(Integer, default=0)                      # tracks consecutive misses for AI logic
    complete_count = Column(Integer, default=0)                  # tracks completions for AI learning
    created_at = Column(DateTime(timezone=True), server_default=func.now())  # auto-set when task is created
