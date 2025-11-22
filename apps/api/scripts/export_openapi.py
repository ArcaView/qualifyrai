from fastapi.openapi.utils import get_openapi
from app.main import app
import json, pathlib
openapi = get_openapi(title=app.title, version="0.1.0", routes=app.routes)
pathlib.Path("openapi.json").write_text(json.dumps(openapi, indent=2))
print("Wrote openapi.json")
