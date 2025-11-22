"""Test LLM-enhanced scoring functionality."""
import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("DEV_API_KEY", "YOUR_API_KEY_HERE")
BASE_URL = "http://localhost:8000"


def print_section(title):
    """Print a formatted section header."""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70 + "\n")


def parse_cv():
    """Parse the sample CV and return candidate data."""
    print_section("STEP 1: Parse CV")
    
    headers = {"Authorization": f"Bearer {API_KEY}"}
    
    with open('fixtures/sample_cv_senior_dev.txt', 'rb') as f:
        response = requests.post(
            f"{BASE_URL}/v1/parse?persist=true",
            headers=headers,
            files={'file': ('sample_cv.txt', f, 'text/plain')}
        )
    
    if response.status_code != 200:
        print(f"❌ Parse failed: {response.json()}")
        return None
    
    data = response.json()
    print(f"✅ CV parsed successfully")
    print(f"   Candidate: {data['candidate']['contact']['full_name']}")
    print(f"   Experience: {len(data['candidate']['work_experience'])} roles")
    print(f"   Skills: {len(data['candidate']['skills'])} identified")
    
    return data


def score_baseline(candidate_data):
    """Score with baseline algorithm."""
    print_section("STEP 2: Baseline Scoring (Algorithm Only)")
    
    headers = {"Authorization": f"Bearer {API_KEY}"}
    
    job = {
        "title": "Senior Python Developer",
        "description": "We're looking for a senior Python developer with strong backend experience and cloud infrastructure knowledge. Must have 5+ years of experience and proven track record in fintech or e-commerce.",
        "required_skills": ["python", "fastapi", "postgresql", "aws"],
        "preferred_skills": ["kubernetes", "docker", "react", "redis"],
        "min_years_experience": 5.0,
        "preferred_years_experience": 8.0,
        "min_education": "bachelors"
    }
    
    payload = {
        "candidate": candidate_data['candidate'],
        "job": job,
        "mode": "baseline"
    }
    
    response = requests.post(
        f"{BASE_URL}/v1/score",
        headers=headers,
        json=payload
    )
    
    if response.status_code != 200:
        print(f"❌ Scoring failed: {response.json()}")
        return None, job
    
    data = response.json()
    result = data['result']
    
    print(f"✅ Baseline score computed")
    print(f"\n📊 SCORE BREAKDOWN:")
    print(f"   Overall: {result['overall_score']}/100")
    print(f"   ├─ Skills:         {result['breakdown']['skills_score']:.1f}/100 (weight: 55%)")
    print(f"   ├─ Experience:     {result['breakdown']['experience_score']:.1f}/100 (weight: 25%)")
    print(f"   ├─ Education:      {result['breakdown']['education_score']:.1f}/100 (weight: 10%)")
    print(f"   ├─ Certifications: {result['breakdown']['certifications_score']:.1f}/100 (weight: 5%)")
    print(f"   └─ Stability:      {result['breakdown']['stability_score']:.1f}/100 (weight: 5%)")
    
    print(f"\n⚠️  RISK FLAGS: {len(result['flags'])}")
    for flag in result['flags']:
        print(f"   [{flag['severity'].upper()}] {flag['description']}")
    
    print(f"\n💬 RATIONALE:")
    if result.get('rationale'):
        print(f"   {result['rationale']}")
    else:
        print(f"   (No rationale - baseline mode)")
    
    print(f"\n⏱️  Processing time: {data['processing_time_ms']:.2f}ms")
    
    return data, job


