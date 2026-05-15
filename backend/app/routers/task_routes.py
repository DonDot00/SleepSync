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
                day         = offset,
                location    = base_task.location,
                description = base_task.description,
                priority    = base_task.priority,
                task_type   = base_task.task_type,
                fixed_time  = base_task.fixed_time,
                repeat      = {"enabled": False, "days": [], "end_date": None},
            )
            db.add(copy)

        current += timedelta(days=1)

    db.commit()


def safe_day(task, today):
    """
    Defensively converts the day field to an integer offset.
    Handles cases where day might be stored as a date string or None.
    Returns 0 (today) as a fallback if conversion fails.
    """
    try:
        if task.day is None:
            return 0
        return int(task.day)
    except (ValueError, TypeError):
        return 0


# POST /tasks/ — create a new task from the AddEventModal form
@router.post("/", response_model=TaskOut)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    data = task.model_dump()
    data["repeat"] = task.repeat.model_dump()
    db_task = Task(**data)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    # expand repeat occurrences into their own rows
    expand_repeats(db_task, data["repeat"], db)
    return db_task


# GET /tasks/ — fetch all tasks so the calendar can display them
@router.get("/", response_model=List[TaskOut])
def get_tasks(db: Session = Depends(get_db)):
    return db.query(Task).all()


# PATCH /tasks/{task_id} — update any field, or mark complete/missed
@router.patch("/{task_id}", response_model=TaskOut)
def update_task(task_id: int, update: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = update.model_dump(exclude_none=True)
    for key, value in update_data.items():
        if key == "repeat" and hasattr(value, "model_dump"):
            value = value.model_dump()
        setattr(task, key, value)

    # miss streak logic — demote priority after 3 consecutive misses
    if update.is_missed:
        task.miss_count += 1
        if task.miss_count >= 3 and task.priority == "high":
            task.priority = "medium"
        elif task.miss_count >= 3 and task.priority == "medium":
            task.priority = "low"

    if update.is_completed:
        task.complete_count += 1

    db.commit()
    db.refresh(task)
    return task


# DELETE /tasks/{task_id} — remove a task when user deletes it in the modal
@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"detail": "deleted"}