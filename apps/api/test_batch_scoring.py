"""Test batch CV scoring endpoint."""
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

# Check if LLM is configured
if not settings.LLM_ENABLED or not settings.LLM_API_KEY:
    pytest.skip(
        "LLM not configured - set LLM_ENABLED=true and LLM_API_KEY to test batch scoring",
        allow_module_level=True
    )


def test_batch_score_basic():
    """Test basic batch scoring with sample CVs."""
    client = TestClient(app)

    # Get API key from environment or use default dev key
    api_key = os.getenv("DEV_API_KEY")
    if not api_key:
        pytest.skip("No API key available - run app to generate DEV_API_KEY")

    # Load sample CV
    cv_path = Path(__file__).parent / "fixtures" / "sample_cv_senior_dev.txt"
    if not cv_path.exists():
        pytest.skip(f"Sample CV not found at {cv_path}")

    with open(cv_path, "rb") as f:
        cv_content = f.read()

    # Prepare batch request (using same CV twice for testing)
    files = [
        ("files", ("senior_dev_1.txt", cv_content, "text/plain")),
        ("files", ("senior_dev_2.txt", cv_content, "text/plain"))
    ]

    data = {
        "job_title": "Senior Backend Engineer",
        "job_description": "We're looking for a senior backend engineer with 5+ years of experience in Python, FastAPI, and PostgreSQL. Experience with AWS and Docker is required.",
        "required_skills": "Python, FastAPI, PostgreSQL, Docker, AWS",
        "preferred_skills": "Redis, Kubernetes, React",
        "min_years_experience": "5",
        "min_education": "bachelors"
    }

    # Make request
    response = client.post(
        "/v1/batch-score",
        files=files,
        data=data,
        headers={"Authorization": f"Bearer {api_key}"}
    )

    print(f"\nStatus: {response.status_code}")
    print(f"Response: {response.json()}")

    # Validate response
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    result = response.json()

    # Check response structure
    assert "request_id" in result
    assert "job_title" in result
    assert result["job_title"] == "Senior Backend Engineer"
    assert result["total_cvs"] == 2
    assert "successful_reviews" in result
    assert "reviews" in result
    assert len(result["reviews"]) == 2

    # Check first review structure
    first_review = result["reviews"][0]
    assert "filename" in first_review
    assert "suitability_score" in first_review
    assert "recommendation" in first_review
    assert "strengths" in first_review
    assert "weaknesses" in first_review
    assert "detailed_review" in first_review
    assert "baseline_scores" in first_review

    # Validate recommendation levels
    assert first_review["recommendation"] in ["strong_match", "good_match", "moderate_match", "weak_match"]

    # Check that reviews are sorted by score (descending)
    scores = [r["suitability_score"] for r in result["reviews"]]
    assert scores == sorted(scores, reverse=True), "Reviews should be sorted by score (descending)"

    print(f"\n✅ Batch scoring test passed!")
    print(f"   - Reviewed {result['total_cvs']} CVs")
    print(f"   - Successful: {result['successful_reviews']}")
    print(f"   - Top score: {result['reviews'][0]['suitability_score']}/100")
    print(f"   - Top recommendation: {result['reviews'][0]['recommendation']}")
    print(f"   - Strengths: {result['reviews'][0]['strengths'][:2]}")
    print(f"   - Processing time: {result['processing_time_ms']:.0f}ms")


def test_batch_score_validation():
    """Test batch scoring validation (too many files, no files, etc)."""
    client = TestClient(app)

    api_key = os.getenv("DEV_API_KEY")
    if not api_key:
        pytest.skip("No API key available")

    # Test: No files
    response = client.post(
        "/v1/batch-score",
        files=[],
        data={
            "job_title": "Test Job",
            "job_description": "Test description"
        },
        headers={"Authorization": f"Bearer {api_key}"}
    )
    assert response.status_code == 400
    assert "no_files" in response.text.lower() or "validation" in response.text.lower()

    print("\n✅ Validation test passed!")


def test_batch_score_single_file():
    """Test batch scoring with single CV."""
    client = TestClient(app)

    api_key = os.getenv("DEV_API_KEY")
    if not api_key:
        pytest.skip("No API key available")

    cv_path = Path(__file__).parent / "fixtures" / "sample_cv_senior_dev.txt"
    if not cv_path.exists():
        pytest.skip(f"Sample CV not found")

    with open(cv_path, "rb") as f:
        cv_content = f.read()

    files = [
        ("files", ("developer.txt", cv_content, "text/plain"))
    ]

    data = {
        "job_title": "Python Developer",
        "job_description": "Looking for a Python developer with FastAPI experience",
        "required_skills": "Python, FastAPI",
        "preferred_skills": "PostgreSQL, Redis"
    }

    response = client.post(
        "/v1/batch-score",
        files=files,
        data=data,
        headers={"Authorization": f"Bearer {api_key}"}
    )

    assert response.status_code == 200
    result = response.json()
    assert result["total_cvs"] == 1
    assert len(result["reviews"]) == 1

    print("\n✅ Single file test passed!")


if __name__ == "__main__":
    # Run tests directly
    print("Testing batch CV scoring endpoint...\n")

    try:
        test_batch_score_basic()
        test_batch_score_validation()
        test_batch_score_single_file()
        print("\n🎉 All batch scoring tests passed!")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
