"""Health check and monitoring endpoints."""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db, check_database_health, get_connection_pool_stats
from app.services.persistence_service import persistence_service

router = APIRouter(prefix="/v1", tags=["Health"])
logger = logging.getLogger(__name__)


@router.get("/health")
async def health_check():
    """
    Basic health check endpoint.

    Returns:
        Health status
    """
    return {
        "status": "healthy",
        "service": "ParseScore API",
        "version": "1.0.0"
    }


@router.get("/health/database")
async def database_health_check(db: Session = Depends(get_db)):
    """
    Comprehensive database health check.

    Returns:
        Detailed database health information
    """
    health = check_database_health(db)

    if not health['healthy']:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "database_unhealthy",
                "message": "Database health check failed",
                "details": health
            }
        )

    return {
        "status": "healthy",
        "database": health,
        "pool": get_connection_pool_stats()
    }


@router.get("/health/persistence")
async def persistence_health_check():
    """
    Check persistence service health and backup statistics.

    Internal monitoring endpoint.

    Returns:
        Persistence service status and backup stats
    """
    backup_stats = persistence_service.get_backup_stats()

    return {
        "status": "healthy",
        "persistence_service": {
            "max_retries": persistence_service.max_retries,
            "base_delay": persistence_service.base_delay,
            "max_delay": persistence_service.max_delay,
            "verification_enabled": persistence_service.enable_verification,
            "health_checks_enabled": persistence_service.enable_health_checks
        },
        "backups": backup_stats
    }


@router.get("/health/full")
async def full_health_check(
    db: Session = Depends(get_db)
):
    """
    Comprehensive health check of all system components.

    Internal monitoring endpoint.

    Returns:
        Full system health status
    """
    # Database health
    db_health = check_database_health(db)

    # Connection pool stats
    pool_stats = get_connection_pool_stats()

    # Persistence service stats
    backup_stats = persistence_service.get_backup_stats()

    # Determine overall status
    overall_healthy = db_health['healthy']

    return {
        "status": "healthy" if overall_healthy else "degraded",
        "timestamp": None,  # Will be set by response
        "components": {
            "database": {
                "status": "healthy" if db_health['healthy'] else "unhealthy",
                "details": db_health
            },
            "connection_pool": {
                "status": "healthy",
                "details": pool_stats
            },
            "persistence_service": {
                "status": "healthy",
                "config": {
                    "max_retries": persistence_service.max_retries,
                    "verification_enabled": persistence_service.enable_verification,
                    "health_checks_enabled": persistence_service.enable_health_checks
                },
                "backups": backup_stats
            }
        }
    }
