# Robust CV Persistence System

## Overview

This document describes the enterprise-grade robust persistence system implemented for CV data storage. The system ensures that CV data is **safely and securely saved** with multiple layers of protection against data loss.

## Architecture

The robust persistence system consists of several components working together:

```
┌─────────────────────┐
│  Parse Endpoint     │
│  (parse.py)         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ PersistenceService  │  ◄── Main entry point
│ (persistence_       │
│  service.py)        │
└──────────┬──────────┘
           │
           ├─► Health Check
           ├─► Retry Logic (3x with exponential backoff)
           ├─► Transaction Verification (read-back)
           └─► File Backup (fallback)
           │
           ▼
┌─────────────────────┐
│ Database Repository │
│ (db_repository.py)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   PostgreSQL DB     │
│   (ps_parsed_cvs)   │
└─────────────────────┘
```

## Key Features

### 1. **Automatic Retry with Exponential Backoff**
- Retries failed database operations automatically
- Default: 3 attempts with exponential backoff (0.5s, 1s, 2s)
- Configurable via environment variables
- Smart error classification (transient vs permanent errors)

### 2. **Pre-Operation Health Checks**
- Database connection verification before save attempts
- Connection pool monitoring
- Query execution validation
- Prevents saves to unhealthy database

### 3. **Transaction Verification**
- Read-back verification after every save
- Data integrity check using SHA256 hashing
- Ensures data was actually written to disk
- Detects silent failures or data corruption

### 4. **File-Based Backup Fallback**
- If database save fails after all retries, data is saved to file
- JSON format with metadata
- Atomic write operations (temp file + rename)
- Recovery utility included

### 5. **Enhanced Connection Pooling**
- Pool size: 10 permanent connections
- Max overflow: 20 additional connections
- Connection recycling after 1 hour
- Pre-ping to detect stale connections
- Automatic reconnection on failure

### 6. **Comprehensive Error Handling**
- Errors classified by type (operational, integrity, data, etc.)
- Detailed logging at every step
- Non-blocking failures (parse succeeds even if save fails)
- Error metadata in response for debugging

### 7. **Monitoring and Observability**
- Health check endpoints
- Connection pool statistics
- Backup file tracking
- Detailed audit logs

## Configuration

All configuration is done via environment variables:

```bash
# Database Configuration
DATABASE_URL=postgresql+psycopg://user:pass@host:5432/dbname

# Persistence Service Configuration
PERSISTENCE_MAX_RETRIES=3              # Number of retry attempts
PERSISTENCE_BASE_DELAY=0.5             # Base delay in seconds
PERSISTENCE_MAX_DELAY=10.0             # Maximum delay in seconds
PERSISTENCE_VERIFICATION=true          # Enable read-back verification
PERSISTENCE_HEALTH_CHECKS=true         # Enable pre-save health checks

# Backup Configuration
BACKUP_DIR=./data/backups              # Directory for backup files

# Application Configuration
PERSIST_DEFAULT=true                   # Persist all CVs by default
```

## Usage

### Normal Operation

The persistence service is used automatically when parsing CVs:

```python
# In parse endpoint
cv_record, error_msg = persistence_service.save_parsed_cv_robust(
    db=db,
    request_id=request_id,
    api_key_id=api_key_id,
    filename=file.filename,
    file_type=file_ext,
    parsed_data=candidate.model_dump(mode='json'),
    fail_on_error=False  # Don't fail parse if save fails
)

if cv_record:
    # Success - CV saved to database
    print(f"CV saved: {cv_record.id}")
else:
    # Failed - check error_msg for details
    print(f"Save failed: {error_msg}")
    # Data is in backup file if error_msg contains backup path
```

### Health Monitoring

Check system health:

```bash
# Basic health check
curl http://localhost:8000/v1/health

# Database health check
curl http://localhost:8000/v1/health/database

# Persistence service health
curl -H "X-API-Key: your-key" http://localhost:8000/v1/health/persistence

# Full system health
curl -H "X-API-Key: your-key" http://localhost:8000/v1/health/full
```

