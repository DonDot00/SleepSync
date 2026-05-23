@echo off
cd /d %~dp0backend
start "REM Backend" cmd /k ".venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"
cd /d %~dp0frontend
start "REM Frontend" cmd /k "npm run dev"
