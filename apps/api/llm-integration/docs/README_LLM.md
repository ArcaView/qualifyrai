# 🤖 ParseScore LLM Integration

**AI-powered candidate scoring with professional rationale and qualitative adjustments.**

## What's New

Your ParseScore API now supports **LLM-enhanced scoring** that adds AI-generated rationale and score adjustments to your existing baseline algorithm. This gives you the best of both worlds:

- **Baseline Mode**: Fast (30-50ms), deterministic, free
- **LLM Mode**: Insightful (2-3s), contextual understanding, ~$0.0003/score

## Quick Overview

### Before (Baseline Only)
```json
{
  "overall_score": 85.5,
  "breakdown": {...},
  "rationale": null,
  "flags": [...]
}
```

### After (With LLM)
```json
{
  "overall_score": 88.0,
  "breakdown": {...},
  "rationale": "This candidate presents a strong match for the Senior Python Developer role...",
  "llm_adjustment": 2.5,
  "flags": [...]
}
```

## 🚀 Quick Start (5 minutes)

### 1. Deploy Files
```bash
# Option A: Automated script
./deploy_llm.sh

# Option B: Manual copy
cp /home/claude/app/scoring/llm_scorer.py app/scoring/
cp /home/claude/app/routes/score.py app/routes/
cp /home/claude/requirements.txt .
```

### 2. Install Dependencies
```bash
pip install openai anthropic
# or: pip install -r requirements.txt
```

### 3. Configure LLM
Add to `.env`:
```bash
LLM_ENABLED=true
LLM_PROVIDER=openai
LLM_API_KEY=sk-your-openai-api-key
LLM_MODEL=gpt-4o-mini
```

Get API key: https://platform.openai.com/api-keys

### 4. Verify & Test
```bash
# Check configuration
python check_llm_config.py

# Start API
uvicorn app.main:app --reload

# Test (in another terminal)
python test_llm_scoring.py
```

## 📁 Files Created

### Core Implementation
- `app/scoring/llm_scorer.py` - LLM enhancement engine
- `app/scoring/__init__.py` - Module exports
- `app/routes/score.py` - Updated score endpoint
- `requirements.txt` - Added OpenAI & Anthropic SDKs

### Testing & Utilities
- `test_llm_scoring.py` - Compare baseline vs LLM modes
- `check_llm_config.py` - Verify LLM configuration
- `deploy_llm.sh` - Automated deployment script

### Documentation
- `LLM_SETUP.md` - Complete setup guide
- `LLM_IMPLEMENTATION_SUMMARY.md` - Technical details
- `DEPLOYMENT_GUIDE.md` - Deployment instructions
- `README_LLM.md` - This file

## 🎯 Usage

### API Endpoint

```bash
POST /v1/score
```

**Baseline Mode (Default)**
```json
{
  "mode": "baseline",
  "candidate": {...},
  "job": {...}
}
```

**LLM Mode**
```json
{
  "mode": "llm",
  "candidate": {...},
  "job": {...}
}
```

### Python Example

```python
import requests

headers = {"Authorization": f"Bearer {API_KEY}"}

# Baseline scoring
response = requests.post(
    "http://localhost:8000/v1/score",
    headers=headers,
    json={
        "mode": "baseline",
        "candidate": candidate_data,
        "job": job_data
    }
)

# LLM-enhanced scoring
response = requests.post(
    "http://localhost:8000/v1/score",
    headers=headers,
    json={
        "mode": "llm",  # ← Changed
        "candidate": candidate_data,
        "job": job_data
    }
)

result = response.json()["result"]
print(f"Score: {result['overall_score']}")
print(f"Rationale: {result['rationale']}")
```

## 💰 Cost & Performance

### Baseline Mode
- **Latency**: 30-50ms
- **Cost**: $0 (runs locally)
- **Accuracy**: 98.5% (validated)

### LLM Mode (gpt-4o-mini)
- **Latency**: 1-3 seconds
- **Cost**: ~$0.0003 per scoring
- **Value**: Professional rationale + qualitative insights

### Cost Examples
- 1,000 scorings: ~$0.30
- 10,000 scorings: ~$3.00
- 100,000 scorings: ~$30.00

## 🎨 Recommended Patterns

### Pattern 1: Two-Stage Screening
```python
# Stage 1: Screen all candidates with baseline (fast, free)
all_scores = [
    score_candidate(c, job, mode="baseline") 
    for c in candidates
]

# Stage 2: Enhance top 10% with LLM (insight, rationale)
top_candidates = sorted(all_scores, key=lambda x: x.score)[-50:]
enhanced_scores = [
    score_candidate(c, job, mode="llm")
    for c in top_candidates
]
```