### Backup Recovery

If database saves fail, data is backed up to files. Recover them:

```bash
# List all backup files
python -m app.scripts.recover_from_backup --list

# Recover a specific backup
python -m app.scripts.recover_from_backup --backup-file data/backups/cv_backup_xxx.json

# Recover all backups (dry run first!)
python -m app.scripts.recover_from_backup --all --dry-run

# Actually recover all backups
python -m app.scripts.recover_from_backup --all
```

## Error Handling

### Error Classification

The system classifies errors to determine retry strategy:

| Error Type | Retryable | Description |
|------------|-----------|-------------|
| OperationalError | ✅ Yes | Connection issues, timeouts |
| DatabaseError | ✅ Yes | Generic database errors |
| IntegrityError | ❌ No | Constraint violations |
| DataError | ❌ No | Invalid data format |
| TransactionVerificationError | ✅ Yes | Read-back verification failed |
| Unknown | ❌ No | Unexpected errors |

### Retry Logic

```
Attempt 1: Immediate
  ↓ (fail)
Wait 0.5s
  ↓
Attempt 2: After 0.5s
  ↓ (fail)
Wait 1.0s
  ↓
Attempt 3: After 1.0s
  ↓ (fail)
Create backup file
```

### Response Metadata

CV responses include persistence status:

```json
{
  "candidate": {
    "parsing_metadata": {
      "cv_id": "uuid-here",               // ID if saved
      "persistence_status": "saved",       // "saved" or "failed"
      "persistence_error": null            // Error details if failed
    }
  }
}
```

If save failed:

```json
{
  "candidate": {
    "parsing_metadata": {
      "cv_id": null,
      "persistence_status": "failed",
      "persistence_error": "Database save failed after 3 attempts. Data backed up to: ./data/backups/cv_backup_xxx.json"
    }
  }
}
```

## Monitoring

### Log Messages

The system produces detailed logs:

```
INFO - Attempting to save CV (attempt 1/3): request_id=xxx, filename=resume.pdf
DEBUG - CV record created with ID: yyy
DEBUG - Verifying saved data for CV yyy...
DEBUG - Data verification passed for CV yyy
INFO - ✅ CV saved successfully: cv_id=yyy, request_id=xxx, filename=resume.pdf, attempt=1
```

Or on failure:

```
ERROR - ❌ Save attempt 1 failed: error_type=operational_error, should_retry=True, error=connection timeout
INFO - Retrying after 0.5s delay...
ERROR - Final save failure after 3 attempts: connection timeout
WARNING - CV data backed up to file: ./data/backups/cv_backup_xxx.json
WARNING - ALERT: CV data may be in backup - check backup directory. request_id=xxx
```

### Metrics to Monitor

Monitor these metrics in production:

1. **Save Success Rate**: `saved / (saved + failed)`
2. **Average Retry Count**: How often retries are needed
3. **Backup File Count**: Number of unrecovered backups
4. **Database Health**: Connection pool utilization
5. **Failed Verification Count**: Read-back failures

## Database Schema

The persistence system uses the `ps_parsed_cvs` table:

```sql
CREATE TABLE ps_parsed_cvs (
    id VARCHAR(36) PRIMARY KEY,          -- UUID
    request_id VARCHAR(36) NOT NULL,     -- Request tracking
    api_key_id VARCHAR(36) NOT NULL,     -- API key FK
    filename VARCHAR(500) NOT NULL,      -- Original filename
    file_type VARCHAR(10) NOT NULL,      -- pdf, docx, txt
    parsed_data JSON NOT NULL,           -- Full CV data
    created_at TIMESTAMP NOT NULL        -- Auto timestamp
);

-- Indexes for performance
CREATE INDEX idx_ps_parsed_cvs_request_id ON ps_parsed_cvs(request_id);
CREATE INDEX idx_ps_parsed_cvs_created_at ON ps_parsed_cvs(created_at);
CREATE INDEX idx_ps_parsed_cvs_api_key_created ON ps_parsed_cvs(api_key_id, created_at);
```

## Backup File Format

