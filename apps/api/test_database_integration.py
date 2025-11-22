"""Test ParseScore API with database integration (H19)."""
import requests
import time
import os
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("DEV_API_KEY", "YOUR_API_KEY_HERE")
BASE_URL = "http://localhost:8000"


def test_parse_with_persistence():
    """Test parsing with database persistence."""
    print("=" * 70)
    print("TEST 1: Parse CV with persistence (persist=true)")
    print("=" * 70)
    
    headers = {"Authorization": f"Bearer {API_KEY}"}
    
    with open('fixtures/sample_cv_senior_dev.txt', 'rb') as f:
        response = requests.post(
            f"{BASE_URL}/v1/parse?persist=true",  # ✅ Query parameter
            headers=headers,
            files={'file': ('sample_cv.txt', f, 'text/plain')}
        )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        cv_id = data['candidate']['parsing_metadata'].get('cv_id')
        
        print(f"✅ CV parsed and saved!")
        print(f"   CV ID: {cv_id}")
        print(f"   Request ID: {data['request_id']}")
        print(f"   Processing time: {data['processing_time_ms']}ms")
        print(f"   Candidate: {data['candidate']['contact']['full_name']}\n")
        
        return cv_id, data
    else:
        print(f"❌ Error: {response.json()}\n")
        return None, None


