#!/usr/bin/env python3
"""
Backup Recovery Utility

This script recovers CV data from backup files and saves them to the database.

Usage:
    python -m app.scripts.recover_from_backup --backup-file <path>
    python -m app.scripts.recover_from_backup --backup-dir <path> --all
    python -m app.scripts.recover_from_backup --list
"""

import os
import sys
import json
import argparse
import logging
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.database import SessionLocal, check_database_health
from app.repositories.db_repository import ParsedCVRepository
from app.models.database import ParsedCV

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class BackupRecovery:
    """Utility for recovering CV data from backup files."""

    def __init__(self, backup_dir: Optional[str] = None):
        """Initialize recovery utility."""
        if backup_dir is None:
            backup_dir = os.getenv('BACKUP_DIR', './data/backups')
        self.backup_dir = Path(backup_dir)

        if not self.backup_dir.exists():
            logger.warning(f"Backup directory does not exist: {self.backup_dir}")
            self.backup_dir.mkdir(parents=True, exist_ok=True)

    def list_backups(self) -> List[Dict[str, Any]]:
        """
        List all backup files.

        Returns:
            List of backup file information
        """
        backup_files = sorted(
            self.backup_dir.glob("cv_backup_*.json"),
            key=lambda f: f.stat().st_mtime,
            reverse=True
        )

        backups = []
        for backup_file in backup_files:
            try:
                with open(backup_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                metadata = data.get('metadata', {})
                backups.append({
                    'file': str(backup_file),
                    'filename': backup_file.name,
                    'size_bytes': backup_file.stat().st_size,
                    'created_at': datetime.fromtimestamp(backup_file.stat().st_mtime),
                    'request_id': metadata.get('request_id'),
                    'original_filename': metadata.get('filename'),
                    'backup_timestamp': data.get('backup_timestamp')
                })
            except Exception as e:
                logger.error(f"Error reading backup file {backup_file}: {e}")
                backups.append({
                    'file': str(backup_file),
                    'error': str(e)
                })

        return backups

    def load_backup(self, backup_file: Path) -> Optional[Dict[str, Any]]:
        """
        Load backup file.

        Args:
            backup_file: Path to backup file

        Returns:
            Backup data or None if failed
        """
        try:
            with open(backup_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            logger.info(f"Loaded backup file: {backup_file}")
            return data

        except Exception as e:
            logger.error(f"Failed to load backup file {backup_file}: {e}")
            return None

    def recover_backup(
        self,
        backup_file: Path,
        dry_run: bool = False
    ) -> bool:
        """
        Recover CV data from backup file to database.

        Args:
            backup_file: Path to backup file
            dry_run: If True, don't actually save to database

        Returns:
            True if successful, False otherwise
        """
        # Load backup data
        backup_data = self.load_backup(backup_file)
        if not backup_data:
            return False

        metadata = backup_data.get('metadata', {})
        cv_data = backup_data.get('cv_data', {})

        if not metadata or not cv_data:
            logger.error(f"Invalid backup data in {backup_file}")
            return False

        request_id = metadata.get('request_id')
        api_key_id = metadata.get('api_key_id')
        filename = metadata.get('filename')
        file_type = metadata.get('file_type')

        logger.info(
            f"Recovering CV: request_id={request_id}, "
            f"filename={filename}, dry_run={dry_run}"
        )

        if dry_run:
            logger.info("DRY RUN - Would have recovered this CV")
            return True

        # Check database health
        db = SessionLocal()
        try:
            health = check_database_health(db)
            if not health['healthy']:
                logger.error("Database is not healthy, cannot recover backup")
                return False

            # Check if CV already exists
            existing_cv = ParsedCVRepository.get_by_request_id(db, request_id)
            if existing_cv:
                logger.warning(
                    f"CV already exists in database: cv_id={existing_cv.id}, "
                    f"request_id={request_id}. Skipping recovery."
                )
                return False

            # Create CV record
            cv_record = ParsedCVRepository.create(
                db=db,
                request_id=request_id,
                api_key_id=api_key_id,
                filename=filename,
                file_type=file_type,
                parsed_data=cv_data
            )

            db.flush()
            db.commit()
            db.refresh(cv_record)

            logger.info(
                f"✅ Successfully recovered CV: cv_id={cv_record.id}, "
                f"request_id={request_id}"
            )

            # Optionally move/rename backup file to indicate it's been recovered
            recovered_path = backup_file.with_suffix('.recovered.json')
            backup_file.rename(recovered_path)
            logger.info(f"Backup file renamed to: {recovered_path}")

            return True

        except Exception as e:
            logger.error(f"Failed to recover backup: {e}")
            db.rollback()
            return False

        finally:
            db.close()

    def recover_all(self, dry_run: bool = False) -> Dict[str, int]:
        """
        Recover all backup files.

        Args:
            dry_run: If True, don't actually save to database

        Returns:
            Statistics: {'succeeded': count, 'failed': count, 'skipped': count}
        """
        backups = self.list_backups()
        stats = {'succeeded': 0, 'failed': 0, 'skipped': 0}

        logger.info(f"Found {len(backups)} backup files")

        for backup in backups:
            if 'error' in backup:
                stats['failed'] += 1
                continue

            backup_file = Path(backup['file'])

            # Skip already recovered backups
            if backup_file.suffix == '.recovered':
                stats['skipped'] += 1
                continue

            success = self.recover_backup(backup_file, dry_run=dry_run)
            if success:
                stats['succeeded'] += 1
            else:
                stats['failed'] += 1

        return stats


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Recover CV data from backup files'
    )
    parser.add_argument(
        '--backup-dir',
        type=str,
        help='Backup directory (default: ./data/backups)'
    )
    parser.add_argument(
        '--backup-file',
        type=str,
        help='Specific backup file to recover'
    )
    parser.add_argument(
        '--all',
        action='store_true',
        help='Recover all backup files'
    )
    parser.add_argument(
        '--list',
        action='store_true',
        help='List all backup files'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Perform dry run without actually saving to database'
    )

    args = parser.parse_args()

    # Initialize recovery utility
    recovery = BackupRecovery(backup_dir=args.backup_dir)

    # List backups
    if args.list:
        backups = recovery.list_backups()
        print(f"\nFound {len(backups)} backup files:\n")
        for backup in backups:
            if 'error' in backup:
                print(f"  ❌ {backup['filename']}: ERROR - {backup['error']}")
            else:
                print(f"  📄 {backup['filename']}")
                print(f"     Request ID: {backup['request_id']}")
                print(f"     Original File: {backup['original_filename']}")
                print(f"     Size: {backup['size_bytes']} bytes")
                print(f"     Created: {backup['created_at']}")
                print()
        return

    # Recover specific file
    if args.backup_file:
        backup_file = Path(args.backup_file)
        if not backup_file.exists():
            logger.error(f"Backup file not found: {backup_file}")
            sys.exit(1)

        success = recovery.recover_backup(backup_file, dry_run=args.dry_run)
        sys.exit(0 if success else 1)

    # Recover all files
    if args.all:
        stats = recovery.recover_all(dry_run=args.dry_run)
        print("\n=== Recovery Statistics ===")
        print(f"Succeeded: {stats['succeeded']}")
        print(f"Failed: {stats['failed']}")
        print(f"Skipped: {stats['skipped']}")
        print(f"Total: {sum(stats.values())}")
        sys.exit(0)

    # No action specified
    parser.print_help()


if __name__ == '__main__':
    main()