Backup files are stored as JSON:

```json
{
  "metadata": {
    "request_id": "uuid",
    "api_key_id": "uuid",
    "filename": "resume.pdf",
    "file_type": "pdf",
    "timestamp": "2025-11-30T12:00:00Z"
  },
  "cv_data": {
    "personal_info": { ... },
    "experience": [ ... ],
    "education": [ ... ],
    ...
  },
  "backup_timestamp": "2025-11-30T12:00:01Z",
  "backup_reason": "database_failure_fallback"
}
```

## Disaster Recovery

### Scenario 1: Database Temporarily Unavailable

**What happens:**
1. Health check detects unhealthy database
2. Save is skipped, data goes to backup immediately
3. Parse request succeeds with backup path in metadata

**Recovery:**
1. Wait for database to come back online
2. Run recovery script: `python -m app.scripts.recover_from_backup --all`
3. Backup files are imported to database

### Scenario 2: Database Transaction Fails

**What happens:**
1. Save attempt fails (e.g., connection timeout)
2. Automatic retry after 0.5s
3. If retry succeeds, continue normally
4. If all retries fail, create backup

**Recovery:**
Same as Scenario 1

### Scenario 3: Data Corruption Detected

**What happens:**
1. Save succeeds in database
2. Read-back verification detects hash mismatch
3. Transaction is rolled back
4. Retry with fresh transaction
5. If verification keeps failing, create backup

**Recovery:**
1. Investigate database integrity
2. Fix any corruption issues
3. Recover from backups

## Best Practices

### 1. Monitor Backup Directory

Set up alerts when backup files accumulate:

```bash
# Check backup count
ls -1 data/backups/cv_backup_*.json | wc -l

# Set alert threshold: > 10 backups = problem
```

### 2. Regular Recovery

Schedule regular backup recovery (e.g., hourly):

```bash
# Cron job
0 * * * * cd /app && python -m app.scripts.recover_from_backup --all >> logs/recovery.log 2>&1
```

### 3. Database Health Monitoring

Monitor health endpoint:

```bash
# Check every minute
*/1 * * * * curl -f http://localhost:8000/v1/health/database || alert_ops_team
```

### 4. Connection Pool Monitoring

Watch connection pool utilization:

```bash
# If pool_checked_out / pool_size > 0.8, scale up
curl http://localhost:8000/v1/health/full | jq '.components.connection_pool.details'
```

### 5. Log Analysis

Search logs for persistence issues:

```bash
# Find all failed saves
grep "❌ CV persistence failed" logs/*.log

# Find all backups created
grep "backed up to file" logs/*.log

# Count verification failures
grep "Verification failed" logs/*.log | wc -l
```

## Testing

### Unit Tests

Test persistence service components:

```python
# Test retry logic
def test_retry_exponential_backoff():
    service = PersistenceService(max_retries=3, base_delay=0.1)
    assert service._calculate_backoff_delay(0) == 0.1
    assert service._calculate_backoff_delay(1) == 0.2
    assert service._calculate_backoff_delay(2) == 0.4

# Test error classification
def test_error_classification():
    service = PersistenceService()
    error_type, should_retry = service._classify_error(OperationalError())
    assert error_type == "operational_error"
    assert should_retry == True
```

### Integration Tests

Test end-to-end persistence:

```python
# Test successful save with verification
def test_save_with_verification(db_session):
    service = PersistenceService(enable_verification=True)
    cv_data = {"name": "John Doe", ...}

    cv_record, error = service.save_parsed_cv_robust(
        db=db_session,
        request_id="test-123",
        api_key_id="key-456",
        filename="test.pdf",
        file_type="pdf",
        parsed_data=cv_data,
        fail_on_error=True
    )

    assert cv_record is not None
    assert error is None
    assert cv_record.id is not None

# Test backup creation on failure
def test_backup_on_failure(db_session, monkeypatch):
    # Simulate database failure
    monkeypatch.setattr(db_session, 'commit', lambda: raise_error())

    service = PersistenceService()
    cv_data = {"name": "John Doe", ...}

    cv_record, error = service.save_parsed_cv_robust(
        db=db_session,
        request_id="test-123",
        api_key_id="key-456",
        filename="test.pdf",
        file_type="pdf",
        parsed_data=cv_data,
        fail_on_error=False
    )

    assert cv_record is None
    assert "backed up to" in error
    # Verify backup file exists
```

