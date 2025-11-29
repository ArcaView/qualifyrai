"""Test database connection and schema visibility."""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load environment variables
load_dotenv()

# Get database URL
db_url = os.getenv('DATABASE_URL')
print(f"🔗 Testing connection to database...")
print(f"   URL: {db_url[:50]}...{db_url[-20:]}")

# Create engine
engine = create_engine(db_url)

# Test connection
try:
    with engine.connect() as conn:
        print("\n✅ Connection successful!")

        # Check current search_path
        result = conn.execute(text("SHOW search_path"))
        search_path = result.scalar()
        print(f"\n🔍 Current search_path: {search_path}")

        # Check if parsescore schema exists
        result = conn.execute(text("""
            SELECT schema_name
            FROM information_schema.schemata
            WHERE schema_name = 'parsescore'
        """))
        schemas = result.fetchall()
        print(f"\n📁 Parsescore schema exists: {len(schemas) > 0}")

        # List tables in parsescore schema
        result = conn.execute(text("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'parsescore'
            ORDER BY table_name
        """))
        tables = result.fetchall()
        print(f"\n📊 Tables in parsescore schema ({len(tables)}):")
        for table in tables:
            print(f"   - {table[0]}")

        # Try to query parsescore.api_keys directly
        print(f"\n🔑 Testing direct access to parsescore.api_keys...")
        try:
            result = conn.execute(text("SELECT COUNT(*) FROM parsescore.api_keys"))
            count = result.scalar()
            print(f"   ✅ Can access parsescore.api_keys (count: {count})")
        except Exception as e:
            print(f"   ❌ Cannot access parsescore.api_keys: {e}")

        # Check table permissions
        result = conn.execute(text("""
            SELECT grantee, privilege_type
            FROM information_schema.role_table_grants
            WHERE table_schema = 'parsescore'
              AND table_name = 'api_keys'
        """))
        perms = result.fetchall()
        print(f"\n🔐 Permissions on parsescore.api_keys:")
        for perm in perms:
            print(f"   - {perm[0]}: {perm[1]}")

except Exception as e:
    print(f"\n❌ Connection failed: {e}")
    import traceback
    traceback.print_exc()
