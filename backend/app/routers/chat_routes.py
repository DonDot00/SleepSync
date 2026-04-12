from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db_setup import get_db
from app.models.task_model import Task
from app.services.ai_assistant import chat_with_ai
from pydantic import BaseModel

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    wake_time: str = "07:00"
    sleep_time: str = "23:00"

@router.post("/")
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    tasks = db.query(Task).all()
    schedule_context = {
        "wake_time": request.wake_time,
        "sleep_time": request.sleep_time,
        "tasks": [
            {
                "id": t.id,
                "name": t.name,
                "type": t.task_type,
                "priority": t.priority,
                "fixed_time": t.fixed_time,
                "duration_minutes": t.duration_minutes,
                "miss_streak": t.miss_count,
            }
            for t in tasks
        ]
    }
    result = chat_with_ai(request.message, schedule_context)
    return result