### Load Testing

Test under high load:

```bash
# Use Apache Bench or similar
ab -n 1000 -c 10 -H "X-API-Key: test" -T "multipart/form-data" \
  http://localhost:8000/v1/parse?persist=true

# Monitor connection pool and save success rate
```

## Troubleshooting

### Issue: High Number of Backups

**Symptoms:**
- Many `.json` files in backup directory
- Logs show repeated save failures

**Diagnosis:**
```bash
# Check database health
curl http://localhost:8000/v1/health/database

# Check connection pool
curl http://localhost:8000/v1/health/full | jq '.components.connection_pool'

# Check recent errors
grep "❌" logs/app.log | tail -20
```

**Solutions:**
1. Database connection issues: Check `DATABASE_URL`, network, credentials
2. Pool exhaustion: Increase `pool_size` and `max_overflow`
3. Database performance: Add indexes, optimize queries
4. Disk space: Check database disk usage

### Issue: Verification Failures

**Symptoms:**
- Logs show "Verification failed: hash mismatch"
- Retries eventually succeed or create backups

**Diagnosis:**
```bash
# Check for data corruption
SELECT id, filename, created_at,
       LENGTH(parsed_data::text) as data_size
FROM ps_parsed_cvs
ORDER BY created_at DESC LIMIT 10;
```

**Solutions:**
1. Database corruption: Run integrity checks
2. Encoding issues: Check character encoding settings
3. JSON serialization: Check for non-serializable data
4. Concurrent modifications: Check for race conditions

### Issue: Slow Saves

**Symptoms:**
- Parse requests take > 5 seconds
- Logs show long commit times

**Diagnosis:**
```bash
# Check database query performance
# Enable SQL logging: set echo=True in database.py

# Check connection pool
curl http://localhost:8000/v1/health/full
```

**Solutions:**
1. Add database indexes
2. Increase connection pool size
3. Optimize JSON field size
4. Use connection pooling proxy (pgBouncer)

## Security Considerations

### 1. Backup File Security

Backup files contain full CV data. Protect them:

```bash
# Set restrictive permissions
chmod 600 data/backups/*.json

# Encrypt backups (optional)
# Use encrypted filesystem or encrypt files individually

# Regular cleanup
find data/backups -name "*.recovered.json" -mtime +7 -delete
```

### 2. Database Security

- Use strong passwords
- Enable SSL/TLS connections
- Restrict database network access
- Regular security updates
- Audit logging enabled

### 3. API Key Protection

- API keys stored as SHA256 hashes
- Never logged in plain text
- Rotate keys regularly
- Revoke compromised keys immediately

## Performance Optimization

### 1. Reduce Verification Overhead

For high-throughput scenarios, disable verification:

```bash
PERSISTENCE_VERIFICATION=false
```

Trade-off: Slightly faster but no read-back guarantee.

### 2. Adjust Retry Strategy

For latency-sensitive applications:

```bash
PERSISTENCE_MAX_RETRIES=1          # Fail fast
PERSISTENCE_BASE_DELAY=0.1         # Shorter delays
```

### 3. Connection Pool Tuning

For high concurrency:

```python
# In database.py
engine = create_engine(
    DATABASE_URL,
    pool_size=20,              # Increase from 10
    max_overflow=40,           # Increase from 20
    pool_timeout=60,           # Increase from 30
)
```

## Conclusion

This robust persistence system provides **enterprise-grade data safety** through:

✅ **Automatic retry** - Handles transient failures
✅ **Verification** - Ensures data integrity
✅ **Fallback** - No data loss even if database fails
✅ **Monitoring** - Full observability
✅ **Recovery** - Easy restoration from backups

**Your CV data is safe and secure!** 🔒
