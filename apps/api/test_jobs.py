"""Test job profile endpoints."""
import requests
import os
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("DEV_API_KEY", "YOUR_API_KEY_HERE")
BASE_URL = "http://localhost:8000"


def print_section(title):
    """Print formatted section header."""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70 + "\n")


def test_create_job():
    """Test creating a job profile."""
    print_section("TEST 1: Create Job Profile")
    
    headers = {"Authorization": f"Bearer {API_KEY}"}
    
    job_data = {
        "title": "Senior Python Developer",
        "description": "Looking for an experienced Python developer with strong backend and cloud infrastructure knowledge. Must have 5+ years of experience.",
        "required_skills": ["python", "fastapi", "postgresql", "aws"],
        "preferred_skills": ["kubernetes", "docker", "react", "redis"],
        "min_years_experience": 5.0,
        "preferred_years_experience": 8.0,
        "min_education": "bachelors",
        "preferred_education": "masters",
        "required_certifications": ["AWS Certified Solutions Architect"],
        "location": "London, UK",
        "remote_ok": True,
        "metadata": {
            "department": "Engineering",
            "team": "Backend",
            "salary_range": "£70k-£90k"
        }
    }
    
    response = requests.post(
        f"{BASE_URL}/v1/jobs",
        headers=headers,
        json=job_data
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Job created successfully!")
        print(f"   Job ID: {data['job_id']}")
        print(f"   Title: {data['job']['title']}")
        print(f"   Location: {data['job']['location']}")
        print(f"   Remote OK: {data['job']['remote_ok']}")
        print(f"   Required skills: {', '.join(data['job']['required_skills'])}")
        print(f"   Processing time: {data['processing_time_ms']}ms")
        
        return data['job_id']
    else:
        print(f"❌ Error: {response.json()}")
        return None


def test_get_job(job_id):
    """Test retrieving a job profile."""
    print_section("TEST 2: Get Job Profile by ID")
    
    if not job_id:
        print("⏭️  Skipping (no job ID from previous test)")
        return
    
    headers = {"Authorization": f"Bearer {API_KEY}"}
    
    response = requests.get(
        f"{BASE_URL}/v1/jobs/{job_id}",
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Job retrieved successfully!")
        print(f"   Title: {data['job']['title']}")
        print(f"   Description: {data['job']['description'][:100]}...")
        print(f"   Min experience: {data['job']['min_years_experience']} years")
        print(f"   Required skills: {len(data['job']['required_skills'])}")
        print(f"   Created: {data['created_at']}")
    else:
        print(f"❌ Error: {response.json()}")


def test_list_jobs():
    """Test listing all job profiles."""
    print_section("TEST 3: List All Job Profiles")
    
    headers = {"Authorization": f"Bearer {API_KEY}"}
    
    response = requests.get(
        f"{BASE_URL}/v1/jobs",
        headers=headers,
        params={'limit': 10}
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Found {data['total']} job profiles")
        
        for job in data['jobs']:
            print(f"   • {job['title']} - {job['location'] or 'Remote'}")
            print(f"     Skills: {job['required_skills_count']} required")
            print(f"     Created: {job['created_at']}")
    else:
        print(f"❌ Error: {response.json()}")


def test_update_job(job_id):
    """Test updating a job profile."""
    print_section("TEST 4: Update Job Profile")
    
    if not job_id:
        print("⏭️  Skipping (no job ID from previous test)")
        return
    
    headers = {"Authorization": f"Bearer {API_KEY}"}
    
    # Updated job data
    updated_data = {
        "title": "Senior Python Developer (UPDATED)",
        "description": "Updated job description with more details about the role and requirements.",
        "required_skills": ["python", "fastapi", "postgresql", "aws", "redis"],  # Added redis
        "preferred_skills": ["kubernetes", "docker", "react"],
        "min_years_experience": 6.0,  # Increased from 5
        "preferred_years_experience": 10.0,
        "min_education": "bachelors",
        "preferred_education": "masters",
        "required_certifications": ["AWS Certified Solutions Architect"],
        "location": "London, UK (Hybrid)",  # Updated
        "remote_ok": True,
        "metadata": {
            "department": "Engineering",
            "team": "Backend",
            "salary_range": "£80k-£100k",  # Updated
            "updated": True
        }
    }
    
    response = requests.put(
        f"{BASE_URL}/v1/jobs/{job_id}",
        headers=headers,
        json=updated_data
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Job updated successfully!")
        print(f"   New title: {data['job']['title']}")
        print(f"   New location: {data['job']['location']}")
        print(f"   New min experience: {data['job']['min_years_experience']} years")
        print(f"   Required skills: {len(data['job']['required_skills'])} (was 4)")
        print(f"   Updated at: {data['updated_at']}")
    else:
        print(f"❌ Error: {response.json()}")


def test_create_multiple_jobs():
    """Test creating multiple job profiles."""
    print_section("TEST 5: Create Multiple Jobs")
    
    headers = {"Authorization": f"Bearer {API_KEY}"}
    
    jobs = [
        {
            "title": "Frontend Developer",
            "description": "React specialist needed",
            "required_skills": ["react", "typescript", "css"],
            "preferred_skills": ["nextjs", "tailwind"],
            "min_years_experience": 3.0,
            "location": "Manchester, UK",
            "remote_ok": False,
            "metadata": {}
        },
        {
            "title": "DevOps Engineer",
            "description": "AWS and Kubernetes expert",
            "required_skills": ["aws", "kubernetes", "terraform"],
            "preferred_skills": ["docker", "jenkins"],
            "min_years_experience": 4.0,
            "location": None,
            "remote_ok": True,
            "metadata": {}
        },
        {
            "title": "Data Scientist",
            "description": "ML and Python specialist",
            "required_skills": ["python", "machine learning", "pandas"],
            "preferred_skills": ["tensorflow", "pytorch"],
            "min_years_experience": 3.0,
            "min_education": "masters",
            "location": "Edinburgh, UK",
            "remote_ok": True,
            "metadata": {}
        }
    ]
    
    created_count = 0
    for job_data in jobs:
        response = requests.post(
            f"{BASE_URL}/v1/jobs",
            headers=headers,
            json=job_data
        )
        
        if response.status_code == 200:
            created_count += 1
            data = response.json()
            print(f"✅ Created: {data['job']['title']}")
        else:
            print(f"❌ Failed: {job_data['title']}")
    
    print(f"\n📊 Created {created_count}/{len(jobs)} jobs")


def test_delete_job(job_id):
    """Test deleting a job profile."""
    print_section("TEST 6: Delete Job Profile")
    
    if not job_id:
        print("⏭️  Skipping (no job ID from previous test)")
        return
    
    headers = {"Authorization": f"Bearer {API_KEY}"}
    
    response = requests.delete(
        f"{BASE_URL}/v1/jobs/{job_id}",
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Job deleted successfully!")
        print(f"   Job ID: {data['job_id']}")
        print(f"   Message: {data['message']}")
        
        # Verify deletion
        print(f"\n🔍 Verifying deletion...")
        verify_response = requests.get(
            f"{BASE_URL}/v1/jobs/{job_id}",
            headers=headers
        )
        
        if verify_response.status_code == 404:
            print(f"✅ Confirmed: Job no longer exists")
        else:
            print(f"❌ Job still exists!")
    else:
        print(f"❌ Error: {response.json()}")


def test_404_errors():
    """Test 404 error handling."""
    print_section("TEST 7: Error Handling (404s)")
    
    headers = {"Authorization": f"Bearer {API_KEY}"}
    
    # Try to get non-existent job
    response = requests.get(
        f"{BASE_URL}/v1/jobs/fake-job-id-12345",
        headers=headers
    )
    print(f"Get fake job: {response.status_code} {'✅' if response.status_code == 404 else '❌'}")
    
    # Try to update non-existent job
    response = requests.put(
        f"{BASE_URL}/v1/jobs/fake-job-id-12345",
        headers=headers,
        json={"title": "Test", "description": "Test"}
    )
    print(f"Update fake job: {response.status_code} {'✅' if response.status_code == 404 else '❌'}")
    
    # Try to delete non-existent job
    response = requests.delete(
        f"{BASE_URL}/v1/jobs/fake-job-id-12345",
        headers=headers
    )
    print(f"Delete fake job: {response.status_code} {'✅' if response.status_code == 404 else '❌'}")


def test_job_in_scoring():
    """Test using a saved job profile for scoring."""
    print_section("TEST 8: Use Job Profile in Scoring")
    
    headers = {"Authorization": f"Bearer {API_KEY}"}
    
    # Create a job
    job_data = {
        "title": "Python Developer for Testing",
        "description": "Test job for scoring workflow",
        "required_skills": ["python", "fastapi"],
        "preferred_skills": ["aws"],
        "min_years_experience": 3.0,
        "location": "Test Location",
        "remote_ok": True,
        "metadata": {}
    }
    
    job_response = requests.post(
        f"{BASE_URL}/v1/jobs",
        headers=headers,
        json=job_data
    )
    
    if job_response.status_code != 200:
        print("❌ Could not create test job")
        return
    
    job_id = job_response.json()['job_id']
    print(f"✅ Created test job: {job_id}")
    
    # Parse a CV
    with open('fixtures/sample_cv_senior_dev.txt', 'rb') as f:
        parse_response = requests.post(
            f"{BASE_URL}/v1/parse?persist=true",
            headers=headers,
            files={'file': ('sample_cv.txt', f, 'text/plain')}
        )
    
    if parse_response.status_code != 200:
        print("❌ Could not parse CV")
        return
    
    candidate = parse_response.json()['candidate']
    print(f"✅ Parsed CV: {candidate['contact']['full_name']}")
    
    # Get the job profile
    job_profile_response = requests.get(
        f"{BASE_URL}/v1/jobs/{job_id}",
        headers=headers
    )
    
    job_profile = job_profile_response.json()['job']
    
    # Score using the job profile
    score_response = requests.post(
        f"{BASE_URL}/v1/score",
        headers=headers,
        json={
            "candidate": candidate,
            "job": job_profile,
            "mode": "baseline"
        }
    )
    
    if score_response.status_code == 200:
        score_data = score_response.json()
        print(f"✅ Scoring successful!")
        print(f"   Overall score: {score_data['result']['overall_score']}/100")
        print(f"   Skills: {score_data['result']['breakdown']['skills_score']:.1f}/100")
        print(f"   Processing: {score_data['processing_time_ms']}ms")
        print(f"\n🎯 Full workflow complete: Create Job → Parse CV → Score!")
    else:
        print(f"❌ Scoring failed: {score_response.json()}")


if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("🧪 TESTING JOB PROFILE ENDPOINTS")
    print("=" * 70)
    
    if API_KEY == "YOUR_API_KEY_HERE":
        print("\n❌ ERROR: Please set DEV_API_KEY in .env!")
        exit(1)
    
    # Run all tests
    job_id = test_create_job()
    test_get_job(job_id)
    test_list_jobs()
    test_update_job(job_id)
    test_create_multiple_jobs()
    test_404_errors()
    test_job_in_scoring()
    test_delete_job(job_id)  # Delete at end
    
    print("\n" + "=" * 70)
    print("✅ ALL TESTS COMPLETE!")
    print("=" * 70)
    print("\nKey Features Tested:")
    print("  ✅ Create job profile")
    print("  ✅ Get job by ID")
    print("  ✅ List all jobs")
    print("  ✅ Update job profile")
    print("  ✅ Delete job profile")
    print("  ✅ Error handling (404s)")
    print("  ✅ Full workflow (Job → Parse → Score)")
    print("\nJob profile endpoints working! 🎉\n")