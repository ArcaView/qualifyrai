"""Direct diagnostic for pooler connection to Supabase."""
import psycopg

# Your actual connection details
conn_str = "host=aws-1-eu-west-2.pooler.supabase.com port=6543 dbname=postgres user=postgres.nxteuyzcxabqpelingje password=wWg%26R#6^lc76Y4$hjZh"

print("🔗 Testing pooler connection with unencoded password...")

try:
    with psycopg.connect(conn_str) as conn:
        print("✅ Connected!")

        with conn.cursor() as cur:
            # List all ps_ tables
            cur.execute("""
                SELECT table_schema, table_name
                FROM information_schema.tables
                WHERE table_name LIKE 'ps_%'
                ORDER BY table_schema, table_name
            """)
            tables = cur.fetchall()

            print(f"\n📋 Found {len(tables)} ps_ tables:")
            for schema, table in tables:
                print(f"   - {schema}.{table}")

            if not tables:
                print("\n❌ No ps_ tables found!")
                print("This means the tables weren't created or the pooler can't see them")
            else:
                # Try to query ps_api_keys
                cur.execute("SELECT COUNT(*) FROM public.ps_api_keys")
                count = cur.fetchone()[0]
                print(f"\n✅ Successfully queried public.ps_api_keys (count: {count})")

except Exception as e:
    print(f"❌ Connection failed: {e}")
    import traceback
    traceback.print_exc()