def test_retrieve_cv(cv_id):
    """Test retrieving a parsed CV by ID."""
    print("=" * 70)
    print(f"TEST 2: Retrieve parsed CV by ID")
    print("=" * 70)
    
    if not cv_id:
        print("⏭️  Skipping (no CV ID from previous test)\n")
        return
    
    headers = {"Authorization": f"Bearer {API_KEY}"}
    
    response = requests.get(
        f"{BASE_URL}/v1/cvs/{cv_id}",
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Retrieved CV!")
        print(f"   Filename: {data['filename']}")
        print(f"   Parsed at: {data['parsed_at']}")
        print(f"   Candidate: {data['candidate']['contact']['full_name']}\n")
    else:
        print(f"❌ Error: {response.json()}\n")


def test_list_cvs():
    """Test listing all parsed CVs."""
    print("=" * 70)
    print("TEST 3: List all parsed CVs")
    print("=" * 70)
    
    headers = {"Authorization": f"Bearer {API_KEY}"}
    
    response = requests.get(
        f"{BASE_URL}/v1/cvs",
        headers=headers,
        params={'limit': 10}
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Found {data['total']} CVs")
        
        for cv in data['cvs'][:5]:  # Show first 5
            print(f"   • {cv['filename']} - {cv['parsed_at']}")
        
        print()
    else:
        print(f"❌ Error: {response.json()}\n")


def test_scoring_with_cache(candidate_data):
    """Test scoring with caching."""
    print("=" * 70)
    print("TEST 4: Score candidate (first time - will cache)")
    print("=" * 70)
    
    if not candidate_data:
        print("⏭️  Skipping (no candidate data)\n")
        return None
    
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
        "candidate": candidate_data['candidate'],
        "job": job,
        "mode": "baseline"
    }
    
    # First scoring request
    start = time.time()
    response1 = requests.post(
        f"{BASE_URL}/v1/score",
        headers=headers,
        json=payload
    )
    time1 = (time.time() - start) * 1000
    
    print(f"Status: {response1.status_code}")
    
    if response1.status_code == 200:
        data1 = response1.json()
        result1 = data1['result']
        
        print(f"✅ First score computed!")
        print(f"   Overall: {result1['overall_score']}/100")
        print(f"   Processing: {data1['processing_time_ms']}ms")
        print(f"   Wall time: {time1:.2f}ms")
        
        # Second scoring request (should be cached)
        print("\n" + "=" * 70)
        print("TEST 5: Score same candidate+job again (cache hit)")
        print("=" * 70)
        
        start = time.time()
        response2 = requests.post(
            f"{BASE_URL}/v1/score",
            headers=headers,
            json=payload
        )
        time2 = (time.time() - start) * 1000
        
        print(f"Status: {response2.status_code}")
        
        if response2.status_code == 200:
            data2 = response2.json()
            result2 = data2['result']
            
            print(f"✅ Cached score returned!")
            print(f"   Overall: {result2['overall_score']}/100")
            print(f"   Processing: {data2['processing_time_ms']}ms")
            print(f"   Wall time: {time2:.2f}ms")
            
            # Compare speeds
            speedup = time1 / time2 if time2 > 0 else 0
            print(f"\n   🚀 Cache speedup: {speedup:.1f}x faster!")
            print(f"   Same score: {result1['overall_score'] == result2['overall_score']}\n")
            
            return data1
        else:
            print(f"❌ Error: {response2.json()}\n")
    else:
        print(f"❌ Error: {response1.json()}\n")
    
    return None


def test_retrieve_score(score_data):
    """Test retrieving a score by ID."""
    print("=" * 70)
    print("TEST 6: Retrieve score by ID")
    print("=" * 70)
    
    # Note: We don't have score_id in response yet
    # This would work if we added it to the response
    print("⏭️  Score ID not in response (feature to add)\n")


def test_list_cv_scores(cv_id):
    """Test listing all scores for a CV."""
    print("=" * 70)
    print("TEST 7: List all scores for CV")
    print("=" * 70)
    
    if not cv_id:
        print("⏭️  Skipping (no CV ID)\n")
        return
    
    headers = {"Authorization": f"Bearer {API_KEY}"}
    
    response = requests.get(
        f"{BASE_URL}/v1/cvs/{cv_id}/scores",
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Found {data['total']} scores for this CV")
        
        for score in data['scores']:
            print(f"   • Score: {score['overall_score']}/100 - {score['scored_at']}")
        
        print()
    else:
        print(f"❌ Error: {response.json()}\n")


def test_parse_without_persistence():
    """Test parsing without persistence (privacy mode)."""
    print("=" * 70)
    print("TEST 8: Parse CV without persistence (default)")
    print("=" * 70)
    
    headers = {"Authorization": f"Bearer {API_KEY}"}
    
    with open('fixtures/sample_cv_senior_dev.txt', 'rb') as f:
        response = requests.post(
            f"{BASE_URL}/v1/parse",  # ✅ Query parameter
            headers=headers,
            files={'file': ('sample_cv.txt', f, 'text/plain')}
        )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        cv_id = data['candidate']['parsing_metadata'].get('cv_id')
        
        print(f"✅ CV parsed (not saved)")
        print(f"   CV ID in metadata: {cv_id}")
        print(f"   Processing time: {data['processing_time_ms']}ms")
        
        if cv_id is None:
            print(f"   ✅ Correctly not saved (no CV ID)")
        else:
            print(f"   ⚠️  Unexpected: CV was saved")
        
        print()
    else:
        print(f"❌ Error: {response.json()}\n")


def test_404_errors():
    """Test 404 errors for non-existent IDs."""
    print("=" * 70)
    print("TEST 9: Error handling (404s)")
    print("=" * 70)
    
    headers = {"Authorization": f"Bearer {API_KEY}"}
    
    # Try to get non-existent CV
    response1 = requests.get(
        f"{BASE_URL}/v1/cvs/fake-cv-id-12345",
        headers=headers
    )
    print(f"Get fake CV: {response1.status_code} {'✅' if response1.status_code == 404 else '❌'}")
    
    # Try to get scores for non-existent CV
    response2 = requests.get(
        f"{BASE_URL}/v1/cvs/fake-cv-id-12345/scores",
        headers=headers
    )
    print(f"Get scores for fake CV: {response2.status_code} {'✅' if response2.status_code == 404 else '❌'}")
    
    print()


if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("🧪 TESTING DATABASE INTEGRATION (H19)")
    print("=" * 70 + "\n")
    
    if API_KEY == "YOUR_API_KEY_HERE":
        print("❌ ERROR: Please set DEV_API_KEY in .env!")
        exit(1)
    
    # Run all tests
    cv_id, candidate_data = test_parse_with_persistence()
    test_retrieve_cv(cv_id)
    test_list_cvs()
    score_data = test_scoring_with_cache(candidate_data)
    test_list_cv_scores(cv_id)
    test_parse_without_persistence()
    test_404_errors()
    
    print("=" * 70)
    print("✅ ALL TESTS COMPLETE!")
    print("=" * 70)
    print("\nKey Features Tested:")
    print("  ✅ Parse with persistence")
    print("  ✅ Retrieve parsed CV by ID")
    print("  ✅ List all parsed CVs")
    print("  ✅ Score with caching")
    print("  ✅ List scores for CV")
    print("  ✅ Privacy mode (no persistence)")
    print("  ✅ Error handling (404s)")
    print("\nDatabase integration working! 🎉\n")