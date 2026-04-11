#!/bin/bash
# REM AI - Project Scaffold Script
# Run this from the root of your git repo

set -e
echo "🚀 Scaffolding REM AI project..."

# ─────────────────────────────────────
# BACKEND




mkdir -p backend/app/{routers,models,services,schemas}

# Entry point
cat > backend/app/main.py << 'EOF'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import tasks, schedule, users

app = FastAPI(title="REM AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
app.include_router(schedule.router, prefix="/schedule", tags=["schedule"])
app.include_router(users.router, prefix="/users", tags=["users"])

@app.get("/")
def root():
    return {"status": "REM AI is running"}
EOF

# Database setup
cat > backend/app/database.py << 'EOF'
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

SQLA
    task_type = Column(String, default="flexible")  # fixed / flexible / sleep / free
    fixed_time = Column(String, nullable=True)  # "09:00" if fixed
    is_completed = Column(Boolean, default=False)
    is_missed = Column(Boolean, default=False)
    miss_count = Column(Integer, default=0)
    complete_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
EOF

# Schemas
cat > backend/app/schemas/task.py << 'EOF'
from pydantic import BaseModel
from typing import Optional

class TaskCreate(BaseModel):
    name: str
    duration_minutes: int
    priority: str = "medium"
    task_type: str = "flexible"
    fixed_time: Optional[str] = None

class TaskUpdate(BaseModel):
    is_completed: Optional[bool] = None
    is_missed: Optional[bool] = None

class TaskOut(TaskCreate):
    id: int
    is_completed: bool
    is_missed: bool
    miss_count: int
    complete_count: int

    class Config:
        from_attributes = True
EOF

# Routers
cat > backend/app/routers/tasks.py << 'EOF'
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate, TaskOut
from typing import List

router = APIRouter()

@router.post("/", response_model=TaskOut)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    db_task = Task(**task.model_dump())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@router.get("/", response_model=List[TaskOut])
def get_tasks(db: Session = Depends(get_db)):
    return db.query(Task).all()

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
        # Smart rule: 3 misses → drop priority
        if task.miss_count >= 3 and task.priority == "high":
            task.priority = "medium"
        elif task.miss_count >= 3 and task.priority == "medium":
            task.priority = "low"
    db.commit()
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
EOF

cat > backend/app/routers/schedule.py << 'EOF'
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.task import Task
from app.services.scheduler import generate_schedule

router = APIRouter()

@router.get("/generate")
def get_schedule(wake_time: str = "07:00", sleep_time: str = "23:00", db: Session = Depends(get_db)):
    tasks = db.query(Task).all()
    schedule = generate_schedule(tasks, wake_time, sleep_time)
    return {"schedule": schedule}
EOF

cat > backend/app/routers/users.py << 'EOF'
from fastapi import APIRouter

router = APIRouter()

@router.get("/preferences")
def get_preferences():
    # Placeholder — extend later with a User model
    return {"wake_time": "07:00", "sleep_time": "23:00"}
EOF

# Scheduler service (the brain)
cat > backend/app/services/scheduler.py << 'EOF'
from datetime import datetime, timedelta
from typing import List

PRIORITY_ORDER = {"high": 0, "medium": 1, "low": 2}

def time_to_dt(t: str) -> datetime:
    return datetime.strptime(t, "%H:%M")

def dt_to_str(dt: datetime) -> str:
    return dt.strftime("%H:%M")

def generate_schedule(tasks, wake_time: str, sleep_time: str) -> list:
    schedule = []
    current = time_to_dt(wake_time)
    sleep_dt = time_to_dt(sleep_time)

    # 1. Fixed tasks first
    fixed = sorted(
        [t for t in tasks if t.task_type == "fixed" and t.fixed_time],
        key=lambda t: t.fixed_time
    )

    # 2. Flexible tasks sorted by priority
    flexible = sorted(
        [t for t in tasks if t.task_type == "flexible"],
        key=lambda t: PRIORITY_ORDER.get(t.priority, 2)
    )

    blocked = []
    for t in fixed:
        start = time_to_dt(t.fixed_time)
        end = start + timedelta(minutes=t.duration_minutes)
        blocked.append((start, end, t))

    # Fill schedule
    for start, end, task in blocked:
        # Fill gap before fixed task with flexible tasks
        while flexible and current < start:
            ft = flexible[0]
            ft_end = current + timedelta(minutes=ft.duration_minutes)
            if ft_end <= start:
                schedule.append({
                    "task_id": ft.id,
                    "name": ft.name,
                    "start": dt_to_str(current),
                    "end": dt_to_str(ft_end),
                    "type": "flexible",
                    "priority": ft.priority,
                })
                current = ft_end
                flexible.pop(0)
            else:
                break
        schedule.append({
            "task_id": task.id,
            "name": task.name,
            "start": dt_to_str(start),
            "end": dt_to_str(end),
            "type": "fixed",
            "priority": task.priority,
        })
        current = max(current, end)

    # Fill remaining time before sleep
    for ft in flexible:
        ft_end = current + timedelta(minutes=ft.duration_minutes)
        if ft_end <= sleep_dt:
            schedule.append({
                "task_id": ft.id,
                "name": ft.name,
                "start": dt_to_str(current),
                "end": dt_to_str(ft_end),
                "type": "flexible",
                "priority": ft.priority,
            })
            current = ft_end

    # Lock in sleep
    schedule.append({
        "task_id": None,
        "name": "🛏 Sleep",
        "start": dt_to_str(sleep_dt),
        "end": wake_time,
        "type": "sleep",
        "priority": "non-negotiable",
    })

    return schedule
EOF

# requirements.txt
cat > backend/requirements.txt << 'EOF'
fastapi
uvicorn[standard]
sqlalchemy
pydantic
python-dotenv
openai
EOF

# Startup script
cat > backend/start.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
EOF
chmod +x backend/start.sh

# ─────────────────────────────────────
# FRONTEND (Vite + React)
# ─────────────────────────────────────
mkdir -p frontend/src/{components,pages,hooks,services,store}

cat > frontend/src/services/api.js << 'EOF'
const BASE = "http://localhost:8000";

export const getTasks = () => fetch(`${BASE}/tasks`).then(r => r.json());

export const createTask = (task) =>
  fetch(`${BASE}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  }).then(r => r.json());

export const updateTask = (id, update) =>
  fetch(`${BASE}/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update),
  }).then(r => r.json());

