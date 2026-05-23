from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import date, timedelta
import datetime
from app.db_setup import get_db
from app.models.sleep_model import SleepRecord

router = APIRouter()

class SleepIn(BaseModel):
    bedtime:     str
    wake_time:   str
    goal_hours:  float
    total_hours: float
    score:       int
    deep_mins:   int
    rem_mins:    int
    light_mins:  int

class AppleHealthSleepIn(BaseModel):
    bedtime:       str
    wake_time:     str
    total_minutes: float
    deep_minutes:  float = 0
    rem_minutes:   float = 0
    light_minutes: float = 0
    goal_hours:    float = 8.0

class SleepOut(SleepIn):
    id:          int
    record_date: date
    class Config:
        from_attributes = True

def _upsert(db: Session, record_date: date, payload: dict) -> SleepRecord:
    record = db.query(SleepRecord).filter(SleepRecord.record_date == record_date).first()
    if record:
        for k, v in payload.items():
            setattr(record, k, v)
    else:
        record = SleepRecord(**payload, record_date=record_date)
        db.add(record)
    db.commit()
    db.refresh(record)
    return record

@router.post("/", response_model=SleepOut)
def save_sleep(data: SleepIn, db: Session = Depends(get_db)):
    return _upsert(db, date.today(), data.model_dump())

@router.post("/apple-health", response_model=SleepOut)
def save_apple_health_sleep(data: AppleHealthSleepIn, db: Session = Depends(get_db)):
    # Before noon assume the sleep happened last night; noon or later means tonight's data
    now = datetime.datetime.now()
    record_date = date.today() if now.hour >= 12 else date.today() - timedelta(days=1)

    total_hours = round(data.total_minutes / 60, 2)
    score       = min(100, round((total_hours / data.goal_hours) * 100))

    payload = {
        "bedtime":     data.bedtime,
        "wake_time":   data.wake_time,
        "goal_hours":  data.goal_hours,
        "total_hours": total_hours,
        "score":       score,
        "deep_mins":   round(data.deep_minutes),
        "rem_mins":    round(data.rem_minutes),
        "light_mins":  round(data.light_minutes),
    }
    return _upsert(db, record_date, payload)

@router.get("/recent")
def get_recent_sleep(db: Session = Depends(get_db)):
    records = db.query(SleepRecord).order_by(SleepRecord.record_date.desc()).limit(7).all()
    return records
