import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_default_sqlite = f"sqlite:///{os.path.join(BASE_DIR, 'mixmaster.db')}"
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", _default_sqlite).strip()

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=os.getenv("SQL_ECHO", "").lower() in ("1", "true", "yes"),
    )
else:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        echo=os.getenv("SQL_ECHO", "").lower() in ("1", "true", "yes"),
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
