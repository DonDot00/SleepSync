from asyncio import tasks
from urllib import request

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db_setup import get_db
from app.models.task_model import Task
from app.services.ai_assistant import chat_with_ai
from pydantic import BaseModel
from datetime import date, timedelta
from app.models.sleep_model import SleepRecord

# fetch today's sleep record and include it in the AI context
sleep_record = db.query(SleepRecord).order_by(SleepRecord.record_date.desc()).first()
schedule_context["sleep"] = {
    "last_score":   sleep_record.score       if sleep_record else None,
    "last_hours":   sleep_record.total_hours if sleep_record else None,
    "goal_hours":   sleep_record.goal_hours  if sleep_record else 8,
    "bedtime":      sleep_record.bedtime     if sleep_record else "23:00",
    "wake_time":    sleep_record.wake_time   if sleep_record else "07:00",
}

@router.post("/")
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    tasks = db.query(Task).all()
    today = date.today()
    
    schedule_context = {
        "wake_time": request.wake_time,
        "sleep_time": request.sleep_time,
        "energy_level": request.energy_level,
        "today_date": str(today),
        "tasks": [
            {
                "id": t.id,
                "title": t.title,
                "type": t.task_type,
                "priority": t.priority,
                "fixed_time": t.fixed_time,
                "start_h": t.start_h,
                "dur_h": t.dur_h,
                "day": t.day,
                "miss_streak": t.miss_count,
            }
            for t in tasks
        ]
    }
    
    result = chat_with_ai(request.message, schedule_context)
    
    # act on AI response — if it wants to add a task, create it
    if result.get("action") == "add_task" and result.get("task_name"):
        new_task = Task(
            title=result["task_name"],
            color="purple",
            start_h=inputToH(result["new_time"]) if result.get("new_time") else 9.0,
            dur_h=(result.get("duration_minutes") or 60) / 60,
            day=result.get("new_day") or 0,
            priority=result.get("priority") or "medium",
            task_type=result.get("task_type") or "flexible",
            repeat={"enabled": False, "days": []},
        )
        db.add(new_task)
        db.commit()
        db.refresh(new_task)
        result["created_task_id"] = new_task.id
    
    return result

# helper needed in chat_routes.py
def inputToH(time_str):
    if not time_str: return 9.0
    parts = time_str.split(":")
    return int(parts[0]) + int(parts[1]) / 60