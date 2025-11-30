"""ParseScore API - Main application with Redis support."""
import time
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.config import settings
from app.models import HealthResponse, ErrorDetail
from app.database import init_db, engine

# Track startup time for uptime calculation
START_TIME = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown."""
    # Startup
    print(f"🚀 ParseScore API starting in {settings.APP_ENV} mode...")
    print(f"📊 Rate limit: {settings.API_RATE_RPM} rpm (burst {settings.API_RATE_BURST})")
    print(f"🤖 LLM enabled: {settings.LLM_ENABLED}")
    
    # Initialize database
    print("🗄️  Initializing database connection...")
    try:
        init_db()
        print("✅ Database ready")
    except Exception as e:
        print(f"⚠️  Database initialization failed: {e}")
        print("   API will start but database features may not work")
    
    # Initialize Redis (automatic - handled by redis_client module)
    try:
        from app.redis_client import redis_client
        if redis_client.is_available():
            print("✅ Redis ready (distributed rate limiting enabled)")
        else:
            print("⚠️  Redis unavailable (using in-memory rate limiting)")
    except Exception as e:
        print(f"⚠️  Redis initialization failed: {e}")
    
    # TODO: Load skill taxonomy
    
    yield
    
    # Shutdown
    print("👋 ParseScore API shutting down...")
    engine.dispose()
    print("✅ Database connections closed")
    
    # Close Redis connection
    try:
        from app.redis_client import redis_client
        redis_client.close()
    except Exception as e:
        print(f"⚠️  Redis cleanup failed: {e}")


# Create FastAPI app
app = FastAPI(
    title="ParseScore API",
    version=settings.API_VERSION,
    description="CV Parser & AI Scoring API - Developer-first, production-ready",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Rate limiting middleware
#from app.middleware.rate_limit import RateLimitMiddleware
#app.add_middleware(RateLimitMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# MIDDLEWARE - Request ID & Timing
# ============================================================================

@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Add request ID and timing to all requests."""
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000  # ms
    
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = f"{process_time:.2f}ms"
    
    return response


# ============================================================================
# EXCEPTION HANDLERS
# ============================================================================

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with consistent format."""
    request_id = getattr(request.state, "request_id", "unknown")

    # Log the validation errors for debugging
    print(f"\n{'='*60}")
    print(f"VALIDATION ERROR [{request_id}]")
    print(f"{'='*60}")
    for error in exc.errors():
        print(f"  Field: {error.get('loc')}")
        print(f"  Type: {error.get('type')}")
        print(f"  Message: {error.get('msg')}")
        print(f"  Input: {str(error.get('input'))[:100]}")
        print(f"  ---")
    print(f"{'='*60}\n")

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=ErrorDetail(
            request_id=request_id,
            error_code="validation_error",
            message="Request validation failed",
            hint="Check the 'details' field for specific validation errors",
            details={"errors": exc.errors()}
        ).model_dump()
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Catch-all exception handler."""
    request_id = getattr(request.state, "request_id", "unknown")
    
    # Log the full error (TODO: use structured logging)
    print(f"ERROR [{request_id}]: {exc}")
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorDetail(
            request_id=request_id,
            error_code="internal_error",
            message="An unexpected error occurred",
            hint="Please contact support with the request ID"
        ).model_dump()
    )


# ============================================================================
# HEALTH & STATUS ENDPOINTS
# ============================================================================

@app.get("/v1/health", response_model=HealthResponse, tags=["System"])
def health():
    """Health check endpoint with service status."""
    uptime = time.time() - START_TIME
    
    # Check Redis status
    redis_status = "unavailable"
    try:
        from app.redis_client import redis_client
        if redis_client.is_available():
            redis_status = "connected"
    except Exception:
        pass
    
    return HealthResponse(
        status="ok",
        uptime_seconds=uptime,
        version=settings.API_VERSION
    )


@app.get("/", include_in_schema=False)
def root():
    """Root redirect to docs."""
    return {
        "message": "ParseScore API",
        "docs": "/docs",
        "health": "/v1/health"
    }


# ============================================================================
# ROUTE IMPORTS
# ============================================================================

from app.routes import parse, score, batch, health

# Include routers
app.include_router(parse.router)
app.include_router(score.router)
app.include_router(batch.router)
app.include_router(health.router)

# ============================================================================
# PLACEHOLDER ENDPOINTS (to be implemented)
# ============================================================================


@app.post("/v1/jobs", tags=["Jobs"])
async def create_job(request: Request):
    """Create or normalize a job profile.
    
    **TODO**: Implement job profile normalization.
    """
    return {
        "request_id": request.state.request_id,
        "message": "Jobs endpoint - coming soon",
        "status": "not_implemented"
    }


@app.get("/v1/usage", tags=["System"])
async def get_usage(request: Request):
    """Get API usage statistics for the current key.
    
    **TODO**: Implement usage tracking.
    """
    return {
        "request_id": request.state.request_id,
        "message": "Usage endpoint - coming soon",
        "status": "not_implemented"
    }


@app.delete("/v1/candidates/{candidate_id}", tags=["GDPR"])
async def delete_candidate(candidate_id: str, request: Request):
    """Delete candidate data (GDPR compliance).
    
    **TODO**: Implement data deletion.
    """
    return {
        "request_id": request.state.request_id,
        "candidate_id": candidate_id,
        "message": "Delete endpoint - coming soon",
        "status": "not_implemented"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)