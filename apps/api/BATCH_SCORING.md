# Batch CV Scoring

## Overview

The Batch CV Scoring endpoint allows you to upload up to **15 CVs** at once and receive detailed, LLM-powered suitability assessments for each candidate against a single job description.

Perfect for recruiters reviewing multiple candidates for an open position.

## Endpoint

```
POST /v1/batch-score
```

## Features

- ✅ Upload up to 15 CVs (PDF, DOCX, DOC, or TXT)
- ✅ LLM-powered detailed reviews for each candidate
- ✅ Strengths and weaknesses analysis
- ✅ Suitability scores (0-100)
- ✅ Recommendation levels (strong/good/moderate/weak match)
- ✅ Risk flags and concerns
- ✅ Results automatically sorted by suitability score (best first)

## Request Parameters

### Form Data (multipart/form-data)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `files` | File[] | ✅ Yes | CV files (max 15, each max 5MB) |
| `job_title` | string | ✅ Yes | Job title |
| `job_description` | string | ✅ Yes | Detailed job description |
| `required_skills` | string | No | Comma-separated required skills |
| `preferred_skills` | string | No | Comma-separated preferred skills |
| `min_years_experience` | number | No | Minimum years of experience |
| `min_education` | string | No | Minimum education level (e.g., "bachelors", "masters") |

### Headers

```
Authorization: Bearer YOUR_API_KEY
```

## Response Schema

```json
{
  "request_id": "uuid",
  "job_title": "Senior Backend Engineer",
  "total_cvs": 3,
  "successful_reviews": 3,
  "failed_reviews": 0,
  "processing_time_ms": 15420.5,
  "reviews": [
    {
      "filename": "john_doe.pdf",
      "candidate_name": "John Doe",
      "suitability_score": 85.5,
      "recommendation": "strong_match",
      "strengths": [
        "Strong technical skills match (7/8 required skills)",
        "Solid experience (8.5 years total)",
        "Excellent Python and FastAPI expertise with production deployments",
        "AWS and Docker proficiency demonstrated across multiple roles",
        "Good job stability with average 2.5 years per role"
      ],
      "weaknesses": [
        "Missing Kubernetes experience (preferred skill)",
        "No formal certifications mentioned",
        "Limited exposure to microservices architecture at scale"
      ],
      "detailed_review": "John Doe presents as a strong candidate for the Senior Backend Engineer position. His 8.5 years of experience align well with the 5+ year requirement, and his technical stack shows excellent overlap with our needs - particularly in Python, FastAPI, PostgreSQL, and AWS.\n\nThe candidate's career progression demonstrates consistent growth from mid-level to senior positions, with increasingly complex responsibilities. His work at TechCorp involved building scalable APIs handling 10M+ requests/day, which suggests strong production experience. The Docker and CI/CD experience is evident across recent roles.\n\nKey concerns are minor: he lacks hands-on Kubernetes experience (though Docker skills transfer well) and no AWS certifications are listed. His stability metrics are positive with no concerning employment gaps. Overall, this is a well-qualified candidate who would likely succeed in the role with minimal onboarding time.",
      "baseline_scores": {
        "skills_score": 87.5,
        "experience_score": 90.0,
        "education_score": 100.0,
        "certifications_score": 0.0,
        "stability_score": 85.0
      },
      "flags": [
        {
          "type": "missing_preferred_skill",
          "severity": "low",
          "description": "Missing preferred skill: Kubernetes"
        }
      ],
      "parsing_errors": null
    },
    {
      "filename": "jane_smith.docx",
      "candidate_name": "Jane Smith",
      "suitability_score": 72.0,
      "recommendation": "good_match",
      "strengths": [...],
      "weaknesses": [...],
      "detailed_review": "...",
      "baseline_scores": {...},
      "flags": [...],
      "parsing_errors": null
    }
  ]
}
```

## Recommendation Levels

| Level | Score Range | Description |
|-------|-------------|-------------|
| `strong_match` | 80-100 | Excellent fit, highly recommended for interview |
| `good_match` | 65-79 | Solid candidate, worth interviewing |
| `moderate_match` | 50-64 | Meets some requirements, consider if needed |
| `weak_match` | 0-49 | Poor fit, likely not suitable |

## Usage Examples

### cURL Example

```bash
curl -X POST "http://localhost:8000/v1/batch-score" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "files=@cv1.pdf" \
  -F "files=@cv2.pdf" \
  -F "files=@cv3.docx" \
  -F "job_title=Senior Backend Engineer" \
  -F "job_description=We're looking for an experienced backend engineer with Python and AWS expertise..." \
  -F "required_skills=Python,FastAPI,PostgreSQL,Docker,AWS" \
  -F "preferred_skills=Redis,Kubernetes,React" \
  -F "min_years_experience=5" \
  -F "min_education=bachelors"
```

### Python Example

