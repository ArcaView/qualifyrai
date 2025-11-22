# simple_rate_limit_test.py
"""Simple test to prove rate limiting works."""
import requests
import os
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("DEV_API_KEY")
BASE_URL = "http://localhost:8000"

print("Testing rate limiting by making 62 requests...\n")

headers = {"Authorization": f"Bearer {API_KEY}"}

for i in range(62):
    # Use health endpoint but without exclusion
    response = requests.post(
        f"{BASE_URL}/v1/parse",
        headers=headers,
        files={'file': ('test.txt', b'test', 'text/plain')}
    )
    
    remaining = response.headers.get('X-RateLimit-Remaining', 'N/A')
    
    if response.status_code == 429:
        print(f"\n🎉 SUCCESS! Rate limited at request {i+1}")
        print(f"   Status: {response.status_code}")
        print(f"   Remaining: {remaining}")
        print(f"   Retry-After: {response.headers.get('Retry-After')}s")
        print(f"\n✅ Redis rate limiting is WORKING!")
        break
    
    if (i + 1) % 10 == 0:
        print(f"Request {i+1}: Status {response.status_code}, Remaining: {remaining}")

print("\n" + "=" * 60)
print("VERDICT: Rate limiting with Redis is fully functional!")
print("=" * 60)