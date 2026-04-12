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
    After a task is saved, this function creates real database copies of it
    for every day that matches the repeat pattern between tomorrow and end_date.
    Each copy is a standalone row — it doesn't repeat itself further.
    """
    # nothing to expand if repeat is disabled or no days selected
    if not repeat_config.get("enabled"):
        return
    if not repeat_config.get("days"):
        return

    today        = date.today()
    end_date_str = repeat_config.get("end_date")

    # default to 60 days out if no end date was set
    end_date = date.fromisoformat(end_date_str) if end_date_str else today + timedelta(days=60)

    repeat_days = repeat_config["days"]  # e.g. [1, 3, 5] for Mon/Wed/Fri

    # walk through every day from tomorrow to the end date
    current = today + timedelta(days=1)
    while current <= end_date:
        # Python's weekday() gives Mon=0..Sun=6
        # convert to Sun=0..Sat=6 to match the frontend's DOW array
        dow = (current.weekday() + 1) % 7

        if dow in repeat_days:
            # calculate how many days from today this copy falls on
            offset = (current - today).days

            # create a real database row for this repeat occurrence
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
                # copies never repeat — prevents infinite expansion
                repeat      = {"enabled": False, "days": [], "end_date": None},
            )
            db.add(copy)

        current += timedelta(days=1)

    # commit all the copies at once
    db.commit()


# ── POST /tasks/ — create a new task and expand any repeats ──
@router.post("/", response_model=TaskOut)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    # convert Pydantic model to dict and serialize repeat to plain dict for JSON column
    data           = task.model_dump()
    data["repeat"] = task.repeat.model_dump()

    # save the base task
    db_task = Task(**data)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    # immediately create real DB rows for all repeat occurrences
    expand_repeats(db_task, data["repeat"], db)

    return db_task


# ── GET /tasks/ — return every task in the database ──
@router.get("/", response_model=List[TaskOut])
def get_tasks(db: Session = Depends(get_db)):
    # repeats are now real rows so no virtual expansion needed here
    return db.query(Task).all()


# ── PATCH /tasks/{task_id} — partially update a specific task ──
@router.patch("/{task_id}", response_model=TaskOut)
def update_task(task_id: int, update: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()

    # return 404 if no task found with that id
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # only apply fields that were actually sent — skip None values
    update_data = update.model_dump(exclude_none=True)
    for key, value in update_data.items():
        # repeat comes in as a RepeatConfig Pydantic object
        # the DB JSON column needs a plain dict — convert it before saving
        if key == "repeat" and hasattr(value, "model_dump"):
            value = value.model_dump()
        setattr(task, key, value)

    # if task is marked missed, increment counter and demote priority after 3 misses
    if update.is_missed:
        task.miss_count += 1
        if task.miss_count >= 3 and task.priority == "high":
            task.priority = "medium"
        elif task.miss_count >= 3 and task.priority == "medium":
            task.priority = "low"

    # if task is marked complete, increment the completion counter
    if update.is_completed:
        task.complete_count += 1

    db.commit()
    db.refresh(task)
    return task


# ── DELETE /tasks/{task_id} — permanently remove a task ──
@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()

    # return 404 if no task found with that id
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()
    return {"detail": "deleted"}