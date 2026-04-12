from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import date
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

class SleepOut(SleepIn):
    id:          int
    record_date: date
    class Config:
        from_attributes = True

@router.post("/", response_model=SleepOut)
def save_sleep(data: SleepIn, db: Session = Depends(get_db)):
    # update today's record if it exists, otherwise create it
    today = date.today()
    record = db.query(SleepRecord).filter(SleepRecord.record_date == today).first()
    if record:
        for k, v in data.model_dump().items():
            setattr(record, k, v)
    else:
        record = SleepRecord(**data.model_dump(), record_date=today)
        db.add(record)
    db.commit()
    db.refresh(record)
    return record

@router.get("/recent")
def get_recent_sleep(db: Session = Depends(get_db)):
    # return last 7 nights for the weekly stats panel
    records = db.query(SleepRecord).order_by(SleepRecord.record_date.desc()).limit(7).all()
    return records