export const deleteTask = (id) =>
  fetch(`${BASE}/tasks/${id}`, { method: "DELETE" }).then(r => r.json());

export const getSchedule = (wake = "07:00", sleep = "23:00") =>
  fetch(`${BASE}/schedule/generate?wake_time=${wake}&sleep_time=${sleep}`)
    .then(r => r.json());
EOF

cat > frontend/src/components/TaskForm.jsx << 'EOF'
import { useState } from "react";
import { createTask } from "../services/api";

export default function TaskForm({ onTaskAdded }) {
  const [form, setForm] = useState({
    name: "", duration_minutes: 30,
    priority: "medium", task_type: "flexible", fixed_time: ""
  });

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async () => {
    if (!form.name) return;
    await createTask(form);
    onTaskAdded();
    setForm({ name: "", duration_minutes: 30, priority: "medium", task_type: "flexible", fixed_time: "" });
  };

  return (
    <div className="task-form">
      <input name="name" value={form.name} onChange={handle} placeholder="Task name" />
      <input name="duration_minutes" type="number" value={form.duration_minutes} onChange={handle} placeholder="Duration (min)" />
      <select name="priority" value={form.priority} onChange={handle}>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      <select name="task_type" value={form.task_type} onChange={handle}>
        <option value="fixed">Fixed time</option>
        <option value="flexible">Flexible</option>
        <option value="free">Free time</option>
      </select>
      {form.task_type === "fixed" && (
        <input name="fixed_time" type="time" value={form.fixed_time} onChange={handle} />
      )}
      <button onClick={submit}>Add Task</button>
    </div>
  );
}
EOF

