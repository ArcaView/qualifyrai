"""Debug: Check API key in database."""
import os
import hashlib
from dotenv import load_dotenv
from app.database import get_db_context
from app.repositories.db_repository import ApiKeyRepository

load_dotenv()
API_KEY = os.getenv("DEV_API_KEY")

print("=" * 60)
print("API KEY DEBUG")
print("=" * 60)

print(f"\n1. API Key from .env:")
print(f"   {API_KEY[:20]}... (length: {len(API_KEY)})")

key_hash = hashlib.sha256(API_KEY.encode()).hexdigest()
print(f"\n2. Key hash:")
print(f"   {key_hash[:32]}...")

print(f"\n3. Checking database...")
with get_db_context() as db:
    db_key = ApiKeyRepository.get_by_hash(db, key_hash)
    
    if db_key:
        print(f"   ✅ API Key found in database!")
        print(f"   ID: {db_key.id}")
        print(f"   Name: {db_key.name}")
        print(f"   Active: {db_key.is_active}")
        print(f"   Created: {db_key.created_at}")
        
        # Check if ID is valid
        if db_key.id:
            print(f"\n   ✅ Key has valid ID: {db_key.id}")
        else:
            print(f"\n   ❌ Key ID is None/empty!")
    else:
        print(f"   ❌ API Key NOT found in database!")
        print(f"\n   Creating it now...")
        
        new_key = ApiKeyRepository.create(
            db=db,
            key_hash=key_hash,
            name="Development Key (auto-created)"
        )
        print(f"   ✅ Created with ID: {new_key.id}")

print("\n" + "=" * 60)