"""API key authentication middleware and utilities."""
import os
import secrets
import hashlib
from typing import Optional, Dict
from datetime import datetime
from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv

from app.models import ErrorDetail

# Load environment variables
load_dotenv()


# Simple in-memory API key store (replace with database in production)
class APIKeyStore:
    """In-memory API key storage.
    
    In production, this should use PostgreSQL with hashed keys.
    """
    
    def __init__(self):
        """Initialize key store."""
        self.keys: Dict[str, dict] = {}
    
    def create_key(self, user_id: str = "default", rate_limit_rpm: int = 60) -> tuple[str, str]:
        """Create a new API key.
        
        Args:
            user_id: User identifier
            rate_limit_rpm: Rate limit for this key
            
        Returns:
            (plain_key, key_hash) - only the hash is stored
        """
        # Generate random API key
        plain_key = f"ps_{secrets.token_urlsafe(32)}"
        
        # Hash it for storage (SHA-256 for simplicity; use argon2 in production)
        key_hash = hashlib.sha256(plain_key.encode()).hexdigest()
        
        # Store metadata
        self.keys[key_hash] = {
            "user_id": user_id,
            "rate_limit_rpm": rate_limit_rpm,
            "created_at": datetime.utcnow().isoformat(),
            "last_used_at": None,
            "status": "active",
            "request_count": 0
        }
        
        return plain_key, key_hash
    
    def validate_key(self, plain_key: str) -> Optional[dict]:
        """Validate an API key and return its metadata.
        
        Args:
            plain_key: Plain text API key from request
            
        Returns:
            Key metadata if valid, None otherwise
        """
        # Hash the incoming key
        key_hash = hashlib.sha256(plain_key.encode()).hexdigest()
        
        # Look up in store
        if key_hash not in self.keys:
            return None
        
        key_data = self.keys[key_hash]
        
        # Check if active
        if key_data["status"] != "active":
            return None
        
        # Update usage stats
        key_data["last_used_at"] = datetime.utcnow().isoformat()
        key_data["request_count"] += 1
        
        return key_data
    
    def revoke_key(self, plain_key: str) -> bool:
        """Revoke an API key.
        
        Args:
            plain_key: Plain text API key
            
        Returns:
            True if revoked, False if not found
        """
        key_hash = hashlib.sha256(plain_key.encode()).hexdigest()
        
        if key_hash not in self.keys:
            return False
        
        self.keys[key_hash]["status"] = "revoked"
        return True
    
    def get_key_info(self, plain_key: str) -> Optional[dict]:
        """Get information about an API key."""
        key_hash = hashlib.sha256(plain_key.encode()).hexdigest()
        return self.keys.get(key_hash)
    
    def list_keys(self, user_id: Optional[str] = None) -> list:
        """List all API keys, optionally filtered by user."""
        result = []
        for key_hash, data in self.keys.items():
            if user_id is None or data["user_id"] == user_id:
                result.append({
                    "key_hash": key_hash[:16] + "...",  # Partial hash for display
                    **data
                })
        return result


# Global key store instance
api_key_store = APIKeyStore()

# Get or create development API key
DEV_API_KEY = os.getenv("DEV_API_KEY")

if DEV_API_KEY:
    # Use existing key from .env
    print(f"\n🔑 Using existing API key from .env")
    # Validate it exists in store, if not, add it
    key_hash = hashlib.sha256(DEV_API_KEY.encode()).hexdigest()
    if key_hash not in api_key_store.keys:
        api_key_store.keys[key_hash] = {
            "user_id": "dev@example.com",
            "rate_limit_rpm": 60,
            "created_at": datetime.utcnow().isoformat(),
            "last_used_at": None,
            "status": "active",
            "request_count": 0
        }
    DEV_KEY_HASH = key_hash
    print(f"   Key: {DEV_API_KEY[:20]}...\n")
else:
    # Generate new key and save to .env
    DEV_API_KEY, DEV_KEY_HASH = api_key_store.create_key(
        user_id="dev@example.com",
        rate_limit_rpm=60
    )
    
    print(f"\n🔑 Generated new API Key: {DEV_API_KEY}")
    print(f"   Saving to .env file...\n")
    
    # Append to .env file
    env_path = os.path.join(os.getcwd(), ".env")
    try:
        # Check if .env exists
        if os.path.exists(env_path):
            # Check if DEV_API_KEY already in file
            with open(env_path, "r") as f:
                content = f.read()
                if "DEV_API_KEY" in content:
                    print("   ⚠️  DEV_API_KEY already exists in .env (but not loaded)")
                else:
                    with open(env_path, "a") as f:
                        f.write(f"\n# Development API Key (generated automatically)\n")
                        f.write(f"DEV_API_KEY={DEV_API_KEY}\n")
                    print(f"   ✅ Saved to .env - this key will persist across restarts\n")
        else:
            # Create new .env file
            with open(env_path, "w") as f:
                f.write(f"# ParseScore Environment Variables\n\n")
                f.write(f"# Development API Key (generated automatically)\n")
                f.write(f"DEV_API_KEY={DEV_API_KEY}\n")
            print(f"   ✅ Created .env file with API key\n")
    except Exception as e:
        print(f"   ⚠️  Could not save to .env: {e}")
        print(f"   💡 Manually add this to .env: DEV_API_KEY={DEV_API_KEY}\n")


# FastAPI dependency for API key authentication
security = HTTPBearer(auto_error=False)


async def verify_api_key(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> dict:
    """Verify API key from request.
    
    This is a FastAPI dependency that can be used in route handlers.
    
    Args:
        request: FastAPI request
        credentials: Bearer token credentials
        
    Returns:
        API key metadata
        
    Raises:
        HTTPException: If API key is invalid or missing
    """
    request_id = getattr(request.state, "request_id", "unknown")
    
    # Extract API key
    api_key = None
    
    # Try Authorization header
    if credentials and credentials.scheme == "Bearer":
        api_key = credentials.credentials
    
    # Try query parameter (less secure fallback)
    if not api_key:
        api_key = request.query_params.get("api_key")
    
    # No API key provided
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=ErrorDetail(
                request_id=request_id,
                error_code="missing_api_key",
                message="API key is required",
                hint="Provide API key in Authorization header: 'Bearer YOUR_API_KEY'"
            ).model_dump(),
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Validate API key
    key_data = api_key_store.validate_key(api_key)
    
    if not key_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=ErrorDetail(
                request_id=request_id,
                error_code="invalid_api_key",
                message="Invalid or revoked API key",
                hint="Check your API key or request a new one"
            ).model_dump(),
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Store key data in request state for downstream use
    request.state.api_key_data = key_data
    
    return key_data


# Optional: Dependency for routes that don't require auth
async def optional_api_key(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[dict]:
    """Optional API key verification (allows anonymous access)."""
    if not credentials:
        return None
    
    try:
        return await verify_api_key(request, credentials)
    except HTTPException:
        return None
