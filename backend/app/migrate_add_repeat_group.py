"""
Run this ONCE to add the repeat_group_id column to your existing rem_ai.db.
It is safe to run multiple times — it skips if the column already exists.

Usage:
    cd backend
    python migrate_add_repeat_group.py
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "rem_ai.db")

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check if column already exists
    cursor.execute("PRAGMA table_info(tasks)")
    columns = [row[1] for row in cursor.fetchall()]

    if "repeat_group_id" not in columns:
        cursor.execute("ALTER TABLE tasks ADD COLUMN repeat_group_id TEXT")
        conn.commit()
        print("✅  Added repeat_group_id column to tasks table.")
    else:
        print("ℹ️   repeat_group_id column already exists — nothing to do.")

    conn.close()

if __name__ == "__main__":
    migrate()