from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date, timedelta
from app.db_setup import get_db
from app.models.task_model import Task
from app.schemas.task_schemas import TaskCreate, TaskUpdate, TaskOut

router = APIRouter()


def expand_repeats(base_task: Task, repeat_config: dict, db: Session):
    """
    After a task is saved, create real database rows for every repeat occurrence
    between tomorrow and the repeat end_date. Each copy is a standalone row
    that does not repeat further, preventing infinite expansion.
    """
    if not repeat_config.get("enabled"):
        return
    if not repeat_config.get("days"):
        return

    today        = date.today()
    end_date_str = repeat_config.get("end_date")

    # default to 60 days out if no end date was provided
    end_date = date.fromisoformat(end_date_str) if end_date_str else today + timedelta(days=60)

    repeat_days = repeat_config["days"]  # list of ints [0=Sun, 1=Mon ... 6=Sat]

    # walk every day from tomorrow to the end date
    current = today + timedelta(days=1)
    while current <= end_date:
        # Python weekday() gives Mon=0..Sun=6
        # convert to Sun=0..Sat=6 to match the frontend DOW array
        dow = (current.weekday() + 1) % 7

        if dow in repeat_days:
            offset = (current - today).days  # integer days from today
            copy = Task(
                title       = base_task.title,
                color       = base_task.color,
                start_h     = base_task.start_h,
                dur_h       = base_task.dur_h,
                day         = offset,          # always an integer
                location    = base_task.location,
                description = base_task.description,
                priority    = base_task.priority,
                task_type   = base_task.task_type,
                fixed_time  = base_task.fixed_time,
                # copies never repeat to prevent infinite expansion
                repeat      = {"enabled": False, "days": [], "end_date": None},
            )
            db.add(copy)

        current += timedelta(days=1)

    db.commit()


def safe_day(task, today):
    """
    Defensively converts the day field to an integer offset.
    Han