```python
import requests

api_key = "YOUR_API_KEY"
url = "http://localhost:8000/v1/batch-score"

# Prepare files
files = [
    ("files", ("john_doe.pdf", open("john_doe.pdf", "rb"), "application/pdf")),
    ("files", ("jane_smith.docx", open("jane_smith.docx", "rb"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")),
    ("files", ("bob_jones.txt", open("bob_jones.txt", "rb"), "text/plain")),
]

# Prepare job data
data = {
    "job_title": "Senior Backend Engineer",
    "job_description": "We're looking for a senior backend engineer with 5+ years of experience...",
    "required_skills": "Python,FastAPI,PostgreSQL,Docker,AWS",
    "preferred_skills": "Redis,Kubernetes,React",
    "min_years_experience": 5,
    "min_education": "bachelors"
}

# Make request
response = requests.post(
    url,
    files=files,
    data=data,
    headers={"Authorization": f"Bearer {api_key}"}
)

if response.status_code == 200:
    result = response.json()

    print(f"Reviewed {result['total_cvs']} CVs in {result['processing_time_ms']:.0f}ms\n")

    for review in result['reviews']:
        print(f"📄 {review['filename']}")
        print(f"   Score: {review['suitability_score']}/100 ({review['recommendation']})")
        print(f"   Strengths: {review['strengths'][0]}")
        print(f"   Weaknesses: {review['weaknesses'][0]}")
        print()
else:
    print(f"Error: {response.status_code}")
    print(response.json())
```

### JavaScript/TypeScript Example

```typescript
const formData = new FormData();

// Add files
const files = [
  new File([file1Blob], "cv1.pdf", { type: "application/pdf" }),
  new File([file2Blob], "cv2.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }),
];

files.forEach(file => {
  formData.append("files", file);
});

// Add job data
formData.append("job_title", "Senior Backend Engineer");
formData.append("job_description", "We're looking for...");
formData.append("required_skills", "Python,FastAPI,PostgreSQL");
formData.append("min_years_experience", "5");

// Make request
const response = await fetch("http://localhost:8000/v1/batch-score", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY"
  },
  body: formData
});

const result = await response.json();

if (response.ok) {
  console.log(`Reviewed ${result.total_cvs} CVs`);

  result.reviews.forEach(review => {
    console.log(`${review.filename}: ${review.suitability_score}/100`);
  });
}
```

## Requirements

- **LLM must be enabled**: Set `LLM_ENABLED=true` and configure `LLM_API_KEY`
- **API key authentication**: Required for all requests
- **File limits**:
  - Max 15 files per request
  - Max 5MB per file
  - Supported formats: PDF, DOCX, DOC, TXT

## Error Handling

The endpoint includes comprehensive error handling:

- **400 Bad Request**: Too many files, file too large
- **401 Unauthorized**: Invalid or missing API key
- **422 Unprocessable Entity**: Invalid job profile, LLM not enabled
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Processing failed

Each error includes:
- `request_id` for tracking
- `error_code` for programmatic handling
- `message` describing the error
- `hint` suggesting how to fix it

## Performance

- **Typical processing time**: 10-20 seconds for 10 CVs (depends on LLM provider)
- **Parallel processing**: CVs are processed concurrently where possible
- **Rate limiting**: Standard API rate limits apply (60 rpm by default)

## Best Practices

1. **Batch size**: For fastest results, keep batches to 5-10 CVs
2. **Job descriptions**: More detailed descriptions yield better LLM reviews
3. **Skills**: Specify both required and preferred skills for nuanced scoring
4. **File names**: Use descriptive filenames (e.g., "john_doe_resume.pdf")
5. **Result sorting**: Reviews are pre-sorted by score - top candidates first

## Comparison with Single Scoring

| Feature | Single `/v1/score` | Batch `/v1/batch-score` |
|---------|-------------------|------------------------|
| Files per request | 1 | Up to 15 |
| LLM reviews | Optional | Required |
| Strengths/Weaknesses | No | Yes ✅ |
| Detailed review | Rationale only | 2-3 paragraphs ✅ |
| Recommendation level | No | Yes ✅ |
| Auto-sorting | N/A | By score ✅ |
| Best for | Single candidate | Recruiter review sessions |

## Example Output

When you upload 3 CVs for a "Senior Backend Engineer" role, you might receive:

```json
{
  "reviews": [
    {
      "filename": "alice_developer.pdf",
      "suitability_score": 88.5,
      "recommendation": "strong_match",
      "strengths": [
        "Exceptional Python and FastAPI expertise (8 years)",
        "Strong AWS architecture experience",
        "Relevant certifications: AWS Solutions Architect"
      ]
    },
    {
      "filename": "bob_engineer.docx",
      "suitability_score": 71.0,
      "recommendation": "good_match",
      "strengths": [
        "Solid technical foundation",
        "Good PostgreSQL experience"
      ]
    },
    {
      "filename": "charlie_junior.txt",
      "suitability_score": 45.0,
      "recommendation": "weak_match",
      "weaknesses": [
        "Only 2 years experience (requires 5+)",
        "Missing several key required skills"
      ]
    }
  ]
}
```

## Support

For issues or questions:
- Check `/docs` for interactive API documentation
- Review error messages for hints
- Contact support with the `request_id` from failed requests

---

**Ready to try it?** Start the API server and visit `/docs` to test the endpoint interactively!
