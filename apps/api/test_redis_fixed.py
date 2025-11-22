"""Test Redis rate limiting on actual API endpoints (not health check)."""
import requests
import time
import os
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("DEV_API_KEY", "YOUR_API_KEY_HERE")
BASE_URL = "http://localhost:8000"


def check_setup():
    """Check if Redis and API are properly configured."""
    print("=" * 70)
    print("SETUP CHECK")
    print("=" * 70 + "\n")
    
    # Check Redis
    try:
        import redis
        client = redis.from_url(
            os.getenv("REDIS_URL", "redis://localhost:6379/0"),
            socket_connect_timeout=2
        )
        client.ping()
        print("✅ Redis is running")
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        print("   Run: docker-compose up -d")
        return False
    
    # Check API
    try:
        response = requests.get(f"{BASE_URL}/", timeout=2)
        print("✅ API is running")
    except Exception as e:
        print(f"❌ API connection failed: {e}")
        print("   Run: uvicorn app.main:app --reload")
        return False
    
    # Check API key
    if API_KEY == "YOUR_API_KEY_HERE":
        print("❌ API key not configured")
        print("   Set DEV_API_KEY in .env")
        return False
    
    print(f"✅ API key configured\n")
    return True


def test_rate_limiting_on_parse():
    """Test rate limiting on /v1/parse endpoint (not excluded)."""
    print("=" * 70)
    print("TEST: Rate Limiting on /v1/parse Endpoint")
    print("=" * 70 + "\n")
    
    print("NOTE: /v1/health is EXCLUDED from rate limiting")
    print("      Testing on /v1/parse which IS rate limited\n")
    
    headers = {"Authorization": f"Bearer {API_KEY}"}
    
    # Create a tiny test file
    test_content = b"John Doe\njohn@example.com\nSoftware Engineer"
    files = {'file': ('test.txt', test_content, 'text/plain')}
    
    print("Sending 65 parse requests rapidly...\n")
    
    results = []
    start_time = time.time()
    
    for i in range(65):
        try:
            # Note: We need to recreate the files dict each time
            files = {'file': ('test.txt', test_content, 'text/plain')}
            
            response = requests.post(
                f"{BASE_URL}/v1/parse",
                headers=headers,
                files=files,
                timeout=5
            )
            
            remaining = response.headers.get('X-RateLimit-Remaining', 'N/A')
            limit = response.headers.get('X-RateLimit-Limit', 'N/A')
            
            results.append({
                'request': i + 1,
                'status': response.status_code,
                'remaining': remaining,
                'limit': limit
            })
            
            # Print every 10th request and rate limited requests
            if (i + 1) % 10 == 0:
                print(f"Request {i+1:3d}: Status {response.status_code}, "
                      f"Limit: {limit}, Remaining: {remaining}")
            
            if response.status_code == 429:
                retry_after = response.headers.get('Retry-After', 'N/A')
                print(f"\n🚫 Rate limited at request {i+1}!")
                print(f"   Retry-After: {retry_after}s")
                print(f"   Limit: {limit}")
                print(f"   Remaining: {remaining}")
                break
                
        except Exception as e:
            print(f"Request {i+1} failed: {e}")
            break
        
        time.sleep(0.05)  # Small delay to not overwhelm
    
    elapsed = time.time() - start_time
    
    print(f"\n📊 Results:")
    print(f"   Total requests: {len(results)}")
    print(f"   Time elapsed: {elapsed:.2f}s")
    print(f"   Rate: {len(results)/elapsed:.1f} requests/second")
    
    # Count successes and rate limits
    success_count = sum(1 for r in results if r['status'] == 200)
    rate_limited_count = sum(1 for r in results if r['status'] == 429)
    
    print(f"   Successful (200): {success_count}")
    print(f"   Rate limited (429): {rate_limited_count}")
    
    # Check if headers are present
    has_headers = any(r['remaining'] != 'N/A' for r in results)
    
    if not has_headers:
        print(f"\n❌ PROBLEM: No rate limit headers found!")
        print(f"   This means the middleware isn't running")
        print(f"\n   Troubleshooting steps:")
        print(f"   1. Check app/middleware/rate_limit.py exists")
        print(f"   2. Check app/main.py has: app.add_middleware(RateLimitMiddleware)")
        print(f"   3. Restart API server")
        print(f"   4. Run: python diagnose_redis.py")
        return False
    
    if rate_limited_count > 0:
        print(f"\n✅ Rate limiting is WORKING!")
        print(f"   Requests were blocked after ~{success_count}")
        return True
    else:
        print(f"\n⚠️  Rate limiting headers present but no 429 responses")
        print(f"   Headers found: Limit={results[0]['limit']}, Remaining={results[0]['remaining']}")
        if results[0]['limit'] == 'N/A':
            print(f"   But headers show 'N/A' - middleware may not be working")
        else:
            print(f"   The limit might be higher than {len(results)} requests")
        return False


