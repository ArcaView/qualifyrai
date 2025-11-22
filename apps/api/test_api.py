import requests
import json
API_KEY = "ps_sNAj8-ifIf0vTfK5nLamD_UestNj_NhNB8-x3Q_34Ks"
BASE_URL = "http://localhost:8000"
headers = {"Authorization": f"Bearer {API_KEY}"}
with open('fixtures/sample_cv_senior_dev.txt', 'rb') as f:
    parse_response = requests.post(
        f"{BASE_URL}/v1/parse?persist=true",
        headers=headers,
        files={'file': ('sample_cv.txt', f, 'text/plain')}
    )
candidate = parse_response.json()['candidate']
job = {
    "title": "Senior Python Developer",
    "description": "Looking for experienced Python developer",
    "required_skills": ["python", "fastapi", "postgresql", "aws"],
    "preferred_skills": ["kubernetes", "docker", "react"],
    "min_years_experience": 5.0,
    "min_education": "bachelors"
}
print("=" * 60)
print("BASELINE MODE")
print("=" * 60)
baseline = requests.post(
    f"{BASE_URL}/v1/score",
    headers=headers,
    json={"mode": "baseline", "candidate": candidate, "job": job}
)
result = baseline.json()['result']
print(f"Score: {result['overall_score']}/100")
print(f"Time: {baseline.json()['processing_time_ms']}ms")
print(f"Rationale: {result['rationale']}")
print("\n" + "=" * 60)
print("LLM MODE")
print("=" * 60)
llm = requests.post(
    f"{BASE_URL}/v1/score",
    headers=headers,
    json={"mode": "llm", "candidate": candidate, "job": job}
)
result = llm.json()['result']
print(f"Score: {result['overall_score']}/100")
print(f"Time: {llm.json()['processing_time_ms']}ms")
print(f"Adjustment: {result['llm_adjustment']}")
print(f"\nRationale:\n{result['rationale']}")
