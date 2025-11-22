#!/usr/bin/env python3
"""Quick batch scoring test with CVs from fixtures folder."""
import sys
import requests
from pathlib import Path

# Configuration
API_URL = "http://127.0.0.1:8000/v1/batch-score"
FIXTURES_DIR = Path("fixtures")

# Get API key
try:
    with open('.env', 'r') as f:
        for line in f:
            if line.startswith('DEV_API_KEY='):
                API_KEY = line.strip().split('=', 1)[1]
                break
        else:
            print("❌ DEV_API_KEY not found in .env")
            sys.exit(1)
except FileNotFoundError:
    print("❌ .env file not found")
    sys.exit(1)

# Find all CV files in fixtures
cv_files = list(FIXTURES_DIR.glob("*.txt")) + \
           list(FIXTURES_DIR.glob("*.pdf")) + \
           list(FIXTURES_DIR.glob("*.docx"))

if not cv_files:
    print(f"❌ No CV files found in {FIXTURES_DIR}/")
    print("   Looking for: *.txt, *.pdf, *.docx")
    sys.exit(1)

print(f"📁 Found {len(cv_files)} CV file(s):")
for cv in cv_files:
    print(f"   - {cv.name}")

# Prepare files for upload
files = []
for cv_path in cv_files:
    # Determine content type
    suffix = cv_path.suffix.lower()
    content_types = {
        '.txt': 'text/plain',
        '.pdf': 'application/pdf',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }
    content_type = content_types.get(suffix, 'text/plain')

    files.append(('files', (cv_path.name, open(cv_path, 'rb'), content_type)))

# Job description
data = {
    "job_title": "Senior Backend Engineer",
    "job_description": "We're looking for a senior backend engineer with 5+ years of experience in Python, FastAPI, and PostgreSQL. Experience with AWS, Docker, and modern CI/CD practices is required. Must have strong problem-solving skills and experience building scalable APIs.",
    "required_skills": "Python,FastAPI,PostgreSQL,Docker,AWS",
    "preferred_skills": "Redis,Kubernetes,React,TypeScript",
    "min_years_experience": "5",
    "min_education": "bachelors"
}

print(f"\n🚀 Sending batch request to {API_URL}...")
print(f"   Job: {data['job_title']}")
print(f"   Required Skills: {data['required_skills']}")

# Make request
try:
    response = requests.post(
        API_URL,
        files=files,
        data=data,
        headers={"Authorization": f"Bearer {API_KEY}"},
        timeout=120  # 2 minutes for LLM processing
    )

    # Close file handles
    for _, (_, file_handle, _) in files:
        file_handle.close()

    if response.status_code == 200:
        result = response.json()

        print(f"\n✅ Success! Processed in {result['processing_time_ms']:.0f}ms")
        print(f"   Total CVs: {result['total_cvs']}")
        print(f"   Successful: {result['successful_reviews']}")
        print(f"   Failed: {result['failed_reviews']}")

        print("\n" + "="*80)
        print("📊 CANDIDATE REVIEWS (sorted by score)")
        print("="*80)

        for i, review in enumerate(result['reviews'], 1):
            print(f"\n{i}. 📄 {review['filename']}")
            print(f"   Candidate: {review.get('candidate_name', 'N/A')}")
            print(f"   Score: {review['suitability_score']}/100")
            print(f"   Recommendation: {review['recommendation'].upper().replace('_', ' ')}")

            if review.get('parsing_errors'):
                print(f"   ⚠️  Parsing Error: {review['parsing_errors']}")
                continue

            print(f"\n   ✅ Strengths:")
            for strength in review['strengths'][:3]:
                print(f"      • {strength}")

            print(f"\n   ⚠️  Weaknesses:")
            for weakness in review['weaknesses'][:3]:
                print(f"      • {weakness}")

            print(f"\n   📝 Review Preview:")
            preview = review['detailed_review'][:300]
            if len(review['detailed_review']) > 300:
                preview += "..."
            print(f"      {preview}")

            print(f"\n   🎯 Baseline Scores:")
            bs = review['baseline_scores']
            print(f"      Skills: {bs['skills_score']:.1f} | "
                  f"Experience: {bs['experience_score']:.1f} | "
                  f"Education: {bs['education_score']:.1f} | "
                  f"Certs: {bs['certifications_score']:.1f} | "
                  f"Stability: {bs['stability_score']:.1f}")

            if review['flags']:
                print(f"\n   🚩 Flags:")
                for flag in review['flags'][:3]:
                    print(f"      [{flag['severity'].upper()}] {flag['description']}")

        print("\n" + "="*80)
        print(f"✨ Top Candidate: {result['reviews'][0]['filename']} "
              f"({result['reviews'][0]['suitability_score']}/100)")
        print("="*80)

    else:
        print(f"\n❌ Error: {response.status_code}")
        print(response.text)
        sys.exit(1)

except requests.exceptions.Timeout:
    print("\n❌ Request timed out (LLM took too long)")
    print("   Try with fewer CVs or increase timeout")
    sys.exit(1)
except requests.exceptions.ConnectionError:
    print("\n❌ Could not connect to API")
    print("   Is the server running? (uvicorn app.main:app --reload)")
    sys.exit(1)
except Exception as e:
    print(f"\n❌ Unexpected error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
