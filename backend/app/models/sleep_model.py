from sqlalchemy import Column, Integer, String, Float, Date
from sqlalchemy.sql import func
from app.db_setup import Base
from datetime import date

class SleepRecord(Base):
    __tablename__ = "sleep_records"

    id          = Column(Integer, primary_key=True, index=True)
    record_date = Column(Date, default=date.today)        # which night this record is for
    bedtime     = Column(String, default="23:00")         # e.g. "23:00"
    wake_time   = Column(String, default="07:00")         # e.g. "07:00"
    goal_hours  = Column(Float, default=8.0)              # user's sleep goal
    total_hours = Column(Float)                           # actual hours slept
    score       = Column(Integer)                         # 0-100 sleep score
    deep_mins   = Column(Integer)                         # deep sleep minutes
    rem_mins    = Column(Integer)                         # REM sleep minutes
    light_mins  = Column(Integer)                         # light sleep minutes