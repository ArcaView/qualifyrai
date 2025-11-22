"""Rate limiting middleware with Redis support and in-memory fallback."""
import time
import hashlib
from typing import Dict, Optional
from dataclasses import dataclass, field
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware

from app.models import ErrorDetail
from app.config import settings


@dataclass
class TokenBucket:
    """Token bucket for in-memory rate limiting fallback."""
    capacity: int
    tokens: float
    rate: float  # tokens per second
    last_update: float = field(default_factory=time.time)
    
    def consume(self, tokens: int = 1) -> bool:
        """Try to consume tokens. Returns True if successful."""
        now = time.time()
        elapsed = now - self.last_update
        
        # Refill tokens based on elapsed time
        self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
        self.last_update = now
        
        # Try to consume
        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False
    
    def get_retry_after(self) -> float:
        """Get seconds until next token is available."""
        if self.tokens >= 1:
            return 0.0
        tokens_needed = 1 - self.tokens
        return tokens_needed / self.rate


class RateLimiter:
    """Hybrid rate limiter using Redis (preferred) or in-memory fallback.
    
    Uses Redis for distributed rate limiting in production.
    Falls back to in-memory token bucket for development or if Redis is unavailable.
    """
    
    def __init__(self, rpm: int = 60, burst: int = 120):
        """Initialize rate limiter.
        
        Args:
            rpm: Requests per minute
            burst: Burst capacity (max tokens)
        """
        self.rpm = rpm
        self.burst = burst
        self.rate_per_second = rpm / 60.0
        self.window_seconds = 60
        
        # In-memory fallback
        self.buckets: Dict[str, TokenBucket] = {}
        
        # Try to initialize Redis
        self.redis_client = None
        self.using_redis = False
        self._init_redis()
    
    def _init_redis(self):
        """Initialize Redis connection if available."""
        try:
            from app.redis_client import redis_client
            
            if redis_client.is_available():
                self.redis_client = redis_client
                self.using_redis = True
                print(f"✅ Rate limiter using Redis (distributed)")
            else:
                print(f"⚠️  Rate limiter using in-memory store (single-instance only)")
        except Exception as e:
            print(f"⚠️  Redis initialization failed: {e}")
            print(f"   Rate limiter using in-memory store")
    
    def check_rate_limit(self, key: str) -> tuple[bool, Optional[float], int]:
        """Check if request is within rate limit.
        
        Args:
            key: Rate limit key (e.g., API key or IP)
            
        Returns:
            (allowed: bool, retry_after: float, remaining: int)
        """
        # Use Redis if available
        if self.using_redis and self.redis_client:
            try:
                return self._check_redis(key)
            except Exception as e:
                print(f"⚠️  Redis rate limit check failed: {e}, falling back to in-memory")
                # Fall through to in-memory fallback
        
        # In-memory fallback
        return self._check_in_memory(key)
    
    def _check_redis(self, key: str) -> tuple[bool, Optional[float], int]:
        """Check rate limit using Redis."""
        # Create Redis key with namespace
        redis_key = f"ratelimit:{hashlib.sha256(key.encode()).hexdigest()}"
        
        allowed, remaining, reset_in = self.redis_client.check_rate_limit(
            key=redis_key,
            limit=self.rpm,
            window_seconds=self.window_seconds
        )
        
        retry_after = float(reset_in) if not allowed else None
        
        return allowed, retry_after, remaining
    
    def _check_in_memory(self, key: str) -> tuple[bool, Optional[float], int]:
        """Check rate limit using in-memory token bucket."""
        # Get or create bucket for this key
        if key not in self.buckets:
            self.buckets[key] = TokenBucket(
                capacity=self.burst,
                tokens=self.burst,
                rate=self.rate_per_second
            )
        
        bucket = self.buckets[key]
        allowed = bucket.consume(1)
        retry_after = bucket.get_retry_after() if not allowed else None
        remaining = int(bucket.tokens)
        
        return allowed, retry_after, remaining
    
    def get_quota_info(self, key: str) -> dict:
        """Get current quota information for a key."""
        if self.using_redis and self.redis_client:
            try:
                redis_key = f"ratelimit:{hashlib.sha256(key.encode()).hexdigest()}"
                info = self.redis_client.get_rate_limit_info(redis_key, self.window_seconds)
                return {
                    "limit": self.rpm,
                    "remaining": max(0, self.rpm - info["current_count"]),
                    "reset_in_seconds": self.window_seconds,
                    "backend": "redis"
                }
            except Exception:
                pass
        
        # In-memory fallback
        if key not in self.buckets:
            return {
                "limit": self.rpm,
                "remaining": self.burst,
                "reset_in_seconds": 0,
                "backend": "memory"
            }
        
        bucket = self.buckets[key]
        return {
            "limit": self.rpm,
            "remaining": int(bucket.tokens),
            "reset_in_seconds": int(bucket.get_retry_after()),
            "backend": "memory"
        }


# Global rate limiter instance
rate_limiter = RateLimiter(
    rpm=settings.API_RATE_RPM,
    burst=settings.API_RATE_BURST
)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware to enforce rate limits on API requests."""
    
    async def dispatch(self, request: Request, call_next):
        """Process request with rate limiting."""
        # Skip rate limiting for CORS preflight requests
        if request.method == "OPTIONS":
            return await call_next(request)
        
        # Skip rate limiting for health and docs endpoints
        if request.url.path in ["/v1/health", "/", "/docs", "/redoc", "/openapi.json"]:
            return await call_next(request)
        
        # Get rate limit key (API key or IP address)
        rate_limit_key = self._get_rate_limit_key(request)
            
        # Check rate limit
        allowed, retry_after, remaining = rate_limiter.check_rate_limit(rate_limit_key)
        
        if not allowed:
            # Rate limit exceeded
            request_id = getattr(request.state, "request_id", "unknown")
            
            response_data = ErrorDetail(
                request_id=request_id,
                error_code="rate_limited",
                message="Rate limit exceeded",
                hint=f"Retry after {retry_after:.1f} seconds. Limit: {settings.API_RATE_RPM} requests/minute."
            ).model_dump()
            
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=response_data,
                headers={
                    "Retry-After": str(int(retry_after) + 1),
                    "X-RateLimit-Limit": str(settings.API_RATE_RPM),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time() + retry_after))
                }
            )
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(settings.API_RATE_RPM)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(time.time() + 60))
        
        return response
    
    def _get_rate_limit_key(self, request: Request) -> str:
        """Get rate limiting key from request.
        
        Priority:
        1. API key (from Authorization header or api_key query param)
        2. Client IP address (fallback)
        """
        # Try to get API key
        api_key = self._extract_api_key(request)
        if api_key:
            return f"key:{api_key}"
        
        # Fallback to IP address
        client_ip = request.client.host if request.client else "unknown"
        return f"ip:{client_ip}"
    
    def _extract_api_key(self, request: Request) -> Optional[str]:
        """Extract API key from request."""
        # Check Authorization header (Bearer token)
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            return auth_header[7:]
        
        # Check query parameter (less secure, but allowed)
        return request.query_params.get("api_key")