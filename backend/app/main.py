from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db_setup import Base, engine
from app.models import task_model
from app.routers import task_routes, schedule_routes, chat_routes
from app.routers import task_routes, schedule_routes, chat_routes, sleep_routes
app.include_router(sleep_routes.router, prefix="/sleep")
from app.models import task_model, sleep_model 
Base.metadata.create_all(bind=engine)
task_model.Base.metadata.create_all(bind=engine)

app = FastAPI(title="REM AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(task_routes.router, prefix="/tasks", tags=["tasks"])
app.include_router(schedule_routes.router, prefix="/schedule", tags=["schedule"])
app.include_router(chat_routes.router, prefix="/chat", tags=["chat"])

@app.get("/")
def root():
    return {"status": "REM AI is running"}
