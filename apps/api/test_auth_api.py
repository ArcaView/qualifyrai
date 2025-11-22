"""Test ParseScore API with authentication and rate limiting."""
import requests
import time
import os
from dotenv import load_dotenv

# IMPORTANT: Get your API key from the server startup logs
# Look for: "🔑 Development API Key: ps_..."
load_dotenv()
API_KEY = os.getenv("DEV_API_KEY", "YOUR_API_KEY_HERE")

BASE_URL = "http://localhost:8000"


def test_without_auth():
    """Test that endpoints require authentication."""
    print("=" * 60)
    print("TEST 1: Request without API key (should fail)")
    print("=" * 60)
    
    response = requests.get(f"{BASE_URL}/v1/health")
    print(f"Health check (no auth required): {response.status_code}")
    
    with open('fixtures/sample_cv_senior_dev.txt', 'rb') as f:
        response = requests.post(
            f"{BASE_URL}/v1/parse",
            files={'file': ('sample_cv.txt', f, 'text/plain')}
        )
    
    print(f"Parse without auth: {response.status_code}")
    print(f"Response: {response.json()}\n")


def test_with_auth():
    """Test endpoints with valid API key."""
    print("=" * 60)
    print("TEST 2: Request with valid API key (should work)")
    print("=" * 60)
    
    headers = {"Authorization": f"Bearer {API_KEY}"}
    
    # Test parse
    with open('fixtures/sample_cv_senior_dev.txt', 'rb') as f:
        response = requests.post(
            f"{BASE_URL}/v1/parse",
            headers=headers,
            files={'file': ('sample_cv.txt', f, 'text/plain')}
        )
    
    print(f"Parse with auth: {response.status_code}")
    print(f"Rate limit headers:")
    print(f"  X-RateLimit-Limit: {response.headers.get('X-RateLimit-Limit')}")
    print(f"  X-RateLimit-Remaining: {response.headers.get('X-RateLimit-Remaining')}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"  Request ID: {data.get('request_id')}")
        print(f"  Processing time: {data.get('processing_time_ms')}ms")
        print(f"  Candidate name: {data['candidate']['contact']['full_name']}\n")
            # ADD THIS DEBUG SECTION:
        print(f"\n  📋 Parsed Work Experience ({len(data['candidate']['work_experience'])} entries):")
        for i, work in enumerate(data['candidate']['work_experience'], 1):
            print(f"    {i}. {work['title']} at {work['employer']}")
            print(f"       {work.get('start_date', 'N/A')} to {work.get('end_date', 'Present')}")
            print(f"       Duration: {work.get('duration_months', 0)} months")
        
        print(f"\n  🎯 Parsed Skills ({len(data['candidate']['skills'])} found):")
        skill_names = [s['name'] for s in data['candidate']['skills'][:10]]
        print(f"    {', '.join(skill_names)}")
        
        print()
        return data
    else:
        print(f"Error: {response.json()}\n")
        return None


def test_rate_limiting():
    """Test rate limiting (60 rpm = 1 per second)."""
    print("=" * 60)
    print("TEST 3: Rate limiting (sending requests rapidly)")
    print("=" * 60)
    
    headers = {"Authorization": f"Bearer {API_KEY}"}
    
    for i in range(5):
        response = requests.get(
            f"{BASE_URL}/v1/health",
            headers=headers
        )
        
        remaining = response.headers.get('X-RateLimit-Remaining', 'N/A')
        print(f"Request {i+1}: Status {response.status_code}, Remaining: {remaining}")
        
        if response.status_code == 429:
            retry_after = response.headers.get('Retry-After')
            print(f"  Rate limited! Retry after: {retry_after}s")
            print(f"  Response: {response.json()}")
            break
        
        time.sleep(0.1)  # Send quickly to test burst limit
    
    print()


def test_score_endpoint(parsed_data):
    """Test the score endpoint."""
    print("=" * 60)
    print("TEST 4: Score endpoint")
    print("=" * 60)
    
    headers = {"Authorization": f"Bearer {API_KEY}"}
    
    job = {
        "title": "Senior Python Developer",
        "description": "Looking for experienced Python developer",
        "required_skills": ["python", "fastapi", "postgresql", "aws"],
        "preferred_skills": ["kubernetes", "docker", "react"],
        "min_years_experience": 5.0,
        "min_education": "bachelors"
    }
    
    payload = {
        "candidate": parsed_data['candidate'],
        "job": job,
        "mode": "baseline"
    }
    
    response = requests.post(
        f"{BASE_URL}/v1/score",
        headers=headers,
        json=payload
    )
    
    print(f"Score response: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        result = data['result']
        print(f"  Overall score: {result['overall_score']}/100")
        print(f"  Skills: {result['breakdown']['skills_score']}")
        print(f"  Experience: {result['breakdown']['experience_score']}")
        print(f"  Education: {result['breakdown']['education_score']}")
        print(f"  Flags: {len(result['flags'])} risk flags")
        for flag in result['flags']:
            print(f"    - [{flag['severity']}] {flag['description']}")
    else:
        print(f"Error: {response.json()}")
    
    print()


if __name__ == "__main__":
    print("\n🧪 Testing ParseScore API with Auth & Rate Limiting\n")
    
    if API_KEY == "YOUR_API_KEY_HERE":
        print("❌ ERROR: Please set API_KEY in this script!")
        print("   Look for the API key in your server startup logs")
        print('   It looks like: ps_...')
        exit(1)
    
    # Run tests
    test_without_auth()
    parsed = test_with_auth()
    test_rate_limiting()
    
    if parsed:
        test_score_endpoint(parsed)
    
    print("✅ All tests complete!")
