# Debugging CV Persistence Issues

## Problem
CVs are being parsed successfully but not saving to the database.

## Solutions Applied

### 1. Enabled Default Persistence
Added to `.env`:
```
PERSIST_DEFAULT=true
```

### 2. Fixed Database Port
Changed from pooler port 6543 to direct port 5432.

## How to Fix

### Step 1: Restart the API Server
```bash
cd /path/to/qualifyrai/apps/api
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Step 2: Check API Logs
Look for these messages when parsing a CV:
- ✅ Success: `CV saved to database with ID: <uuid>`
- ❌ Error: `FAILED to save CV to database: <error>`

### Step 3: Verify in Supabase
Run this query in Supabase SQL Editor:
```sql
SELECT id, filename, created_at 
FROM ps_parsed_cvs 
ORDER BY created_at DESC 
LIMIT 10;
```

## Common Issues

1. **API not restarted** - New .env values won't load until restart
2. **Database tables missing** - Run `python -c "from app.database import init_db; init_db()"`
3. **Network issues** - Verify Supabase project is active
4. **Wrong API key** - Ensure same key in both .env files

## Quick Test
```bash
# From apps/api directory:
python -c "
from dotenv import load_dotenv
load_dotenv()
import os
print(f'PERSIST_DEFAULT = {os.getenv(\"PERSIST_DEFAULT\", \"false\")}')
print(f'DATABASE_URL = {os.getenv(\"DATABASE_URL\", \"NOT SET\")[:50]}...')
"
```
