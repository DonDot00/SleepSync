import os
import pathlib
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

_data_dir = pathlib.Path(os.environ.get('SLEEPSYNC_DATA_DIR', '.'))
_db_path  = _data_dir / 'sleepsync.db'

engine       = create_engine(f"sqlite:///{_db_path}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
