from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db_setup import get_db
from app.models.task_model import Task
from app.schemas.task_schema import TaskCreate, TaskUpdate, TaskOut
from typing import List

router = APIRouter()

# endpoints for the post operations on tasks
# POST /tasks/ — Create a new task
@router.post("/", response_model=TaskOut)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    db_task = Task(**task.model_dump())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

# return all tasks
@router.get("/", response_model=List[TaskOut])
def get_tasks(db: Session = Depends(get_db)):
    return db.query(Task).all()

# Partially update a specific task (complete or missed)
@router.patch("/{task_id}", response_model=TaskOut)
def update_task(task_id: int, update: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if update.is_completed:
        task.is_completed = True
        task.complete_count += 1
    if update.is_missed:
        task.is_missed = True
        task.miss_count += 1
        if task.miss_count >= 3 and task.priority == "high":
            task.priority = "medium"
        elif task.miss_count >= 3 and task.priority == "medium":
            task.priority = "low"
    db.commit()
    db.refresh(task)
    return task

# Delete a specific task by id
@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    # Find the task by its id
    task = db.query(Task).filter(Task.id == task_id).first()
    
    # If no task was found, return a 404 error
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    db.delete(task) # stage the task for deletion
    db.commit()     # makes it permanent and commits it
    return {"detail": "deleted"}
