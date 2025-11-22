# 🚀 Deploy LLM Integration to Your Project

## Files to Copy

I've created all the necessary files in `/home/claude/`. Here's what needs to go into your project:

### Core Implementation Files
```bash
# Copy these to your project root
cp /home/claude/app/scoring/llm_scorer.py YOUR_PROJECT/app/scoring/
cp /home/claude/app/scoring/__init__.py YOUR_PROJECT/app/scoring/
cp /home/claude/app/routes/score.py YOUR_PROJECT/app/routes/

# Update dependencies
cp /home/claude/requirements.txt YOUR_PROJECT/

# Update environment template
cp /home/claude/.env.example YOUR_PROJECT/
```

### Testing & Documentation
```bash
# Copy test and utility scripts
cp /home/claude/test_llm_scoring.py YOUR_PROJECT/
cp /home/claude/check_llm_config.py YOUR_PROJECT/

# Copy documentation
cp /home/claude/LLM_SETUP.md YOUR_PROJECT/
cp /home/claude/LLM_IMPLEMENTATION_SUMMARY.md YOUR_PROJECT/
```

## Quick Setup (5 minutes)

### 1. Install New Dependencies
```bash
cd YOUR_PROJECT
pip install openai anthropic
# or just: pip install -r requirements.txt
```

### 2. Configure Environment
Add to your `.env` file:
```bash
# LLM Configuration
LLM_ENABLED=true
LLM_PROVIDER=openai  # or "anthropic"
LLM_API_KEY=sk-your-api-key-here
LLM_MODEL=gpt-4o-mini
LLM_TIMEOUT_S=10
```

**Get API Keys:**
- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com/settings/keys

### 3. Verify Configuration
```bash
python check_llm_config.py
```

Expected output:
```
✅ All checks passed! LLM scoring is ready to use.
```

### 4. Start the API
```bash
uvicorn app.main:app --reload
```

### 5. Test LLM Scoring
In another terminal:
```bash
python test_llm_scoring.py
```

## What You'll See

### Baseline Score (Fast)
```
📊 SCORE BREAKDOWN:
   Overall: 85.5/100
   ├─ Skills:         92.0/100 (weight: 55%)
   ├─ Experience:     78.0/100 (weight: 25%)
   ├─ Education:      100.0/100 (weight: 10%)
   ├─ Certifications: 100.0/100 (weight: 5%)
   └─ Stability:      88.0/100 (weight: 5%)

⏱️  Processing time: 45.23ms
```

### LLM-Enhanced Score (With Rationale)
```
📊 ENHANCED SCORE:
   Overall: 88.0/100
   LLM Adjustment: +2.5

💬 AI RATIONALE:
   This candidate presents a strong match for the Senior Python 
   Developer role, scoring 88/100. The candidate brings 8+ years 
   of relevant experience across fintech and e-commerce sectors...
   
   [2-3 paragraphs of detailed analysis]

⏱️  Processing time: 2341.56ms
```

## API Usage

### Baseline Mode (Default)
```bash
curl -X POST "http://localhost:8000/v1/score" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "candidate": {...},
    "job": {...},
    "mode": "baseline"
  }'
```

### LLM Mode (Enhanced)
```bash
curl -X POST "http://localhost:8000/v1/score" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "candidate": {...},
    "job": {...},
    "mode": "llm"
  }'
```

## Cost Estimates

### OpenAI (gpt-4o-mini)
- **Cost per scoring**: ~$0.0003 (0.03 cents)
- **1,000 scorings**: ~$0.30
- **10,000 scorings**: ~$3.00

### Anthropic (Claude Sonnet)
- **Cost per scoring**: ~$0.003 (0.3 cents)
- **1,000 scorings**: ~$3.00
- **10,000 scorings**: ~$30.00

💡 **Tip**: Use gpt-4o-mini for most use cases. It's 10x cheaper and still very high quality.

## Troubleshooting

### "Module 'openai' not found"
```bash
pip install openai anthropic
```

### "LLM not enabled" error
Check your `.env`:
```bash
LLM_ENABLED=true  # Must be lowercase "true"
```

### "Invalid API key"
- Verify key starts with `sk-` (OpenAI) or `sk-ant-` (Anthropic)
- Check for extra spaces or quotes in `.env`
- Verify key is active in provider dashboard

### LLM timeouts
Increase timeout in `.env`:
```bash
LLM_TIMEOUT_S=20  # Default is 10
```

## Production Checklist

Before deploying to production:

- [ ] Install dependencies (`pip install -r requirements.txt`)
- [ ] Configure `LLM_API_KEY` in production environment
- [ ] Set appropriate `LLM_TIMEOUT_S` (10-15s recommended)
- [ ] Choose cost-effective model (gpt-4o-mini for OpenAI)
- [ ] Test with `python test_llm_scoring.py`
- [ ] Monitor API usage in provider dashboard
- [ ] Set up error alerting for LLM failures
- [ ] Document your scoring strategy (when to use baseline vs LLM)

## Recommended Deployment Strategy

### Development
```bash
LLM_ENABLED=true
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini  # Fast and cheap
```

### Production
```bash
LLM_ENABLED=true
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini  # Or gpt-4o for higher quality
```

### High-Volume Production
```bash
# Use baseline for screening, LLM for top candidates
# Implement in your application logic, not via env vars
```

## Next Steps

1. **Read the docs**: `LLM_SETUP.md` for detailed usage
2. **Run the test**: `python test_llm_scoring.py`
3. **Try both modes**: Compare baseline vs LLM
4. **Integrate**: Add to your application workflow
5. **Monitor**: Track costs and performance

## Support

- **Configuration issues**: Run `python check_llm_config.py`
- **API errors**: Check logs and provider status pages
- **Cost concerns**: Start with gpt-4o-mini, monitor usage
- **Performance**: Use caching (automatic), choose faster models

---

**You're all set! 🎉**

The LLM integration is ready to enhance your CV scoring with AI-powered insights.

Questions? Check `LLM_SETUP.md` for comprehensive documentation.