def score_llm(candidate_data, job):
    """Score with LLM enhancement."""
    print_section("STEP 3: LLM-Enhanced Scoring (AI Rationale + Adjustment)")
    
    # Check if LLM is enabled
    if not os.getenv("LLM_ENABLED", "false").lower() == "true":
        print("⚠️  LLM_ENABLED=false in .env")
        print("   Set LLM_ENABLED=true and add your LLM_API_KEY to test this feature")
        return None
    
    if not os.getenv("LLM_API_KEY"):
        print("⚠️  LLM_API_KEY not set in .env")
        print("   Add your OpenAI or Anthropic API key to test this feature")
        return None
    
    headers = {"Authorization": f"Bearer {API_KEY}"}
    
    payload = {
        "candidate": candidate_data['candidate'],
        "job": job,
        "mode": "llm"  # 🔥 LLM mode
    }
    
    print("🤖 Calling LLM for enhanced analysis...")
    
    response = requests.post(
        f"{BASE_URL}/v1/score",
        headers=headers,
        json=payload
    )
    
    if response.status_code != 200:
        print(f"❌ LLM scoring failed: {response.json()}")
        return None
    
    data = response.json()
    result = data['result']
    
    print(f"✅ LLM enhancement complete")
    print(f"\n📊 ENHANCED SCORE:")
    print(f"   Overall: {result['overall_score']}/100")
    
    if result.get('llm_adjustment'):
        adjustment = result['llm_adjustment']
        sign = '+' if adjustment >= 0 else ''
        print(f"   LLM Adjustment: {sign}{adjustment}")
        print(f"   (Baseline was: {result['overall_score'] - adjustment:.1f})")
    
    print(f"\n💬 AI RATIONALE:")
    if result.get('rationale'):
        # Pretty print the rationale with proper wrapping
        rationale = result['rationale']
        for line in rationale.split('\n'):
            if line.strip():
                print(f"   {line.strip()}")
    else:
        print(f"   (No rationale provided)")
    
    print(f"\n⚠️  RISK FLAGS: {len(result['flags'])}")
    for flag in result['flags']:
        print(f"   [{flag['severity'].upper()}] {flag['description']}")
    
    print(f"\n⏱️  Processing time: {data['processing_time_ms']:.2f}ms")
    
    return data


def compare_modes():
    """Compare baseline vs LLM scoring."""
    print("\n" + "=" * 70)
    print("  🧪 ParseScore LLM Enhancement Test")
    print("=" * 70)
    
    # Step 1: Parse CV
    candidate_data = parse_cv()
    if not candidate_data:
        return
    
    # Step 2: Baseline scoring
    baseline_result, job = score_baseline(candidate_data)
    if not baseline_result:
        return
    
    # Step 3: LLM-enhanced scoring
    llm_result = score_llm(candidate_data, job)
    
    # Summary
    print_section("SUMMARY")
    
    if llm_result:
        baseline_score = baseline_result['result']['overall_score']
        llm_score = llm_result['result']['overall_score']
        adjustment = llm_result['result'].get('llm_adjustment') or 0
        
        print(f"Baseline Algorithm:  {baseline_score}/100")
        print(f"LLM-Enhanced Score:  {llm_score}/100")
        print(f"LLM Adjustment:      {adjustment:+.0f}")
        
        print(f"\n✨ Key Differences:")
        print(f"   • Baseline: Fast, deterministic, component-based scoring")
        print(f"   • LLM: Adds qualitative analysis and contextual understanding")
        
        if adjustment != 0:
            print(f"\n🎯 The LLM identified qualitative factors the algorithm missed!")
        else:
            print(f"\n✅ The LLM agreed with the baseline algorithmic score.")
    else:
        print("❌ LLM scoring not available (check LLM_ENABLED and LLM_API_KEY)")
        print("\n💡 To enable LLM scoring:")
        print("   1. Set LLM_ENABLED=true in .env")
        print("   2. Add LLM_API_KEY=sk-... (OpenAI) or LLM_API_KEY=sk-ant-... (Anthropic)")
        print("   3. Set LLM_PROVIDER=openai or LLM_PROVIDER=anthropic")
        print("   4. Choose LLM_MODEL (e.g., gpt-4o-mini for OpenAI)")
    
    print("\n" + "=" * 70)
    print("  ✅ Test Complete!")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    if API_KEY == "YOUR_API_KEY_HERE":
        print("❌ ERROR: Please set DEV_API_KEY in .env!")
        exit(1)
    
    compare_modes()
