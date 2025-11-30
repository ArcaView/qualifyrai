"""Database configuration and session management."""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import OperationalError, DatabaseError
from contextlib import contextmanager
from typing import Generator, Optional, Dict, Any
import os
import logging

logger = logging.getLogger(__name__)

# Database URL from environment
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://dev:dev@localhost:5432/parsescore"
)

# Create engine with robust connection pooling
engine = create_engine(
    DATABASE_URL,
    pool_size=10,              # Number of permanent connections
    max_overflow=20,           # Additional connections when pool is full
    pool_pre_ping=True,        # Verify connections before using (detect stale connections)
    pool_recycle=3600,         # Recycle connections after 1 hour
    pool_timeout=30,           # Timeout for getting connection from pool
    echo=False,                # Set to True for SQL debugging
    connect_args={
        "connect_timeout": 10,  # Connection timeout in seconds
        "options": "-c statement_timeout=30000"  # 30 second query timeout
    }
)

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False  # Prevent errors when accessing attributes after commit
)


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


def check_database_health(db: Optional[Session] = None) -> Dict[str, Any]:
    """
    Perform comprehensive database health check.

    Args:
        db: Optional database session. If None, creates a new one.

    Returns:
        Dictionary with health check results:
        {
            'healthy': bool,
            'connection': bool,
            'query_test': bool,
            'pool_size': int,
            'pool_checked_out': int,
            'error': Optional[str]
        }
    """
    health_status = {
        'healthy': False,
        'connection': False,
        'query_test': False,
        'pool_size': 0,
        'pool_checked_out': 0,
        'error': None
    }

    close_session = False
    if db is None:
        db = SessionLocal()
        close_session = True

    try:
        # Test 1: Connection test
        db.connection()
        health_status['connection'] = True
        logger.debug("Database connection test passed")

        # Test 2: Query execution test
        result = db.execute(text("SELECT 1 as health_check"))
        row = result.fetchone()
        if row and row[0] == 1:
            health_status['query_test'] = True
            logger.debug("Database query test passed")

        # Test 3: Connection pool stats
        pool = engine.pool
        health_status['pool_size'] = pool.size()
        health_status['pool_checked_out'] = pool.checkedout()

        # Overall health
        health_status['healthy'] = (
            health_status['connection'] and
            health_status['query_test']
        )

        logger.info(
            f"Database health check: "
            f"healthy={health_status['healthy']}, "
            f"pool={health_status['pool_checked_out']}/{health_status['pool_size']}"
        )

    except OperationalError as e:
        health_status['error'] = f"Operational error: {str(e)}"
        logger.error(f"Database health check failed: {health_status['error']}")
    except DatabaseError as e:
        health_status['error'] = f"Database error: {str(e)}"
        logger.error(f"Database health check failed: {health_status['error']}")
    except Exception as e:
        health_status['error'] = f"Unexpected error: {str(e)}"
        logger.error(f"Database health check failed: {health_status['error']}")
    finally:
        if close_session:
            db.close()

    return health_status


def test_database_connection() -> bool:
    """
    Quick database connection test.

    Returns:
        True if connection is healthy, False otherwise
    """
    try:
        health = check_database_health()
        return health['healthy']
    except Exception as e:
        logger.error(f"Database connection test failed: {e}")
        return False


def get_connection_pool_stats() -> Dict[str, Any]:
    """
    Get current connection pool statistics.

    Returns:
        Dictionary with pool stats
    """
    try:
        pool = engine.pool
        return {
            'pool_size': pool.size(),
            'checked_out_connections': pool.checkedout(),
            'overflow': pool.overflow(),
            'pool_timeout': pool._timeout if hasattr(pool, '_timeout') else None,
        }
    except Exception as e:
        logger.error(f"Failed to get pool stats: {e}")
        return {'error': str(e)}