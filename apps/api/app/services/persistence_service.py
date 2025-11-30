"""Robust persistence service with retry logic, verification, and fallback mechanisms.

This service provides enterprise-grade data persistence with:
- Automatic retry with exponential backoff
- Transaction verification via read-back checks
- Database health monitoring
- File-based backup fallback
- Comprehensive error handling and logging
- Atomicity guarantees
"""

import os
import json
import time
import hashlib
from typing import Optional, Dict, Any, Tuple
from datetime import datetime
from pathlib import Path
import logging
from contextlib import contextmanager

from sqlalchemy import text
from sqlalchemy.orm import Session
from sqlalchemy.exc import (
    SQLAlchemyError,
    OperationalError,
    DatabaseError,
    IntegrityError,
    DataError
)

from app.repositories.db_repository import ParsedCVRepository
from app.models.database import ParsedCV

# Configure logging
logger = logging.getLogger(__name__)


class PersistenceError(Exception):
    """Base exception for persistence errors."""
    pass


class DatabaseHealthCheckError(PersistenceError):
    """Database health check failed."""
    pass


class TransactionVerificationError(PersistenceError):
    """Transaction verification failed - data mismatch."""
    pass


class MaxRetriesExceededError(PersistenceError):
    """Maximum retry attempts exceeded."""
    pass


