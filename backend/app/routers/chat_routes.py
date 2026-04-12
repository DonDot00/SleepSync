from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db_setup import get_db
from app.models.task_model import Task
from app.services.ai_assistant import chat_with_ai
from pydantic import BaseModel


router = APIRouter() # make a router instance

# checks to see if request match this model
class ChatRequest(BaseModel):
    message: str
    wake_time: str = "07:00"
    sleep_time: str = "23:00"
# endpoint to the front end call
@router.post("/")
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    tasks = db.query(Task).all()
    # Build a context object that tells the AI everything it needs to know{a dictionary}
    # about the user's current schedule before generating a response
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
            for t in tasks # loop through every task
        ]
    }
    # Pass the user's message and full schedule context to the AI service
    # and return whatever the AI responds with directly to the frontend
    result = chat_with_ai(request.message, schedule_context)
    return result
