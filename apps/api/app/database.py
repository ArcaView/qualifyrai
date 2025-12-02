"""Database configuration and session management."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from contextlib import contextmanager
from typing import Generator
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# Database URL from environment
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://dev:dev@localhost:5432/parsescore"
)

# Create engine with connection pooling
engine = create_engine(
    DATABASE_URL,
    poolclass=None,  # Disable pooling - creates fresh connection each time
    pool_pre_ping=True,  # Verify connections before using
    echo=False  # Set to True for SQL debugging
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Dependency for getting database sessions in FastAPI."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context():
    """Context manager for database sessions outside of FastAPI."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_db():
    """Initialize database tables. Called on startup."""
    # Import from the separate database models file
    import sys
    import importlib.util
    
    # Load the database models module
    spec = importlib.util.spec_from_file_location("db_models", "app/models/database.py")
    db_models = importlib.util.module_from_spec(spec)
    sys.modules["db_models"] = db_models
    spec.loader.exec_module(db_models)
    
    # Create all tables
    db_models.Base.metadata.create_all(bind=engine)