### Pattern 2: Client Reports
```python
# Use LLM for reports needing explanations
score = score_candidate(candidate, job, mode="llm")

report = f"""
Candidate Assessment: {candidate.name}
Overall Match: {score.overall_score}/100

{score.rationale}

Recommendation: {'PROCEED' if score.overall_score > 80 else 'REVIEW'}
"""
```

### Pattern 3: Real-Time Screening
```python
# Baseline only for instant feedback
score = score_candidate(candidate, job, mode="baseline")
return {"score": score.overall_score, "latency": "< 50ms"}
```

## 🔧 Configuration

### Environment Variables

```bash
# LLM Provider
LLM_PROVIDER=openai          # "openai" or "anthropic"

# API Key
LLM_API_KEY=sk-...           # Your API key

# Enable/Disable
LLM_ENABLED=true             # true/false

# Model Selection
LLM_MODEL=gpt-4o-mini        # For OpenAI
# LLM_MODEL=claude-3-5-sonnet-20241022  # For Anthropic

# Timeout
LLM_TIMEOUT_S=10             # Request timeout in seconds
```

### Supported Models

**OpenAI**
- `gpt-4o-mini` - Recommended (fast, cheap, good quality)
- `gpt-4o` - Higher quality, more expensive

**Anthropic**
- `claude-3-5-sonnet-20241022` - Latest Claude
- `claude-3-5-haiku-20241022` - Faster, cheaper

## 🛡️ Error Handling

The system gracefully handles all LLM failures:
- Network timeouts → Returns baseline score
- Invalid API key → Returns baseline score
- Rate limits → Returns baseline score
- Provider outage → Returns baseline score

**You'll never lose a scoring request due to LLM issues.**

## 📊 Features

### What LLM Adds

1. **Professional Rationale** (2-3 paragraphs)
   - Overall match assessment
   - Key strengths
   - Concerns or red flags
   - Specific evidence from CV

2. **Qualitative Adjustment** (-10 to +10)
   - Career trajectory
   - Domain expertise depth
   - Leadership potential
   - Cultural fit signals

3. **Enhanced Risk Detection**
   - Vague job descriptions
   - Credential mismatches
   - Industry transitions
   - Career decisions

### What LLM Doesn't Change

- ✅ Baseline scoring still works
- ✅ All component breakdowns preserved
- ✅ Database caching still applies
- ✅ API authentication unchanged
- ✅ Rate limiting unchanged

## 🔒 Security

- Store `LLM_API_KEY` in `.env` (gitignored)
- Never commit API keys to version control
- Use separate keys for dev/prod
- Rotate keys regularly
- Monitor usage in provider dashboard

## 📚 Documentation

- **Setup Guide**: `LLM_SETUP.md` - Complete setup instructions
- **Implementation**: `LLM_IMPLEMENTATION_SUMMARY.md` - Technical details
- **Deployment**: `DEPLOYMENT_GUIDE.md` - Production deployment
- **This File**: Quick reference and getting started

## 🧪 Testing

### Configuration Check
```bash
python check_llm_config.py
```

### Full LLM Test
```bash
python test_llm_scoring.py
```

### Manual Test
```bash
# Start API
uvicorn app.main:app --reload

# Test baseline
curl -X POST "http://localhost:8000/v1/score" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d @test_payload_baseline.json

# Test LLM
curl -X POST "http://localhost:8000/v1/score" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d @test_payload_llm.json
```

## ❓ Troubleshooting

### "Module 'openai' not found"
```bash
pip install openai anthropic
```

### "LLM not enabled"
Check `.env`:
```bash
LLM_ENABLED=true  # Must be "true" (lowercase)
```

### "Invalid API key"
- Verify key format: `sk-...` (OpenAI) or `sk-ant-...` (Anthropic)
- Check for spaces or quotes in `.env`
- Verify key is active in provider dashboard

### LLM timeouts
Increase timeout:
```bash
LLM_TIMEOUT_S=20  # Default is 10
```

### Configuration issues
```bash
python check_llm_config.py
```

## 🎉 What's Next?

Your ParseScore API now has:
- ✅ Fast baseline scoring (98.5% accuracy)
- ✅ Optional LLM enhancement
- ✅ Professional rationale generation
- ✅ Qualitative score adjustments
- ✅ Enhanced risk detection
- ✅ Multi-provider support
- ✅ Automatic caching
- ✅ Graceful error handling

**Start scoring with AI insights today!**

## 📞 Support

- Configuration: Run `python check_llm_config.py`
- API errors: Check logs and provider status
- Cost concerns: Use gpt-4o-mini
- Questions: See `LLM_SETUP.md`

---

**Built with ❤️ for ParseScore**

Ready to enhance your candidate scoring? Follow the Quick Start above! 🚀