def test_simple_endpoint():
    """Test a simple endpoint to check if headers are present."""
    print("\n" + "=" * 70)
    print("TEST: Check Rate Limit Headers")
    print("=" * 70 + "\n")
    
    headers = {"Authorization": f"Bearer {API_KEY}"}
    
    print("Making 3 test requests to check headers...\n")
    
    # Create a tiny test file
    test_content = b"Test"
    
    for i in range(3):
        files = {'file': ('test.txt', test_content, 'text/plain')}
        
        response = requests.post(
            f"{BASE_URL}/v1/parse",
            headers=headers,
            files=files
        )
        
        print(f"Request {i+1}:")
        print(f"  Status: {response.status_code}")
        print(f"  X-RateLimit-Limit: {response.headers.get('X-RateLimit-Limit', 'MISSING')}")
        print(f"  X-RateLimit-Remaining: {response.headers.get('X-RateLimit-Remaining', 'MISSING')}")
        print(f"  X-RateLimit-Reset: {response.headers.get('X-RateLimit-Reset', 'MISSING')}")
        print()
        
        if response.headers.get('X-RateLimit-Limit') == None:
            print("❌ Rate limit headers are MISSING!")
            print("   The middleware is not running.\n")
            return False
        
        time.sleep(0.1)
    
    print("✅ Rate limit headers are present!")
    return True


if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("🧪 REDIS RATE LIMITING TEST (FIXED)")
    print("=" * 70 + "\n")
    
    if not check_setup():
        print("\n❌ Setup incomplete. Fix the issues above and try again.\n")
        exit(1)
    
    # First check if headers are present
    has_headers = test_simple_endpoint()
    
    if not has_headers:
        print("\n" + "=" * 70)
        print("NEXT STEPS:")
        print("=" * 70)
        print("\n1. Run the diagnostic:")
        print("   python diagnose_redis.py")
        print("\n2. Check your app/main.py has this line:")
        print("   from app.middleware.rate_limit import RateLimitMiddleware")
        print("   app.add_middleware(RateLimitMiddleware)")
        print("\n3. Restart your API server")
        print("   uvicorn app.main:app --reload")
        print("\n4. Check startup logs for:")
        print("   ✅ Rate limiter using Redis (distributed)")
        print()
        exit(1)
    
    # If headers are present, test actual rate limiting
    print("\nHeaders are present! Now testing rate limiting enforcement...\n")
    input("Press Enter to start rate limit test (will make 65 requests)...")
    print()
    
    success = test_rate_limiting_on_parse()
    
    if success:
        print("\n" + "=" * 70)
        print("✅ ALL TESTS PASSED!")
        print("=" * 70)
        print("\nRedis-backed rate limiting is working correctly! 🎉")
        print("You can now deploy to production with confidence.\n")
    else:
        print("\n" + "=" * 70)
        print("⚠️  TESTS INCOMPLETE")
        print("=" * 70)
        print("\nSome issues detected. Run diagnose_redis.py for details.\n")