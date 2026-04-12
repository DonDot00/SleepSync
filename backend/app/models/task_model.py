from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.db_setup import Base  # updated from app.database

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    priority = Column(String, default="medium")
    task_type = Column(String, default="flexible")
    fixed_time = Column(String, nullable=True)
    is_completed = Column(Boolean, default=False)
    is_missed = Column(Boolean, default=False)
    miss_count = Column(Integer, default=0)
    complete_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