cat > frontend/src/components/ScheduleView.jsx << 'EOF'
import { updateTask } from "../services/api";

export default function ScheduleView({ schedule, onUpdate }) {
  const mark = async (id, type) => {
    if (!id) return;
    await updateTask(id, { [type]: true });
    onUpdate();
  };

  return (
    <div className="schedule">
      {schedule.map((block, i) => (
        <div key={i} className={`block block--${block.type}`}>
          <span className="time">{block.start} – {block.end}</span>
          <span className="name">{block.name}</span>
          {block.task_id && (
            <div className="actions">
              <button onClick={() => mark(block.task_id, "is_completed")}>✅</button>
              <button onClick={() => mark(block.task_id, "is_missed")}>❌</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
EOF

cat > frontend/src/pages/Home.jsx << 'EOF'
import { useEffect, useState } from "react";
import { getTasks, getSchedule } from "../services/api";
import TaskForm from "../components/TaskForm";
import ScheduleView from "../components/ScheduleView";

export default function Home() {
  const [schedule, setSchedule] = useState([]);
  const [wake, setWake] = useState("07:00");
  const [sleep, setSleep] = useState("23:00");

  const refresh = async () => {
    const data = await getSchedule(wake, sleep);
    setSchedule(data.schedule || []);
  };

  useEffect(() => { refresh(); }, []);

  return (
    <main>
      <h1>REM AI</h1>
      <div className="time-prefs">
        <label>Wake: <input type="time" value={wake} onChange={e => setWake(e.target.value)} /></label>
        <label>Sleep: <input type="time" value={sleep} onChange={e => setSleep(e.target.value)} /></label>
        <button onClick={refresh}>Generate Schedule</button>
      </div>
      <TaskForm onTaskAdded={refresh} />
      <ScheduleView schedule={schedule} onUpdate={refresh} />
    </main>
  );
}
EOF

cat > frontend/src/App.jsx << 'EOF'
import Home from "./pages/Home";
import "./index.css";
export default function App() { return <Home />; }
EOF

cat > frontend/src/index.css << 'EOF'
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; background: #0f0f13; color: #f0f0f0; }
main { max-width: 700px; margin: 2rem auto; padding: 1rem; }
h1 { font-size: 2rem; margin-bottom: 1.5rem; }
.time-prefs { display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
.task-form { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
input, select, button { padding: 0.5rem 0.75rem; border-radius: 6px; border: 1px solid #333; background: #1a1a24; color: #f0f0f0; }
button { background: #5b5ef4; border-color: #5b5ef4; cursor: pointer; }
button:hover { background: #4a4dd8; }
.schedule { display: flex; flex-direction: column; gap: 0.5rem; }
.block { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1rem; border-radius: 8px; background: #1a1a24; border-left: 4px solid #333; }
.block--fixed { border-color: #5b5ef4; }
.block--flexible { border-color: #22c55e; }
.block--sleep { border-color: #60a5fa; background: #0d1a2e; }
.block--free { border-color: #facc15; }
.time { font-size: 0.8rem; color: #888; min-width: 110px; }
.name { flex: 1; }
.actions { display: flex; gap: 0.5rem; }
.actions button { background: transparent; border: none; font-size: 1.1rem; padding: 0.2rem; }
EOF

# Root README
cat > README.md << 'EOF'
# REM AI — Intelligent Schedule Assistant

## Quick Start

### Backend
```bash
cd backend && ./start.sh
```

### Frontend
```bash
cd frontend
npm create vite@latest . -- --template react
npm install
npm run dev
```

## Stack
- **Backend**: FastAPI + SQLite + SQLAlchemy
- **Frontend**: React + Vite
- **AI (Phase 7)**: OpenAI API (plug in later)
EOF

echo ""
echo "✅ Project scaffolded successfully!"
echo ""
echo "Next steps:"
echo "  1. cd backend && ./start.sh"
echo "  2. cd frontend && npm create vite@latest . -- --template react && npm install && npm run dev"
echo "  3. Hit http://localhost:5173"