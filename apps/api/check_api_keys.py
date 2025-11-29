"""Check what API keys are in the database."""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
import hashlib

load_dotenv()

db_url = os.getenv('DATABASE_URL')
engine = create_engine(db_url)

print("🔍 Checking API keys in database...\n")

with engine.connect() as conn:
    result = conn.execute(text("SELECT id, key_hash, name, is_active FROM ps_api_keys"))
    keys = result.fetchall()

    print(f"Found {len(keys)} API keys in database:\n")

    for key in keys:
        print(f"  Name: {key[2]}")
        print(f"  Hash: {key[1]}")
        print(f"  Active: {key[3] == 1}")
        print()

    # Check if the dev key matches
    dev_key = "ps_6Ed0hRDV8u97w-ot-wt3N1UPTneLqGDPSx7hAuivIzE"
    dev_hash = hashlib.sha256(dev_key.encode()).hexdigest()

    print(f"\n🔑 Expected DEV_API_KEY hash: {dev_hash}")

    # Check if it exists
    for key in keys:
        if key[1] == dev_hash:
            print(f"✅ DEV_API_KEY found in database!")
            break
    else:
        print(f"❌ DEV_API_KEY NOT found in database!")
