from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from typing import List
from datetime import date, timedelta
import uuid
from app.db_setup import get_db
from app.models.task_model import Task
from app.schemas.task_schemas import TaskCreate, TaskUpdate, TaskOut

router = APIRouter()


def expand_repeats(base_task: Task, repeat_config: dict, db: Session):
    """
    Create copies of base_task on every matching weekday between tomorrow and end_date.
    All copies share base_task.repeat_group_id so the series can be cancelled later.
    The base task itself is day-0 of the series; copies start from day+1.
    """
    if not repeat_config.get("enabled") or not repeat_config.get("days"):
        return

    today    = date.today()
    end_str  = repeat_config.get("end_date")
    end_date = date.fromisoformat(end_str) if end_str else today + timedelta(days=60)

    # Start from the day after the base task
    base_date = today + timedelta(days=int(base_task.day))
    current   = base_date + timedelta(days=1)

    group_id = base_task.repeat_group_id or str(uuid.uuid4())
    # Ensure the base task also carries the group id
    if not base_task.repeat_group_id:
        base_task.repeat_group_id = group_id
        db.add(base_task)

    while current <= end_date:
        dow = (current.weekday() + 1) % 7  # 0=Sun … 6=Sat, matching JS convention
        if dow in repeat_config["days"]:
            db.add(Task(
                title           = base_task.title,
                color           = base_task.color,
                start_h         = base_task.start_h,
                dur_h           = base_task.dur_h,
                day             = (current - today).days,
                location        = base_task.location,
                description     = base_task.description,
                priority        = base_task.priority,
                task_type       = base_task.task_type,
                fixed_time      = base_task.fixed_time,
                repeat          = {"enabled": False, "days": [], "end_date": None},
                repeat_group_id = group_id,
            ))
        current += timedelta(days=1)

    db.commit()


def safe_day(task, today):
    if isinstance(task.day, int):
        return task.day
    try:
        return (date.fromisoformat(str(task.day)) - today).days
    except Exception:
        return 0


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.post("/", response_model=TaskOut)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    data = task.model_dump()
    data["repeat"] = task.repeat.model_dump()
    data["day"]    = int(data["day"])

    db_task = Task(**data)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    expand_repeats(db_task, data["repeat"], db)
    db.refresh(db_task)
    return db_task


@router.get("/", response_model=List[TaskOut])
def get_tasks(db: Session = Depends(get_db)):
    tasks = db.query(Task).all()
    today = date.today()
    dirty = False
    for task in tasks:
        if not isinstance(task.day, int):
            task.day = safe_day(task, today)
            db.add(task)
            dirty = True
    if dirty:
        db.commit()
    return db.query(Task).filter(Task.day >= 0).all()


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(task_id: int, update: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    new_repeat = None
    for key, value in update.model_dump(exclude_none=True).items():
        if key == "repeat" and hasattr(value, "model_dump"):
            value = value.model_dump()
        if key == "repeat":
            new_repeat = value
        if key == "day":
            value = int(value) if isinstance(value, int) else 0
        setattr(task, key, value)

    if new_repeat is not None:
        flag_modified(task, "repeat")

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

    if new_repeat is not None and task.repeat_group_id:
        stale = (
            db.query(Task)
            .filter(Task.repeat_group_id == task.repeat_group_id, Task.id != task.id)
            .all()
        )
        for s in stale:
            db.delete(s)
        db.commit()

    if new_repeat and new_repeat.get("enabled") and new_repeat.get("days"):
        expand_repeats(task, new_repeat, db)
        db.refresh(task)

    return task


@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"detail": "deleted"}


# ── Recurring series cancellation ─────────────────────────────────────────────

@router.delete("/group/{group_id}")
def cancel_recurring_series(
    group_id: str,
    from_day: int = 0,          # delete this occurrence + all future ones (day offset)
    db: Session = Depends(get_db)
):
    """
    Cancel all occurrences of a recurring series on or after `from_day`.

    - from_day=0  → deletes the entire series (all days)
    - from_day=3  → keeps occurrences on days 0–2, deletes day 3 onwards

    The frontend should pass the day offset of the occurrence the user
    clicked "Cancel this and future events" on.
    """
    tasks_to_delete = (
        db.query(Task)
        .filter(Task.repeat_group_id == group_id, Task.day >= from_day)
        .all()
    )
    if not tasks_to_delete:
        raise HTTPException(status_code=404, detail="No matching recurring tasks found")

    for t in tasks_to_delete:
        db.delete(t)
    db.commit()
    return {"detail": f"Deleted {len(tasks_to_delete)} occurrence(s) from day {from_day} onwards"}

    