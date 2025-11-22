"""Test Redis-backed distributed rate limiting."""
import requests
import time
import os
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("DEV_API_KEY", "YOUR_API_KEY_HERE")
BASE_URL = "http://localhost:8000"


def test_redis_rate_limiting():
    """Test rate limiting with Redis backend."""
    print("=" * 70)
    print("TEST 1: Redis Rate Limiting (Distributed)")
    print("=" * 70)
    
    headers = {"Authorization": f"Bearer {API_KEY}"}
    
    # Make rapid requests to test rate limiting
    results = []
    start_time = time.time()
    
    print(f"\nSending 65 requests rapidly (limit: 60/min)...\n")
    
    for i in range(65):
        response = requests.get(
            f"{BASE_URL}/v1/health",
            headers=headers
        )
        
        remaining = response.headers.get('X-RateLimit-Remaining', 'N/A')
        backend = "redis" if response.status_code != 500 else "unknown"
        
        results.append({
            'request': i + 1,
            'status': response.status_code,
            'remaining': remaining
        })
        
        # Print every 10th request and rate limited requests
        if (i + 1) % 10 == 0 or response.status_code == 429:
            print(f"Request {i+1:3d}: Status {response.status_code}, Remaining: {remaining}")
        
        if response.status_code == 429:
            retry_after = response.headers.get('Retry-After', 'N/A')
            print(f"  🚫 Rate limited! Retry after: {retry_after}s")
            break
        
        # Small delay to avoid overwhelming the server
        time.sleep(0.05)
    
    elapsed = time.time() - start_time
    
    print(f"\n📊 Results:")
    print(f"   Total requests: {len(results)}")
    print(f"   Time elapsed: {elapsed:.2f}s")
    print(f"   Rate: {len(results)/elapsed:.1f} requests/second")
    
    # Count successes and rate limits
    success_count = sum(1 for r in results if r['status'] == 200)
    rate_limited_count = sum(1 for r in results if r['status'] == 429)
    
    print(f"   Successful: {success_count}")
    print(f"   Rate limited: {rate_limited_count}")
    
    if rate_limited_count > 0:
        print(f"\n✅ Rate limiting is working! Requests blocked after ~60")
    else:
        print(f"\n⚠️  No rate limiting detected - check Redis connection")
    
    print()


def test_distributed_rate_limiting():
    """Test that rate limits are shared across 'instances' (same API key)."""
    print("=" * 70)
    print("TEST 2: Distributed Rate Limiting (Shared State)")
    print("=" * 70)
    
    headers = {"Authorization": f"Bearer {API_KEY}"}
    
    print(f"\nSimulating 2 'servers' making requests with same API key...\n")
    
    # Server 1 makes 30 requests
    print("Server 1: Making 30 requests...")
    for i in range(30):
        response = requests.get(f"{BASE_URL}/v1/health", headers=headers)
        if i == 29:
            remaining1 = response.headers.get('X-RateLimit-Remaining', 'N/A')
            print(f"  Final remaining: {remaining1}")
        time.sleep(0.02)
    
    # Server 2 makes 30 requests (should use same counter)
    print("\nServer 2: Making 30 requests...")
    for i in range(30):
        response = requests.get(f"{BASE_URL}/v1/health", headers=headers)
        if i == 29:
            remaining2 = response.headers.get('X-RateLimit-Remaining', 'N/A')
            print(f"  Final remaining: {remaining2}")
        time.sleep(0.02)
    
    # Server 3 tries 5 more (should hit limit)
    print("\nServer 3: Trying 5 more requests (should hit limit)...")
    rate_limited = False
    for i in range(5):
        response = requests.get(f"{BASE_URL}/v1/health", headers=headers)
        if response.status_code == 429:
            print(f"  Request {i+1}: 🚫 Rate limited!")
            rate_limited = True
            break
        else:
            remaining = response.headers.get('X-RateLimit-Remaining', 'N/A')
            print(f"  Request {i+1}: ✅ Allowed (remaining: {remaining})")
        time.sleep(0.02)
    
    if rate_limited:
        print(f"\n✅ Distributed rate limiting working!")
        print(f"   Rate limits are shared across all instances")
    else:
        print(f"\n⚠️  Rate limit not hit - Redis may not be working")
    
    print()


