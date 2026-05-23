@echo off
start "REM Backend" cmd /k "cd /d %~dp0backend && .venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"
start "REM Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
