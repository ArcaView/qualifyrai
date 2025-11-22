"""Redis client manager for rate limiting and caching."""
import redis
from redis.exceptions import RedisError, ConnectionError as RedisConnectionError
from typing import Optional
import time

from app.config import settings


class RedisClient:
    """Redis client wrapper with connection pooling and error handling."""
    
    def __init__(self):
        """Initialize Redis client."""
        self.client: Optional[redis.Redis] = None
        self.enabled = False
        self._connect()
    
    def _connect(self):
        """Establish Redis connection."""
        if not settings.REDIS_URL:
            print("⚠️  Redis URL not configured - rate limiting will use in-memory store")
            return
        
        try:
            self.client = redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
                retry_on_timeout=True,
                health_check_interval=30
            )
            
            # Test connection
            self.client.ping()
            self.enabled = True
            print(f"✅ Redis connected: {settings.REDIS_URL}")
            
        except (RedisError, RedisConnectionError) as e:
            print(f"⚠️  Redis connection failed: {e}")
            print("   Rate limiting will use in-memory store (not recommended for production)")
            self.enabled = False
            self.client = None
    
    def is_available(self) -> bool:
        """Check if Redis is available."""
        if not self.enabled or not self.client:
            return False
        
        try:
            self.client.ping()
            return True
        except (RedisError, RedisConnectionError):
            return False
    
    # Rate Limiting Operations
    
    def check_rate_limit(
        self,
        key: str,
        limit: int,
        window_seconds: int = 60
    ) -> tuple[bool, int, int]:
        """Check rate limit using sliding window counter.
        
        Args:
            key: Rate limit key (e.g., 'ratelimit:api_key_hash')
            limit: Maximum requests allowed in window
            window_seconds: Time window in seconds
            
        Returns:
            (allowed: bool, remaining: int, reset_in: int)
        """
        if not self.enabled:
            raise RuntimeError("Redis not available")
        
        try:
            now = int(time.time())
            window_start = now - window_seconds
            
            # Use Redis sorted set for sliding window
            pipe = self.client.pipeline()
            
            # Remove old entries outside window
            pipe.zremrangebyscore(key, 0, window_start)
            
            # Count requests in current window
            pipe.zcard(key)
            
            # Add current request
            pipe.zadd(key, {str(now): now})
            
            # Set expiry on key
            pipe.expire(key, window_seconds + 10)
            
            results = pipe.execute()
            current_count = results[1]  # zcard result
            
            allowed = current_count < limit
            remaining = max(0, limit - current_count - 1)
            
            # Calculate reset time (when oldest request expires)
            oldest_scores = self.client.zrange(key, 0, 0, withscores=True)
            if oldest_scores:
                oldest_time = int(oldest_scores[0][1])
                reset_in = max(0, oldest_time + window_seconds - now)
            else:
                reset_in = window_seconds
            
            return allowed, remaining, reset_in
            
        except (RedisError, RedisConnectionError) as e:
            print(f"⚠️  Redis rate limit check failed: {e}")
            # Fail open (allow request) on Redis errors to prevent outage
            return True, limit - 1, window_seconds
    
    def get_rate_limit_info(self, key: str, window_seconds: int = 60) -> dict:
        """Get current rate limit status for a key.
        
        Args:
            key: Rate limit key
            window_seconds: Time window in seconds
            
        Returns:
            Dict with current count and window info
        """
        if not self.enabled:
            raise RuntimeError("Redis not available")
        
        try:
            now = int(time.time())
            window_start = now - window_seconds
            
            # Clean old entries and count
            pipe = self.client.pipeline()
            pipe.zremrangebyscore(key, 0, window_start)
            pipe.zcard(key)
            results = pipe.execute()
            
            current_count = results[1]
            
            return {
                "current_count": current_count,
                "window_seconds": window_seconds,
                "window_start": window_start,
                "window_end": now
            }
            
        except (RedisError, RedisConnectionError) as e:
            print(f"⚠️  Redis get rate limit info failed: {e}")
            return {
                "current_count": 0,
                "window_seconds": window_seconds,
                "error": str(e)
            }
    
    # Caching Operations (for future use)
    
    def get(self, key: str) -> Optional[str]:
        """Get value from cache."""
        if not self.enabled:
            return None
        
        try:
            return self.client.get(key)
        except (RedisError, RedisConnectionError):
            return None
    
    def set(self, key: str, value: str, ttl_seconds: int = 3600) -> bool:
        """Set value in cache with TTL."""
        if not self.enabled:
            return False
        
        try:
            self.client.setex(key, ttl_seconds, value)
            return True
        except (RedisError, RedisConnectionError):
            return False
    
    def delete(self, key: str) -> bool:
        """Delete key from cache."""
        if not self.enabled:
            return False
        
        try:
            self.client.delete(key)
            return True
        except (RedisError, RedisConnectionError):
            return False
    
    def close(self):
        """Close Redis connection."""
        if self.client:
            try:
                self.client.close()
                print("✅ Redis connection closed")
            except Exception as e:
                print(f"⚠️  Error closing Redis: {e}")


# Global Redis client instance
redis_client = RedisClient()