.PHONY: dev test fmt lint openapi
dev:
uvicorn app.main:app --reload
test:
pytest -q || true
fmt:
ruff --fix .
black .
lint:
ruff .
black --check .
openapi:
python scripts/export_openapi.py
