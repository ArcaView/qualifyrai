"""API key authentication middleware with database integration."""
import os
import secrets
import hashlib
from typing import Optional
from datetime import datetime
from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from app.models import ErrorDetail
from app.database import get_db, get_db_context
from app.repositories.db_repository import ApiKeyRepository

# Load environment variables
load_dotenv()


# Simple in-memory API key store (DEPRECATED - use database instead)
# Keeping this for backward compatibility during migration
class APIKeyStore:
    """In-memory API key storage (DEPRECATED).
    
    This is only used during development. Production uses database.
    """
    
    def __init__(self):
        """Initialize key store."""
        self.keys: dict[str, dict] = {}
    
    def create_key(self, user_id: str = "default", rate_limit_rpm: int = 60) -> tuple[str, str]:
        """Create a new API key."""
        plain_key = f"ps_{secrets.token_urlsafe(32)}"
        key_hash = hashlib.sha256(plain_key.encode()).hexdigest()
        
        self.keys[key_hash] = {
            "id": user_id,
            "user_id": user_id,
            "rate_limit_rpm": rate_limit_rpm,
            "created_at": datetime.utcnow().isoformat(),
            "last_used_at": None,
            "status": "active",
            "request_count": 0
        }
        
        return plain_key, key_hash
    
    def validate_key(self, plain_key: str) -> Optional[dict]:
        """Validate an API key and return its metadata."""
        key_hash = hashlib.sha256(plain_key.encode()).hexdigest()
        
        if key_hash not in self.keys:
            return None
        
        key_data = self.keys[key_hash]
        
        if key_data["status"] != "active":
            return None
        
        key_data["last_used_at"] = datetime.utcnow().isoformat()
        key_data["request_count"] += 1
        
        return key_data


# Global key store instance (for backward compatibility)
api_key_store = APIKeyStore()

# Get or create development API key
DEV_API_KEY = os.getenv("DEV_API_KEY")

if DEV_API_KEY:
    print(f"\n🔑 Using existing API key from .env")

    # Check if key exists in database, if not create it
    try:
        with get_db_context() as db:
            key_hash = hashlib.sha256(DEV_API_KEY.encode()).hexdigest()
            db_key = ApiKeyRepository.get_by_hash(db, key_hash)

            if not db_key:
                # Create in database
                print("   Creating API key in database...")
                ApiKeyRepository.create(
                    db=db,
                    key_hash=key_hash,
                    name="Development Key"
                )
                print("   ✅ API key saved to database")
    except Exception as e:
        print(f"   ⚠️  Could not connect to database: {e}")
        print(f"   API will start but database features may not work")

        # Add to in-memory store for backward compatibility
        key_hash = hashlib.sha256(DEV_API_KEY.encode()).hexdigest()
        api_key_store.keys[key_hash] = {
            "id": "dev",
            "user_id": "dev@example.com",
            "rate_limit_rpm": 60,
            "created_at": datetime.utcnow().isoformat(),
            "last_used_at": None,
            "status": "active",
            "request_count": 0
        }
    
    print(f"   Key: {DEV_API_KEY[:20]}...\n")
else:
    # Generate new key
    DEV_API_KEY, DEV_KEY_HASH = api_key_store.create_key(
        user_id="dev@example.com",
        rate_limit_rpm=60
    )
    
    print(f"\n🔑 Generated new API Key: {DEV_API_KEY}")
    print(f"   Saving to database and .env file...\n")
    
    # Save to database
    try:
        with get_db_context() as db:
            ApiKeyRepository.create(
                db=db,
                key_hash=DEV_KEY_HASH,
                name="Development Key"
            )
        print("   ✅ Saved to database")
    except Exception as e:
        print(f"   ⚠️  Could not save to database: {e}")
    
    # Save to .env file
    env_path = os.path.join(os.getcwd(), ".env")
    try:
        if os.path.exists(env_path):
            with open(env_path, "r") as f:
                content = f.read()
                if "DEV_API_KEY" not in content:
                    with open(env_path, "a") as f:
                        f.write(f"\n# Development API Key (generated automatically)\n")
                        f.write(f"DEV_API_KEY={DEV_API_KEY}\n")
                    print(f"   ✅ Saved to .env\n")
                else:
                    print("   ⚠️  DEV_API_KEY already in .env\n")
        else:
            with open(env_path, "w") as f:
                f.write(f"# ParseScore Environment Variables\n\n")
                f.write(f"# Development API Key\n")
                f.write(f"DEV_API_KEY={DEV_API_KEY}\n")
            print(f"   ✅ Created .env file\n")
    except Exception as e:
        print(f"   ⚠️  Could not save to .env: {e}")
        print(f"   💡 Manually add: DEV_API_KEY={DEV_API_KEY}\n")


# FastAPI dependency for API key authentication
security = HTTPBearer(auto_error=False)


async def verify_api_key(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> dict:
    """Verify API key from request (database-backed).
    
    This is a FastAPI dependency that can be used in route handlers.
    
    Args:
        request: FastAPI request
        credentials: Bearer token credentials
        db: Database session
        
    Returns:
        API key metadata including ID
        
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
    
    # Hash the key
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()
    
    # Validate against database
    db_key = ApiKeyRepository.get_by_hash(db, key_hash)
    
    if not db_key:
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
    
    # Update last used timestamp (async to avoid blocking)
    try:
        ApiKeyRepository.update_last_used(db, db_key.id)
    except Exception as e:
        print(f"Warning: Could not update last_used_at: {e}")
    
    # Return key metadata
    key_data = {
        "id": db_key.id,
        "name": db_key.name,
        "user_id": db_key.id,  # For backward compatibility
        "rate_limit_rpm": 60,  # TODO: Store in DB
        "created_at": db_key.created_at.isoformat(),
        "last_used_at": db_key.last_used_at.isoformat() if db_key.last_used_at else None
    }
    
    # Store in request state
    request.state.api_key_data = key_data
    
    return key_data


# Optional: Dependency for routes that don't require auth
async def optional_api_key(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[dict]:
    """Optional API key verification (allows anonymous access)."""
    if not credentials:
        return None
    
    try:
        return await verify_api_key(request, credentials, db)
    except HTTPException:
        return None