class PersistenceService:
    """
    Robust persistence service with enterprise-grade reliability features.

    Features:
    - Retry logic with exponential backoff (configurable)
    - Database health checks before operations
    - Transaction verification via read-back
    - File-based backup fallback
    - Comprehensive error classification
    - Detailed audit logging
    """

    def __init__(
        self,
        max_retries: int = 3,
        base_delay: float = 0.5,
        max_delay: float = 10.0,
        backup_dir: Optional[str] = None,
        enable_verification: bool = True,
        enable_health_checks: bool = True
    ):
        """
        Initialize the persistence service.

        Args:
            max_retries: Maximum number of retry attempts (default: 3)
            base_delay: Base delay for exponential backoff in seconds (default: 0.5)
            max_delay: Maximum delay between retries in seconds (default: 10.0)
            backup_dir: Directory for file-based backups (default: ./data/backups)
            enable_verification: Enable read-back verification (default: True)
            enable_health_checks: Enable pre-operation health checks (default: True)
        """
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.enable_verification = enable_verification
        self.enable_health_checks = enable_health_checks

        # Setup backup directory
        if backup_dir is None:
            backup_dir = os.getenv('BACKUP_DIR', './data/backups')
        self.backup_dir = Path(backup_dir)
        self.backup_dir.mkdir(parents=True, exist_ok=True)

        logger.info(
            f"PersistenceService initialized: "
            f"max_retries={max_retries}, "
            f"verification={enable_verification}, "
            f"health_checks={enable_health_checks}, "
            f"backup_dir={self.backup_dir}"
        )

    def _calculate_backoff_delay(self, attempt: int) -> float:
        """
        Calculate exponential backoff delay.

        Args:
            attempt: Current attempt number (0-indexed)

        Returns:
            Delay in seconds
        """
        delay = self.base_delay * (2 ** attempt)
        return min(delay, self.max_delay)

    def _check_database_health(self, db: Session) -> bool:
        """
        Perform database health check.

        Args:
            db: Database session

        Returns:
            True if healthy, False otherwise

        Raises:
            DatabaseHealthCheckError: If health check fails critically
        """
        try:
            # Execute a simple query to verify connection
            # IMPORTANT: Wrap raw SQL in text() for SQLAlchemy 2.0+
            result = db.execute(text("SELECT 1 as health_check"))
            row = result.fetchone()

            if row is None or row[0] != 1:
                raise DatabaseHealthCheckError("Health check query returned unexpected result")

            logger.debug("Database health check passed")
            return True

        except OperationalError as e:
            logger.error(f"Database health check failed - operational error: {e}")
            raise DatabaseHealthCheckError(f"Database connection issue: {e}")
        except Exception as e:
            logger.error(f"Database health check failed - unexpected error: {e}")
            raise DatabaseHealthCheckError(f"Health check failed: {e}")

    def _verify_saved_data(
        self,
        db: Session,
        cv_id: str,
        expected_data: Dict[str, Any]
    ) -> bool:
        """
        Verify saved data by reading it back and comparing.

        Args:
            db: Database session
            cv_id: ID of the saved CV record
            expected_data: Original data that was saved

        Returns:
            True if verification passed

        Raises:
            TransactionVerificationError: If data doesn't match
        """
        try:
            # Read back the saved record
            saved_cv = ParsedCVRepository.get_by_id(db, cv_id)

            if saved_cv is None:
                raise TransactionVerificationError(
                    f"Verification failed: CV with ID {cv_id} not found after save"
                )

            # Verify critical fields
            if saved_cv.id != cv_id:
                raise TransactionVerificationError(
                    f"ID mismatch: expected {cv_id}, got {saved_cv.id}"
                )

            # Verify data integrity using hash comparison
            expected_hash = self._hash_data(expected_data)
            actual_hash = self._hash_data(saved_cv.parsed_data)

            if expected_hash != actual_hash:
                raise TransactionVerificationError(
                    f"Data integrity check failed: hash mismatch "
                    f"(expected: {expected_hash[:8]}..., got: {actual_hash[:8]}...)"
                )

            logger.debug(f"Data verification passed for CV {cv_id}")
            return True

        except TransactionVerificationError:
            raise
        except Exception as e:
            raise TransactionVerificationError(f"Verification error: {e}")

    def _hash_data(self, data: Dict[str, Any]) -> str:
        """
        Calculate hash of data for integrity verification.

        Args:
            data: Data dictionary to hash

        Returns:
            SHA256 hash hex string
        """
        # Serialize to JSON with sorted keys for consistent hashing
        json_str = json.dumps(data, sort_keys=True, default=str)
        return hashlib.sha256(json_str.encode()).hexdigest()

    def _save_to_backup(
        self,
        cv_data: Dict[str, Any],
        metadata: Dict[str, Any]
    ) -> str:
        """
        Save CV data to file-based backup.

        Args:
            cv_data: Parsed CV data
            metadata: Metadata (request_id, filename, etc.)

        Returns:
            Path to backup file
        """
        try:
            # Create backup filename with timestamp
            timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S_%f')
            request_id = metadata.get('request_id', 'unknown')
            backup_filename = f"cv_backup_{request_id}_{timestamp}.json"
            backup_path = self.backup_dir / backup_filename

            # Prepare backup data
            backup_data = {
                'metadata': metadata,
                'cv_data': cv_data,
                'backup_timestamp': datetime.utcnow().isoformat(),
                'backup_reason': 'database_failure_fallback'
            }

            # Write to file with atomic operation
            temp_path = backup_path.with_suffix('.tmp')
            with open(temp_path, 'w', encoding='utf-8') as f:
                json.dump(backup_data, f, indent=2, default=str)

            # Atomic rename
            temp_path.rename(backup_path)

            logger.warning(
                f"CV data backed up to file: {backup_path} "
                f"(request_id: {request_id})"
            )

            return str(backup_path)

        except Exception as e:
            logger.error(f"Failed to create backup file: {e}")
            raise PersistenceError(f"Backup creation failed: {e}")

    def _classify_error(self, error: Exception) -> Tuple[str, bool]:
        """
        Classify database error and determine if retry is appropriate.

        Args:
            error: Exception that occurred

        Returns:
            Tuple of (error_type, should_retry)
        """
        if isinstance(error, OperationalError):
            # Connection issues, timeouts - usually transient
            return ("operational_error", True)

        elif isinstance(error, IntegrityError):
            # Constraint violations - not transient
            return ("integrity_error", False)

        elif isinstance(error, DataError):
            # Invalid data format - not transient
            return ("data_error", False)

        elif isinstance(error, DatabaseError):
            # Generic database error - might be transient
            return ("database_error", True)

        elif isinstance(error, (TransactionVerificationError, DatabaseHealthCheckError)):
            # Our custom errors - might be transient
            return (error.__class__.__name__, True)

        else:
            # Unknown error - don't retry by default
            return ("unknown_error", False)

    @contextmanager
    def _transaction_scope(self, db: Session):
        """
        Managed transaction scope with automatic commit/rollback.

        Args:
            db: Database session

        Yields:
            Database session
        """
        try:
            yield db
            db.commit()
            logger.debug("Transaction committed successfully")
        except Exception as e:
            db.rollback()
            logger.error(f"Transaction rolled back due to error: {e}")
            raise

    def save_parsed_cv_robust(
        self,
        db: Session,
        request_id: str,
        api_key_id: str,
        filename: str,
        file_type: str,
        parsed_data: Dict[str, Any],
        fail_on_error: bool = True
    ) -> Tuple[Optional[ParsedCV], Optional[str]]:
        """
        Save parsed CV with robust error handling and retry logic.

        This is the main entry point for saving CV data. It implements:
        1. Pre-operation health check (optional)
        2. Retry with exponential backoff
        3. Transaction verification via read-back
        4. File-based backup on final failure
        5. Comprehensive error logging

        Args:
            db: Database session
            request_id: Request ID for tracking
            api_key_id: API key ID for authorization
            filename: Original filename
            file_type: File extension (pdf, docx, etc.)
            parsed_data: Parsed CV data dictionary
            fail_on_error: If True, raise exception on failure; if False, return None

        Returns:
            Tuple of (ParsedCV record or None, error_message or None)

        Raises:
            PersistenceError: If fail_on_error=True and save fails after all retries
        """
        metadata = {
            'request_id': request_id,
            'api_key_id': api_key_id,
            'filename': filename,
            'file_type': file_type,
            'timestamp': datetime.utcnow().isoformat()
        }

        last_error = None

        # Pre-operation health check
        if self.enable_health_checks:
            try:
                self._check_database_health(db)
            except DatabaseHealthCheckError as e:
                logger.error(f"Pre-operation health check failed: {e}")
                if fail_on_error:
                    # Try backup immediately
                    backup_path = self._save_to_backup(parsed_data, metadata)
                    raise PersistenceError(
                        f"Database unhealthy, data backed up to {backup_path}: {e}"
                    )
                return None, f"Database health check failed: {e}"

        # Retry loop with exponential backoff
        for attempt in range(self.max_retries):
            try:
                logger.info(
                    f"Attempting to save CV (attempt {attempt + 1}/{self.max_retries}): "
                    f"request_id={request_id}, filename={filename}"
                )

                # Start transaction
                with self._transaction_scope(db):
                    # Create CV record
                    cv_record = ParsedCVRepository.create(
                        db=db,
                        request_id=request_id,
                        api_key_id=api_key_id,
                        filename=filename,
                        file_type=file_type,
                        parsed_data=parsed_data
                    )

                    # Force flush to get the ID
                    db.flush()

                    cv_id = cv_record.id
                    logger.debug(f"CV record created with ID: {cv_id}")

                # Transaction committed by context manager

                # Verify the save if enabled
                if self.enable_verification:
                    logger.debug(f"Verifying saved data for CV {cv_id}...")
                    self._verify_saved_data(db, cv_id, parsed_data)

                # Success!
                logger.info(
                    f"✅ CV saved successfully: "
                    f"cv_id={cv_id}, "
                    f"request_id={request_id}, "
                    f"filename={filename}, "
                    f"attempt={attempt + 1}"
                )

                return cv_record, None

            except Exception as e:
                last_error = e
                error_type, should_retry = self._classify_error(e)

                logger.error(
                    f"❌ Save attempt {attempt + 1} failed: "
                    f"error_type={error_type}, "
                    f"should_retry={should_retry}, "
                    f"error={e}"
                )

                # If this is the last attempt or error is not retryable, break
                if attempt == self.max_retries - 1 or not should_retry:
                    logger.error(
                        f"Final save failure after {attempt + 1} attempts: {e}"
                    )
                    break

                # Calculate backoff delay
                delay = self._calculate_backoff_delay(attempt)
                logger.info(f"Retrying after {delay:.2f}s delay...")
                time.sleep(delay)

        # All retries exhausted - create backup
        logger.error(
            f"All {self.max_retries} save attempts failed for request {request_id}. "
            f"Creating backup..."
        )

        try:
            backup_path = self._save_to_backup(parsed_data, metadata)
            error_msg = (
                f"Database save failed after {self.max_retries} attempts. "
                f"Data backed up to: {backup_path}. "
                f"Last error: {last_error}"
            )

            if fail_on_error:
                raise MaxRetriesExceededError(error_msg)

            return None, error_msg

        except Exception as backup_error:
            error_msg = (
                f"CRITICAL: Database save failed AND backup failed. "
                f"DB error: {last_error}. "
                f"Backup error: {backup_error}"
            )
            logger.critical(error_msg)

            if fail_on_error:
                raise PersistenceError(error_msg)

            return None, error_msg

    def get_backup_stats(self) -> Dict[str, Any]:
        """
        Get statistics about backup files.

        Returns:
            Dictionary with backup statistics
        """
        try:
            backup_files = list(self.backup_dir.glob("cv_backup_*.json"))

            total_size = sum(f.stat().st_size for f in backup_files)

            return {
                'backup_dir': str(self.backup_dir),
                'total_backups': len(backup_files),
                'total_size_bytes': total_size,
                'total_size_mb': round(total_size / (1024 * 1024), 2),
                'oldest_backup': min(
                    (f.stat().st_mtime for f in backup_files),
                    default=None
                ),
                'newest_backup': max(
                    (f.stat().st_mtime for f in backup_files),
                    default=None
                )
            }
        except Exception as e:
            logger.error(f"Error getting backup stats: {e}")
            return {'error': str(e)}


# Global instance with sensible defaults
persistence_service = PersistenceService(
    max_retries=int(os.getenv('PERSISTENCE_MAX_RETRIES', '3')),
    base_delay=float(os.getenv('PERSISTENCE_BASE_DELAY', '0.5')),
    max_delay=float(os.getenv('PERSISTENCE_MAX_DELAY', '10.0')),
    enable_verification=os.getenv('PERSISTENCE_VERIFICATION', 'true').lower() == 'true',
    enable_health_checks=os.getenv('PERSISTENCE_HEALTH_CHECKS', 'true').lower() == 'true'
)
