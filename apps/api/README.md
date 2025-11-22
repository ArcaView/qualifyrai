# ParseScore — CV Parser & AI Scoring API

**What this repo contains**
- FastAPI service (`/app`) implementing the PRD.
- An **/instructions** folder of small, reusable context cards (for humans & AI) per Cursor best rules.
- CI via GitHub Actions (lint, test, build, OpenAPI export).

**How to run**
```bash
python -m venv .venv && .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```
Docs

http://localhost:8000/docs

http://localhost:8000/openapi.json

Instructions folder
See /instructions/README.md. Include only the smallest necessary cards in your editor context.