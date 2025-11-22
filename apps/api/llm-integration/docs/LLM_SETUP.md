# LLM-Enhanced Scoring Setup Guide

## Overview

ParseScore now supports **LLM-enhanced scoring** that adds AI-powered rationale and score adjustments to the baseline algorithmic scoring. This provides qualitative insights that pure algorithms can miss.

## Features

### Baseline Mode (Default)
- **Fast & Deterministic**: Pure algorithmic scoring (< 50ms)
- **Component Breakdown**: Skills, experience, education, certifications, stability
- **Risk Flags**: Automated detection of gaps, tenure issues, missing requirements
- **No API Costs**: Runs entirely on your infrastructure

### LLM Mode (Enhanced)
- **AI Rationale**: 2-3 paragraph professional explanation of the match
- **Qualitative Adjustment**: -10 to +10 score adjustment based on factors algorithms miss
- **Enhanced Risk Detection**: Additional flags from AI analysis
- **Smart Fallback**: If LLM fails, returns baseline score automatically

## Quick Start

### 1. Install Dependencies

```bash
pip install openai anthropic
# or
pip install -r requirements.txt
```

### 2. Configure Environment

Add to your `.env` file:

```bash
# Enable LLM scoring
LLM_ENABLED=true

# Choose provider: "openai" or "anthropic"
LLM_PROVIDER=openai

# Add your API key
LLM_API_KEY=sk-your-api-key-here

# Choose model
LLM_MODEL=gpt-4o-mini  # Fast & cheap for most use cases
# or: gpt-4o, claude-3-5-sonnet-20241022
```

### 3. Test It

```bash
# Start the API
uvicorn app.main:app --reload

# In another terminal, run the test
python test_llm_scoring.py
```

## Supported Providers & Models

### OpenAI
```bash
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini      # Recommended: Fast & cheap ($0.15/1M tokens)
LLM_MODEL=gpt-4o           # Higher quality, more expensive
```

### Anthropic
```bash
LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-5-sonnet-20241022  # Latest Claude (recommended)
LLM_MODEL=claude-3-5-haiku-20241022   # Faster, cheaper
```

## API Usage

### Baseline Scoring (Default)

```bash
curl -X POST "http://localhost:8000/v1/score" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "candidate": {...},
    "job": {...},
    "mode": "baseline"
  }'
```

**Response:**
```json
{
  "request_id": "...",
  "result": {
    "overall_score": 85.5,
    "breakdown": {...},
    "rationale": null,
    "flags": [...]
  },
  "processing_time_ms": 45.2
}
```

### LLM-Enhanced Scoring

```bash
curl -X POST "http://localhost:8000/v1/score" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "candidate": {...},
    "job": {...},
    "mode": "llm"
  }'
```

**Response:**
```json
{
  "request_id": "...",
  "result": {
    "overall_score": 88.0,
    "breakdown": {...},
    "rationale": "This candidate presents a strong match for the Senior Python Developer role...",
    "llm_adjustment": 2.5,
    "flags": [...]
  },
  "processing_time_ms": 2341.6
}
```

## Cost Considerations

### OpenAI Pricing (as of Jan 2025)
- **gpt-4o-mini**: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- **gpt-4o**: ~$2.50 per 1M input tokens, ~$10 per 1M output tokens

**Typical request:**
- Input: ~1,500 tokens (CV + job description + baseline scores)
- Output: ~400 tokens (rationale + adjustment)
- **Cost per scoring**: $0.0003 - $0.005 (depending on model)

### Anthropic Pricing
- **Claude 3.5 Sonnet**: ~$3 per 1M input tokens, ~$15 per 1M output tokens
- **Claude 3.5 Haiku**: ~$0.80 per 1M input tokens, ~$4 per 1M output tokens

## Performance

- **Baseline**: 30-50ms
- **LLM-Enhanced**: 1-3 seconds (depending on provider/model)
- **Timeout**: 10s (configurable via `LLM_TIMEOUT_S`)

## Caching

Both baseline and LLM-enhanced scores are **automatically cached** in the database:
- Same CV + Job = instant cache retrieval
- Cache key: CV ID + job description hash
- No duplicate LLM calls for same candidate-job pair

## Error Handling

The system gracefully falls back to baseline if:
- LLM API is unavailable
- Request times out
- API rate limits hit
- Invalid API key

**You'll never lose a scoring request due to LLM issues.**

## Best Practices

### When to Use Baseline Mode
- High-volume screening (thousands of candidates)
- Real-time applications (< 100ms latency required)
- Budget-constrained scenarios
- Consistent, auditable scoring needed

### When to Use LLM Mode
- Final candidate selection (top 10-20 candidates)
- Executive roles requiring nuanced evaluation
- When qualitative factors matter (cultural fit, leadership potential)
- Client-facing reports that need explanations

### Hybrid Approach (Recommended)
1. **First pass**: Baseline mode for all candidates
2. **Top candidates**: LLM mode for top 10-20%
3. **Result**: Best of both worlds - speed + insight

## Troubleshooting

### "LLM not enabled" Error
```
Solution: Set LLM_ENABLED=true in .env and restart server
```

### "LLM enhancement failed"
```
Common causes:
- Invalid API key
- Network issues
- Rate limits
- Model not available

Solution: Check logs, verify API key, try different model
```

### Slow LLM Responses
```
Solutions:
- Use faster model (gpt-4o-mini, claude-haiku)
- Increase LLM_TIMEOUT_S
- Check provider status page
```

## Advanced Configuration

```bash
# Timeout for LLM calls (seconds)
LLM_TIMEOUT_S=10

# Provider-specific settings
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
LLM_API_KEY=sk-...

# Temperature (creativity) - lower = more consistent
# Note: This is hardcoded to 0.3 in the scorer for consistency
# You can modify app/scoring/llm_scorer.py to make it configurable
```

## Example Output

### Baseline Rationale
```
(None - baseline mode provides component scores only)
```

### LLM-Enhanced Rationale
```
This candidate presents a strong match for the Senior Python Developer role, 
scoring 88/100. The candidate brings 8+ years of relevant experience across 
fintech and e-commerce sectors, directly aligning with the job requirements.

Key strengths include proven expertise in Python, FastAPI, and AWS infrastructure,
with recent experience scaling systems to 2M+ users. The progression from Junior
to Senior Engineer demonstrates steady career growth and increasing responsibility.
Current role shows strong technical leadership through mentoring 5 developers.

Minor concerns include the relatively short 2-year tenure at the previous company,
though this is offset by demonstrated impact and skill development. The candidate
exceeds all minimum requirements and brings valuable domain expertise that would
enable quick onboarding.
```

## Security Notes

- **Never commit API keys** to version control
- Store `LLM_API_KEY` in `.env` (gitignored)
- Rotate keys regularly
- Monitor API usage in provider dashboard
- Consider using separate keys for dev/prod

## Support

For issues or questions:
1. Check logs: `tail -f logs/app.log`
2. Review this guide
3. Test with `python test_llm_scoring.py`
4. Open GitHub issue with error details

---

**Ready to enhance your candidate scoring with AI? 🚀**
