"""SleepSync — launcher for the packaged app and development."""
import multiprocessing
import sys
import os
import pathlib
import threading
import time

multiprocessing.freeze_support()

# ── Paths ─────────────────────────────────────────────────────────────────────

ROOT = pathlib.Path(__file__).parent
if not getattr(sys, 'frozen', False):
    sys.path.insert(0, str(ROOT / "backend"))

# ── Data directory (AppData\SleepSync) ────────────────────────────────────────

DATA_DIR = pathlib.Path(os.environ.get('APPDATA', pathlib.Path.home())) / 'SleepSync'
DATA_DIR.mkdir(parents=True, exist_ok=True)
ENV_FILE = DATA_DIR / '.env'
os.environ['SLEEPSYNC_DATA_DIR'] = str(DATA_DIR)

# ── First-run: ask for API key ────────────────────────────────────────────────

def _show_setup_dialog():
    import tkinter as tk
    from tkinter import ttk

    result = {"key": None}

    def on_save():
        key = entry.get().strip()
        if key and key != "sk-...":
            result["key"] = key
            root.destroy()

    def on_cancel():
        root.destroy()

    root = tk.Tk()
    root.title("SleepSync Setup")
    root.resizable(False, False)
    w, h = 500, 230
    x = (root.winfo_screenwidth() - w) // 2
    y = (root.winfo_screenheight() - h) // 2
    root.geometry(f"{w}x{h}+{x}+{y}")

    frame = ttk.Frame(root, padding=24)
    frame.pack(fill="both", expand=True)

    ttk.Label(frame, text="Welcome to SleepSync!", font=("", 13, "bold")).pack(anchor="w")
    ttk.Label(
        frame,
        text="An OpenAI API key is required for the AI assistant.\n"
             "Get a free key at: platform.openai.com/api-keys",
        foreground="gray",
    ).pack(anchor="w", pady=(6, 14))

    entry = ttk.Entry(frame, width=60)
    entry.insert(0, "sk-...")
    entry.pack(fill="x")
    entry.focus()
    entry.select_range(0, "end")

    btn_frame = ttk.Frame(frame)
    btn_frame.pack(fill="x", pady=(16, 0))
    ttk.Button(btn_frame, text="Save & Launch", command=on_save).pack(side="right")
    ttk.Button(btn_frame, text="Quit", command=on_cancel).pack(side="right", padx=(0, 6))

    root.bind("<Return>", lambda _: on_save())
    root.protocol("WM_DELETE_WINDOW", on_cancel)
    root.mainloop()
    return result["key"]


if not ENV_FILE.exists():
    key = _show_setup_dialog()
    if not key:
        sys.exit(0)
    ENV_FILE.write_text(f"OPENAI_API_KEY={key}\n", encoding="utf-8")

from dotenv import load_dotenv
load_dotenv(ENV_FILE)

# ── Open browser once the server is ready ────────────────────────────────────

def _open_browser():
    import urllib.request
    for _ in range(40):
        try:
            urllib.request.urlopen("http://localhost:8000", timeout=1)
            break
        except Exception:
            time.sleep(0.5)
    import webbrowser
    webbrowser.open("http://localhost:8000")

threading.Thread(target=_open_browser, daemon=True).start()

# ── Start server ──────────────────────────────────────────────────────────────

try:
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, log_level="warning")
except Exception as exc:
    import tkinter.messagebox as mb
    mb.showerror("SleepSync Error", f"Failed to start:\n\n{exc}")
    sys.exit(1)
