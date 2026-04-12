from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
from app.models import task
from app.routers import tasks, schedule

task.Base.metadata.create_all(bind=engine)

app = FastAPI(title="REM AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
app.include_router(schedule.router, prefix="/schedule", tags=["schedule"])

@app.get("/")
def root():
    return {"status": "REM AI is running"}
