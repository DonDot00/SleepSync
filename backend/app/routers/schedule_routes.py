from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db_setup import get_db
from app.models.task_model import Task
from app.services.schedule_engine import generate_schedule

router = APIRouter()

@router.get("/generate")
def get_schedule(wake_time: str = "07:00", sleep_time: str = "23:00", db: Session = Depends(get_db)):
    tasks = db.query(Task).all()
    schedule = generate_schedule(tasks, wake_time, sleep_time)
    return {"schedule": schedule}
