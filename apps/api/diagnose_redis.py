"""Diagnostic script to check Redis rate limiting setup."""
import os
import sys
from dotenv import load_dotenv

load_dotenv()

print("=" * 70)
print("REDIS RATE LIMITING DIAGNOSTIC")
print("=" * 70 + "\n")

# Check 1: Environment variables
print("1️⃣  Environment Variables")
print("-" * 70)
redis_url = os.getenv("REDIS_URL")
print(f"   REDIS_URL: {redis_url}")
print(f"   API_RATE_RPM: {os.getenv('API_RATE_RPM', '60')}")
print(f"   API_RATE_BURST: {os.getenv('API_RATE_BURST', '120')}")
print()

# Check 2: Redis connection
print("2️⃣  Redis Connection")
print("-" * 70)
try:
    import redis
    client = redis.from_url(redis_url or "redis://localhost:6379/0", socket_connect_timeout=2)
    client.ping()
    print("   ✅ Redis is reachable")
    
    # Check for rate limit keys
    keys = client.keys("ratelimit:*")
    print(f"   Rate limit keys: {len(keys)}")
    if keys:
        print(f"   Sample keys: {keys[:3]}")
except Exception as e:
    print(f"   ❌ Redis connection failed: {e}")
print()

# Check 3: App imports
print("3️⃣  Application Imports")
print("-" * 70)
try:
    from app.redis_client import redis_client
    print("   ✅ redis_client imported")
    print(f"   Redis enabled: {redis_client.enabled}")
    print(f"   Redis available: {redis_client.is_available()}")
except Exception as e:
    print(f"   ❌ Failed to import redis_client: {e}")

try:
    from app.middleware.rate_limit import rate_limiter, RateLimitMiddleware
    print("   ✅ rate_limiter imported")
    print(f"   Using Redis: {rate_limiter.using_redis}")
    print(f"   RPM limit: {rate_limiter.rpm}")
except Exception as e:
    print(f"   ❌ Failed to import rate_limiter: {e}")

try:
    from app.main import app
    print("   ✅ app imported")
    
    # Check middleware
    print("\n   Middleware stack:")
    for i, middleware in enumerate(app.user_middleware):
        print(f"     {i+1}. {middleware.cls.__name__}")
        if middleware.cls.__name__ == "RateLimitMiddleware":
            print("        ✅ RateLimitMiddleware is registered!")
    
except Exception as e:
    print(f"   ❌ Failed to import app: {e}")
print()

# Check 4: Test rate limiter directly
print("4️⃣  Direct Rate Limiter Test")
print("-" * 70)
try:
    from app.middleware.rate_limit import rate_limiter
    
    test_key = "test:diagnostic:key"
    
    print(f"   Testing with key: {test_key}")
    for i in range(5):
        allowed, retry_after, remaining = rate_limiter.check_rate_limit(test_key)
        print(f"   Request {i+1}: allowed={allowed}, remaining={remaining}")
        
        if not allowed:
            print(f"   ✅ Rate limiting is working! (retry_after={retry_after}s)")
            break
    else:
        print(f"   ⚠️  All 5 requests allowed - rate limiter may not be working")
        
except Exception as e:
    print(f"   ❌ Rate limiter test failed: {e}")
    import traceback
    traceback.print_exc()
print()

# Check 5: File locations
print("5️⃣  File Check")
print("-" * 70)
files_to_check = [
    "app/redis_client.py",
    "app/middleware/rate_limit.py",
    "app/main.py",
    ".env"
]

for filepath in files_to_check:
    if os.path.exists(filepath):
        size = os.path.getsize(filepath)
        print(f"   ✅ {filepath} ({size:,} bytes)")
    else:
        print(f"   ❌ {filepath} NOT FOUND")
print()

print("=" * 70)
print("RECOMMENDATIONS")
print("=" * 70)
print()

# Provide recommendations based on findings
if not redis_url:
    print("❌ REDIS_URL not set in .env")
    print("   Add: REDIS_URL=redis://localhost:6379/0")
    print()

try:
    from app.middleware.rate_limit import rate_limiter
    if not rate_limiter.using_redis:
        print("⚠️  Rate limiter is NOT using Redis")
        print("   Possible causes:")
        print("   1. Redis connection failed during startup")
        print("   2. REDIS_URL not configured")
        print("   3. Redis service not running")
        print()
        print("   Try: docker-compose ps")
        print()
except:
    pass

print("Next steps:")
print("1. Check the output above for any ❌ errors")
print("2. Restart your API server (uvicorn app.main:app --reload)")
print("3. Look for these lines in the startup logs:")
print("   ✅ Redis connected: redis://localhost:6379/0")
print("   ✅ Rate limiter using Redis (distributed)")
print()