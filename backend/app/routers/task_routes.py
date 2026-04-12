from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db_setup import get_db
from app.models.task_model import Task
from app.schemas.task_schemas import TaskCreate, TaskUpdate, TaskOut


router = APIRouter()  # all routes in this file are registered under the /tasks prefix in main.py


# ── POST /tasks/ 
# Called when the user submits the AddEventModal form.
# Receives a TaskCreate body, writes a new row to the tasks table, returns the full task.
@router.post("/", response_model=TaskOut)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):

    data = task.model_dump()

    # convert repeat here before passing to the Task constructor
    data["repeat"] = task.repeat.model_dump()

    db_task = Task(**data)  # unpack the dict as keyword args into the SQLAlchemy model
    db.add(db_task)         # stage the new row
    db.commit()             # write it to the database
    db.refresh(db_task)     # reload from DB so the returned object has its auto-assigned id and created_at
    return db_task


# ── GET /tasks/ 
# Called on page load so the calendar can show all saved events. Returns every task row
@router.get("/", response_model=List[TaskOut])
def get_tasks(db: Session = Depends(get_db)):
    return db.query(Task).all()


# ── PATCH /tasks/{task_id} 
# Handles two different use cases in one endpoint:
#   1. User edits an event in the modal (title, time, color, etc.)
#   2. User clicks to mark a task complete or missed
# Only fields that were actually sent in the request body get updated.
@router.patch("/{task_id}", response_model=TaskOut)
def update_task(task_id: int, update: TaskUpdate, db: Session = Depends(get_db)):

    # look up the task — 404 if it doesn't exist
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # exclude_none=True means only fields the frontend actually sent come through
    update_data = update.model_dump(exclude_none=True)

    for key, value in update_data.items():
        # repeat arrives as a RepeatConfig object when sent through Pydantic,
        # but the DB column expects a plain dict — convert it before saving
        if key == "repeat" and hasattr(value, "model_dump"):
            value = value.model_dump()
        setattr(task, key, value)  # apply each changed field directly to the DB row

    # ── Miss streak logic (AI behavior)
    # Every time a task is missed, increment the counter.
    # This feeds into the scheduler so the AI deprioritizes chronically missed tasks.
    if update.is_missed:
        task.miss_count += 1
        if task.miss_count >= 3 and task.priority == "high":
            task.priority = "medium"    # high → medium after 3 misses
        elif task.miss_count >= 3 and task.priority == "medium":
            task.priority = "low"       # medium → low after 3 more misses

    # ── Completion tracking 
    # Completion count is used later by the AI to identify tasks the user
    if update.is_completed:
        task.complete_count += 1

    db.commit()         # write all changes to the database
    db.refresh(task)    # reload so the returned object reflects the saved state
    return task


# ── DELETE /tasks/{task_id} 
# Permanently removes the task row — no soft delete for now.
@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):

    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)     # stage the deletion
    db.commit()         # commit the change to the database
    return {"detail": "deleted"}