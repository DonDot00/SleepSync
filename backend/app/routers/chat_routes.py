from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import date
import uuid
from app.db_setup import get_db
from app.models.task_model import Task
from app.models.sleep_model import SleepRecord
from app.services.ai_assistant import chat_with_ai
from app.routers.task_routes import expand_repeats

router = APIRouter()


class ChatRequest(BaseModel):
    message:      str
    wake_time:    str = "07:00"
    sleep_time:   str = "23:00"
    energy_level: int = 3


def time_to_h(time_str: str) -> float:
    """Convert 'HH:MM' to a float hour (e.g. '17:30' → 17.5)."""
    if not time_str:
        return 9.0
    parts = time_str.split(":")
    return int(parts[0]) + int(parts[1]) / 60


@router.post("/")
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    tasks        = db.query(Task).all()
    sleep_record = db.query(SleepRecord).order_by(SleepRecord.record_date.desc()).first()

    schedule_context = {
        "wake_time":    request.wake_time,
        "sleep_time":   request.sleep_time,
        "energy_level": request.energy_level,
        "energy_label": ["Exhausted", "Low", "Moderate", "Good", "Peak"][request.energy_level - 1],
        "today_date":   str(date.today()),
        "sleep": {
            "last_score":  sleep_record.score       if sleep_record else None,
            "last_hours":  sleep_record.total_hours if sleep_record else None,
            "goal_hours":  sleep_record.goal_hours  if sleep_record else 8,
            "bedtime":     sleep_record.bedtime     if sleep_record else "23:00",
            "wake_time":   sleep_record.wake_time   if sleep_record else "07:00",
        },
        "tasks": [
            {
                "id":         t.id,
                "title":      t.title,
                "type":       t.task_type,
                "priority":   t.priority,
                "fixed_time": t.fixed_time,
                "start_h":    t.start_h,
                "dur_h":      t.dur_h,
                "day":        t.day,
                "miss_streak": t.miss_count,
            }
            for t in tasks
        ],
    }

    result = chat_with_ai(request.message, schedule_context)
    print("AI result:", result)

    created_ids = []

    # ── Handle add_task (supports multiple tasks + repeat) ───────────────────
    if result.get("action") == "add_task":
        for task_data in result.get("tasks", []):
            repeat_cfg = task_data.get("repeat") or {"enabled": False, "days": [], "end_date": None}

            # Assign a shared group_id for recurring series
            group_id = str(uuid.uuid4()) if repeat_cfg.get("enabled") else None

            new_task = Task(
                title           = task_data.get("task_name", "Untitled"),
                color           = task_data.get("color") or "purple",
                start_h         = time_to_h(task_data.get("new_time") or "09:00"),
                dur_h           = (task_data.get("duration_minutes") or 60) / 60,
                day             = int(task_data.get("new_day") or 0),
                priority        = task_data.get("priority") or "medium",
                task_type       = task_data.get("task_type") or "flexible",
                repeat          = repeat_cfg,
                repeat_group_id = group_id,
            )
            db.add(new_task)
            db.commit()
            db.refresh(new_task)

            # Expand recurring copies if needed
            if repeat_cfg.get("enabled"):
                expand_repeats(new_task, repeat_cfg, db)
                db.refresh(new_task)

            created_ids.append(new_task.id)
            print(f"Task created — id={new_task.id}  repeat_group={group_id}")

    result["created_task_ids"] = created_ids
    return result
