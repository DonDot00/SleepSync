from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import date
from app.db_setup import get_db
from app.models.task_model import Task
from app.models.sleep_model import SleepRecord
from app.services.ai_assistant import chat_with_ai

router = APIRouter()

class ChatRequest(BaseModel):
    message:      str
    wake_time:    str = "07:00"
    sleep_time:   str = "23:00"
    energy_level: int = 3  # 1=Exhausted 2=Low 3=Moderate 4=Good 5=Peak

# convert "09:30" to 9.5 — used when the AI returns a new_time string
def input_to_h(time_str):
    if not time_str: return 9.0
    parts = time_str.split(":")
    return int(parts[0]) + int(parts[1]) / 60

@router.post("/")
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    tasks = db.query(Task).all()

    # fetch the most recent sleep record to give the AI full context
    sleep_record = db.query(SleepRecord).order_by(SleepRecord.record_date.desc()).first()

    # build the full context object passed to the AI with every message
    schedule_context = {
        "wake_time":    request.wake_time,
        "sleep_time":   request.sleep_time,
        "energy_level": request.energy_level,
        "energy_label": ["Exhausted","Low","Moderate","Good","Peak"][request.energy_level - 1],
        "today_date":   str(date.today()),

        # sleep data so the AI knows the user's current sleep health
        "sleep": {
            "last_score":  sleep_record.score       if sleep_record else None,
            "last_hours":  sleep_record.total_hours if sleep_record else None,
            "goal_hours":  sleep_record.goal_hours  if sleep_record else 8,
            "bedtime":     sleep_record.bedtime     if sleep_record else "23:00",
            "wake_time":   sleep_record.wake_time   if sleep_record else "07:00",
        },

        # all current tasks so the AI knows what's already on the calendar
        "tasks": [
            {
                "id":          t.id,
                "title":       t.title,
                "type":        t.task_type,
                "priority":    t.priority,
                "fixed_time":  t.fixed_time,
                "start_h":     t.start_h,
                "dur_h":       t.dur_h,
                "day":         t.day,
                "miss_streak": t.miss_count,
            }
            for t in tasks
        ],
    }

    # send message + context to OpenAI and get structured JSON back
    result = chat_with_ai(request.message, schedule_context)

    # log the full AI response to the uvicorn terminal for debugging
    print("AI result:", result)

    # catch all variations the AI might return for an add action
    action = result.get("action", "").lower()
    if action in ["add_task", "create_task", "add_event", "schedule_task"] and result.get("task_name"):
        print("Creating task:", result.get("task_name"))

        new_task = Task(
            title     = result["task_name"],
            color     = result.get("color") or "purple",
            start_h   = input_to_h(result.get("new_time")),
            dur_h     = (result.get("duration_minutes") or 60) / 60,
            day       = result.get("new_day") or 0,
            priority  = result.get("priority") or "medium",
            task_type = result.get("task_type") or "flexible",
            repeat    = {"enabled": False, "days": [], "end_date": None},
        )
        db.add(new_task)
        db.commit()
        db.refresh(new_task)

        # include created_task_id so the frontend knows to refresh the calendar
        result["created_task_id"] = new_task.id
        print("Task created with id:", new_task.id)

    return result