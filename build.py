"""build.py  —  package SleepSync into a standalone Windows exe.
Usage:  python build.py
Output: dist/SleepSync.exe  (upload to GitHub Releases)
"""
import subprocess
import sys
import pathlib
import shutil

ROOT         = pathlib.Path(__file__).parent
FRONTEND     = ROOT / "frontend"
FRONTEND_DIST = FRONTEND / "dist"
VENV_PY      = ROOT / "backend" / ".venv" / "Scripts" / "python.exe"
PY           = str(VENV_PY) if VENV_PY.exists() else sys.executable

SEP = "-" * 52


def run(cmd, cwd=None):
    subprocess.run(cmd, cwd=cwd or ROOT, check=True, shell=True)


print(f"\n{SEP}\n SleepSync builder\n{SEP}")

# 1. Frontend
print("\n[1/3] Installing npm packages...")
run("npm install", cwd=FRONTEND)
print("[2/3] Building React frontend...")
run("npm run build", cwd=FRONTEND)

if not FRONTEND_DIST.exists():
    print("ERROR: frontend/dist was not created. Check npm build output.")
    sys.exit(1)

# 2. Make sure PyInstaller is available
run(f'"{PY}" -m pip install pyinstaller --quiet')

# 3. PyInstaller
print("[3/3] Packaging with PyInstaller...")

for d in (ROOT / "dist", ROOT / "build"):
    if d.exists():
        try:
            shutil.rmtree(d)
        except PermissionError:
            print(f"\nERROR: Cannot delete {d} — SleepSync.exe is still running.")
            print("Close the app and try again.")
            sys.exit(1)

run(
    f'"{PY}" -m PyInstaller'
    f' --name SleepSync'
    f' --onefile'
    f' --windowed'
    f' --paths "{ROOT / "backend"}"'
    f' --add-data "{FRONTEND_DIST};frontend_dist"'
    f' --hidden-import "sqlalchemy.dialects.sqlite"'
    f' --hidden-import "uvicorn.logging"'
    f' --hidden-import "uvicorn.loops.auto"'
    f' --hidden-import "uvicorn.protocols.http.auto"'
    f' --hidden-import "uvicorn.protocols.websockets.auto"'
    f' --hidden-import "uvicorn.lifespan.on"'
    f' --hidden-import "anyio._backends._asyncio"'
    f' run.py'
)

print(f"\n{SEP}\n Build complete!\n{SEP}\n SleepSync.exe -> dist/SleepSync.exe\n Upload to GitHub Releases.\n{SEP}\n")