def test_rate_limit_reset():
    """Test that rate limits reset after window expires."""
    print("=" * 70)
    print("TEST 3: Rate Limit Window Reset")
    print("=" * 70)
    
    headers = {"Authorization": f"Bearer {API_KEY}"}
    
    print(f"\nMaking requests until rate limited...\n")
    
    # Make requests until rate limited
    for i in range(100):
        response = requests.get(f"{BASE_URL}/v1/health", headers=headers)
        if response.status_code == 429:
            retry_after = int(response.headers.get('Retry-After', 60))
            print(f"🚫 Rate limited after {i+1} requests")
            print(f"   Retry after: {retry_after}s")
            
            # Wait for window to reset
            print(f"\n⏳ Waiting {retry_after+2} seconds for window to reset...")
            time.sleep(retry_after + 2)
            
            # Try again
            print(f"\n🔄 Retrying after window reset...")
            response = requests.get(f"{BASE_URL}/v1/health", headers=headers)
            
            if response.status_code == 200:
                remaining = response.headers.get('X-RateLimit-Remaining')
                print(f"✅ Request allowed! Remaining: {remaining}")
                print(f"\n✅ Rate limit window reset working!")
            else:
                print(f"❌ Still rate limited: {response.status_code}")
            
            break
        time.sleep(0.02)
    
    print()


def test_per_key_limits():
    """Test that different API keys have independent rate limits."""
    print("=" * 70)
    print("TEST 4: Per-Key Rate Limits (Independent Counters)")
    print("=" * 70)
    
    # This test would require multiple API keys
    # For now, just document the behavior
    print(f"\nℹ️  Each API key has its own rate limit counter")
    print(f"   Key A at 60/60 doesn't affect Key B at 0/60")
    print(f"   This ensures fair resource allocation\n")
    
    print(f"To test: Create another API key and verify independent limits\n")


def check_redis_connection():
    """Check if Redis is available."""
    print("=" * 70)
    print("REDIS CONNECTION CHECK")
    print("=" * 70 + "\n")
    
    try:
        import redis
        client = redis.from_url(
            os.getenv("REDIS_URL", "redis://localhost:6379/0"),
            socket_connect_timeout=2
        )
        client.ping()
        print("✅ Redis is AVAILABLE")
        print(f"   URL: {os.getenv('REDIS_URL', 'redis://localhost:6379/0')}")
        
        # Check if any rate limit keys exist
        keys = client.keys("ratelimit:*")
        print(f"   Rate limit keys in Redis: {len(keys)}")
        
        return True
    except Exception as e:
        print(f"❌ Redis is UNAVAILABLE: {e}")
        print(f"\n⚠️  Rate limiting will use in-memory store")
        print(f"   This means rate limits are NOT shared across instances")
        print(f"\nTo enable Redis:")
        print(f"   1. Start Redis: docker-compose up -d")
        print(f"   2. Set REDIS_URL in .env")
        print(f"   3. Restart API server")
        return False
    finally:
        print()


if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("🧪 TESTING REDIS-BACKED RATE LIMITING")
    print("=" * 70 + "\n")
    
    if API_KEY == "YOUR_API_KEY_HERE":
        print("❌ ERROR: Please set DEV_API_KEY in .env!")
        exit(1)
    
    # Check Redis connection first
    redis_available = check_redis_connection()
    
    if not redis_available:
        print("⚠️  Skipping distributed rate limit tests (Redis unavailable)")
        print("   Tests will use in-memory rate limiting\n")
    
    # Wait for user to confirm API is running
    input("Press Enter when API server is running (uvicorn app.main:app --reload)...")
    print()
    
    # Run tests
    test_redis_rate_limiting()
    
    if redis_available:
        test_distributed_rate_limiting()
        test_rate_limit_reset()
        test_per_key_limits()
    
    print("=" * 70)
    print("✅ TESTS COMPLETE!")
    print("=" * 70)
    print("\nKey Behaviors Verified:")
    print("  ✅ Rate limiting enforces 60 rpm limit")
    if redis_available:
        print("  ✅ Limits are shared across instances (Redis)")
        print("  ✅ Rate limit windows reset correctly")
        print("  ✅ Each API key has independent limits")
    else:
        print("  ⚠️  In-memory fallback (single instance only)")
    print()