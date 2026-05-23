#!/usr/bin/env python3
"""
setup.py  —  First-time setup for REM AI.
Run once after cloning:  python setup.py
"""

import subprocess
import sys
import os
import pathlib

ROOT     = pathlib.Path(__file__).parent
BACKEND  = ROOT / "backend"
FRONTEND = ROOT / "frontend"
VENV     = BACKEND / ".venv"
PY       = VENV / "Scripts" / "python.exe"   # Windows path
ENV_FILE = BACKEND / ".env"

SEP = "-" * 52


def step(msg):
    print(f"\n{msg}")
    print(SEP)


def run(cmd, cwd=None):
    subprocess.run(cmd, cwd=cwd, check=True, shell=True)


def check_tool(name, test_cmd, install_url):
    try:
        subprocess.run(test_cmd, capture_output=True, check=True, shell=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print(f"\nERROR: '{name}' not found on PATH.")
        print(f"Install it from: {install_url}")
        print("Then re-run this script.")
        sys.exit(1)


# ── 0. Check prerequisites ───────────────────────────────────────────────────

step("Checking prerequisites")
check_tool("Python 3.11+", "python --version", "https://python.org/downloads")
check_tool("Node.js / npm", "npm --version",   "https://nodejs.org")
print("Python and Node.js found.")

# ── 1. Python virtual environment ────────────────────────────────────────────

step("Setting up Python virtual environment")
if PY.exists():
    print("Virtual environment already exists, skipping creation.")
else:
    print("Creating .venv inside backend/ ...")
    subprocess.run([sys.executable, "-m", "venv", str(VENV)], check=True)
    print("Done.")

# ── 2. Python packages ───────────────────────────────────────────────────────

step("Installing Python packages")
run(f'"{PY}" -m pip install --upgrade pip --quiet')
run(f'"{PY}" -m pip install -r "{BACKEND / "requirements.txt"}"')
print("Done.")

# ── 3. Frontend packages ─────────────────────────────────────────────────────

step("Installing frontend Node packages (npm install)")
run("npm install", cwd=FRONTEND)
print("Done.")

# ── 4. OpenAI API key ────────────────────────────────────────────────────────

step("Configuring OpenAI API key")
if ENV_FILE.exists():
    print(f"{ENV_FILE} already exists — skipping.")
    print("To change your key, edit backend/.env directly.")
else:
    print("The AI assistant requires an OpenAI API key.")
    print("Get a free key at: https://platform.openai.com/api-keys")
    print()
    key = input("Paste your OpenAI API key (sk-...): ").strip()
    if not key.startswith("sk-"):
        print("Warning: key doesn't start with 'sk-', but saving anyway.")
    ENV_FILE.write_text(f"OPENAI_API_KEY={key}\n", encoding="utf-8")
    print(f"Saved to {ENV_FILE}")

# ── Done ─────────────────────────────────────────────────────────────────────

print(f"""
{SEP}
 Setup complete!
{SEP}

 To start the app:
   Double-click  Start REM.vbs
   Then open     http://localhost:5173

 Apple Watch integration (optional):
   Run  python generate_shortcut.py
   Then AirDrop SleepSync.shortcut to your iPhone

{SEP}
""")