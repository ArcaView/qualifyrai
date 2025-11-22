"""Diagnose database connection issues."""
import os
import socket
from urllib.parse import urlparse
from dotenv import load_dotenv

load_dotenv()

print("=" * 70)
print("DATABASE CONNECTION DIAGNOSTIC")
print("=" * 70 + "\n")

# Parse DATABASE_URL
db_url = os.getenv("DATABASE_URL", "")
print(f"1️⃣  Database URL Check")
print("-" * 70)

if not db_url:
    print("❌ DATABASE_URL not set in .env")
    exit(1)

# Parse URL
parsed = urlparse(db_url.strip('"'))
print(f"   Protocol: {parsed.scheme}")
print(f"   Host: {parsed.hostname}")
print(f"   Port: {parsed.port}")
print(f"   Database: {parsed.path.lstrip('/')}")
print(f"   User: {parsed.username}")
print(f"   Password: {'*' * len(parsed.password) if parsed.password else 'None'}")
print()

# Test network connectivity
print(f"2️⃣  Network Connectivity")
print("-" * 70)

if parsed.hostname:
    print(f"   Testing connection to {parsed.hostname}:{parsed.port}...")
    
    try:
        # Try to resolve hostname
        ip = socket.gethostbyname(parsed.hostname)
        print(f"   ✅ DNS resolved: {ip}")
        
        # Try to connect
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        
        result = sock.connect_ex((parsed.hostname, parsed.port or 5432))
        sock.close()
        
        if result == 0:
            print(f"   ✅ Port {parsed.port} is REACHABLE")
        else:
            print(f"   ❌ Port {parsed.port} is BLOCKED or CLOSED")
            print(f"      Error code: {result}")
            print(f"\n   Possible causes:")
            print(f"   1. Firewall blocking outbound connections")
            print(f"   2. Supabase network restrictions")
            print(f"   3. VPN/Proxy interference")
            
    except socket.gaierror:
        print(f"   ❌ DNS lookup failed - hostname not found")
    except socket.timeout:
        print(f"   ❌ Connection timeout")
    except Exception as e:
        print(f"   ❌ Connection error: {e}")
else:
    print("   ❌ No hostname found in DATABASE_URL")

print()

# Try PostgreSQL connection
print(f"3️⃣  PostgreSQL Connection Test")
print("-" * 70)

try:
    import psycopg2
    
    # Build connection string
    conn_str = db_url.strip('"')
    
    print(f"   Attempting connection with 5s timeout...")
    
    conn = psycopg2.connect(conn_str, connect_timeout=5)
    print(f"   ✅ PostgreSQL connection SUCCESSFUL!")
    
    # Test query
    cur = conn.cursor()
    cur.execute("SELECT version();")
    version = cur.fetchone()[0]
    print(f"   ✅ Database version: {version[:50]}...")
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"   ❌ Connection failed: {e}")
    
    error_str = str(e)
    if "timeout" in error_str.lower():
        print(f"\n   🔍 TIMEOUT ERROR detected")
        print(f"   Likely causes:")
        print(f"   1. IP not whitelisted in Supabase")
        print(f"   2. Windows Firewall blocking")
        print(f"   3. Corporate network blocking port {parsed.port}")

print()

# Check local PostgreSQL
print(f"4️⃣  Local PostgreSQL Check")
print("-" * 70)

try:
    import psycopg2
    
    local_url = "postgresql://dev:dev@localhost:5432/parsescore"
    
    print(f"   Testing local database...")
    conn = psycopg2.connect(local_url, connect_timeout=2)
    print(f"   ✅ Local PostgreSQL is AVAILABLE")
    
    cur = conn.cursor()
    cur.execute("SELECT current_database();")
    db_name = cur.fetchone()[0]
    print(f"   ✅ Connected to database: {db_name}")
    
    cur.close()
    conn.close()
    
    print(f"\n   💡 TIP: You can use local database for development!")
    print(f"   It's faster and more reliable than Supabase.")
    
except Exception as e:
    print(f"   ❌ Local PostgreSQL not reachable")
    print(f"   Error: {e}")
    print(f"   Make sure Docker is running: docker-compose ps")

print()

# Recommendations
print("=" * 70)
print("RECOMMENDATIONS")
print("=" * 70 + "\n")

print("🔧 QUICK FIX - Use Local Database:")
print()
print("   In your .env file, change DATABASE_URL to:")
print("   DATABASE_URL=\"postgresql://dev:dev@localhost:5432/parsescore\"")
print()
print("   Your Docker PostgreSQL is already running!")
print()