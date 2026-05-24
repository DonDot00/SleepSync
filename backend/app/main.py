import sys
import pathlib
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.routers import task_routes, schedule_routes, chat_routes, sleep_routes
from app.models import task_model, sleep_model
from app.db_setup import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(task_routes.router,     prefix="/tasks")
app.include_router(schedule_routes.router, prefix="/schedule")
app.include_router(chat_routes.router,     prefix="/chat")
app.include_router(sleep_routes.router,    prefix="/sleep")

# ── Serve built React frontend ────────────────────────────────────────────────

def _frontend_dist() -> pathlib.Path:
    if getattr(sys, 'frozen', False):
        # Running as PyInstaller bundle — files are in sys._MEIPASS/frontend_dist
        return pathlib.Path(sys._MEIPASS) / "frontend_dist"
    # Running from source — frontend/dist relative to this file (backend/app/main.py)
    return pathlib.Path(__file__).parent.parent.parent / "frontend" / "dist"

_DIST = _frontend_dist()

if _DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        candidate = _DIST / full_path
        if candidate.is_file():
            return FileResponse(str(candidate))
        return FileResponse(str(_DIST / "index.html"))
