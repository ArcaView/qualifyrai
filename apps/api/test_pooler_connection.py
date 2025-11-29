"""Test if pooler connection can see ps_api_keys table."""
import os
from dotenv import load_dotenv
import psycopg

# Load environment variables
load_dotenv()

# Get database URL and convert from SQLAlchemy format to psycopg format
db_url = os.getenv('DATABASE_URL')
# Remove postgresql+psycopg:// prefix, just need the connection string
db_url = db_url.replace('postgresql+psycopg://', 'postgresql://')

print(f"🔗 Testing pooler connection...")
print(f"   URL: {db_url[:60]}...")

try:
    # Connect directly with psycopg
    with psycopg.connect(db_url) as conn:
        print("\n✅ Connection successful!")

        # Check what database we're connected to
        with conn.cursor() as cur:
            cur.execute("SELECT current_database(), current_user, inet_server_addr(), inet_server_port()")
            db_info = cur.fetchone()
            print(f"\n📊 Connection info:")
            print(f"   Database: {db_info[0]}")
            print(f"   User: {db_info[1]}")
            print(f"   Host: {db_info[2]}")
            print(f"   Port: {db_info[3]}")

            # Check if ps_api_keys exists
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'public'
                    AND table_name = 'ps_api_keys'
                )
            """)
            exists = cur.fetchone()[0]
            print(f"\n🔍 Table ps_api_keys exists in public schema: {exists}")

            if exists:
                # Try to query it
                cur.execute("SELECT COUNT(*) FROM ps_api_keys")
                count = cur.fetchone()[0]
                print(f"   ✅ Can query ps_api_keys (count: {count})")
            else:
                # List all ps_ tables
                cur.execute("""
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                    AND table_name LIKE 'ps_%'
                    ORDER BY table_name
                """)
                tables = cur.fetchall()
                print(f"\n📋 Available ps_ tables in public schema:")
                for table in tables:
                    print(f"   - {table[0]}")

except Exception as e:
    print(f"\n❌ Connection failed: {e}")
    import traceback
    traceback.print_exc()
