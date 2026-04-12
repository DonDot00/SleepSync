from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import task_routes, schedule_routes, chat_routes, sleep_routes
from app.models import task_model, sleep_model
from app.db_setup import engine, Base

# create tables 
Base.metadata.create_all(bind=engine)

# create the app
app = FastAPI()

# add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# register routers
app.include_router(task_routes.router,     prefix="/tasks")
app.include_router(schedule_routes.router, prefix="/schedule")
app.include_router(chat_routes.router,     prefix="/chat")
app.include_router(sleep_routes.router,    prefix="/sleep")