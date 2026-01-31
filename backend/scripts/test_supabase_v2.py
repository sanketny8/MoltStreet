#!/usr/bin/env python3
"""
Comprehensive Supabase connection test using multiple libraries.
"""

import asyncio
import ssl
import socket
import subprocess
import sys
from urllib.parse import urlparse, unquote

# Test URL
TEST_URL = "postgresql+asyncpg://postgres.iwjrbvfnwneysnbnourt:MoltStreet%40123@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres"

def parse_url(url):
    parsed = urlparse(url)
    return {
        'host': parsed.hostname,
        'port': parsed.port,
        'user': parsed.username,
        'password': unquote(parsed.password) if parsed.password else None,
        'database': parsed.path.lstrip('/'),
    }


def test_psycopg2():
    """Test with psycopg2 (sync driver)."""
    print("\n" + "=" * 60)
    print("TEST: psycopg2 (sync PostgreSQL driver)")
    print("=" * 60)

    try:
        import psycopg2
    except ImportError:
        print("❌ psycopg2 not installed. Run: pip install psycopg2-binary")
        return False

    params = parse_url(TEST_URL)

    try:
        print(f"\nConnecting to {params['host']}:{params['port']}...")
        conn = psycopg2.connect(
            host=params['host'],
            port=params['port'],
            user=params['user'],
            password=params['password'],
            dbname=params['database'],
            sslmode='require',
            connect_timeout=30,
        )

        cur = conn.cursor()
        cur.execute("SELECT 1")
        result = cur.fetchone()
        print(f"✓ psycopg2 connection successful! Result: {result[0]}")

        cur.execute("SELECT version()")
        version = cur.fetchone()[0]
        print(f"✓ PostgreSQL: {version[:60]}...")

        conn.close()
        return True
    except Exception as e:
        print(f"❌ psycopg2 failed: {type(e).__name__}: {e}")
        return False


def test_psycopg3():
    """Test with psycopg3 (modern sync driver)."""
    print("\n" + "=" * 60)
    print("TEST: psycopg (v3, modern sync driver)")
    print("=" * 60)

    try:
        import psycopg
    except ImportError:
        print("❌ psycopg not installed. Run: pip install psycopg[binary]")
        return False

    params = parse_url(TEST_URL)

    try:
        print(f"\nConnecting to {params['host']}:{params['port']}...")
        conn = psycopg.connect(
            host=params['host'],
            port=params['port'],
            user=params['user'],
            password=params['password'],
            dbname=params['database'],
            sslmode='require',
            connect_timeout=30,
        )

        cur = conn.cursor()
        cur.execute("SELECT 1")
        result = cur.fetchone()
        print(f"✓ psycopg3 connection successful! Result: {result[0]}")

        conn.close()
        return True
    except Exception as e:
        print(f"❌ psycopg3 failed: {type(e).__name__}: {e}")
        return False


async def test_asyncpg_with_longer_timeout():
    """Test asyncpg with very long timeout."""
    print("\n" + "=" * 60)
    print("TEST: asyncpg with 60s timeout")
    print("=" * 60)

    try:
        import asyncpg
    except ImportError:
        print("❌ asyncpg not installed")
        return False

    params = parse_url(TEST_URL)

    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    try:
        print(f"\nConnecting with 60s timeout...")
        conn = await asyncio.wait_for(
            asyncpg.connect(
                host=params['host'],
                port=params['port'],
                user=params['user'],
                password=params['password'],
                database=params['database'],
                ssl=ssl_ctx,
                timeout=60,
                statement_cache_size=0,
            ),
            timeout=90
        )

        result = await conn.fetchval("SELECT 1")
        print(f"✓ asyncpg connection successful! Result: {result}")
        await conn.close()
        return True
    except asyncio.TimeoutError:
        print("❌ Timeout after 60s")
        return False
    except Exception as e:
        print(f"❌ asyncpg failed: {type(e).__name__}: {e}")
        return False


async def test_session_pooler():
    """Test session pooler (port 5432 on pooler host)."""
    print("\n" + "=" * 60)
    print("TEST: Session Pooler (port 5432 instead of 6543)")
    print("=" * 60)

    try:
        import asyncpg
    except ImportError:
        return False

    params = parse_url(TEST_URL)

    # Session pooler uses port 5432 on the same pooler host
    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    try:
        print(f"\nConnecting to {params['host']}:5432 (session pooler)...")
        conn = await asyncio.wait_for(
            asyncpg.connect(
                host=params['host'],
                port=5432,  # Session pooler port
                user=params['user'],
                password=params['password'],
                database=params['database'],
                ssl=ssl_ctx,
                timeout=30,
            ),
            timeout=45
        )

        result = await conn.fetchval("SELECT 1")
        print(f"✓ Session pooler connection works! Result: {result}")
        await conn.close()
        return True
    except Exception as e:
        print(f"❌ Session pooler failed: {type(e).__name__}: {e}")
        return False


def test_curl_supabase_api():
    """Test if Supabase API is reachable (to verify project is active)."""
    print("\n" + "=" * 60)
    print("TEST: Supabase REST API accessibility")
    print("=" * 60)

    # Extract project ref from username
    params = parse_url(TEST_URL)
    project_ref = params['user'].split('.')[1] if '.' in params['user'] else None

    if not project_ref:
        print("❌ Could not extract project reference")
        return False

    # Test the REST API endpoint
    api_url = f"https://{project_ref}.supabase.co/rest/v1/"

    try:
        import urllib.request
        print(f"\nTesting API: {api_url}")

        req = urllib.request.Request(api_url, method='OPTIONS')
        req.add_header('apikey', 'test')

        try:
            response = urllib.request.urlopen(req, timeout=10)
            print(f"✓ Supabase API is reachable (status: {response.status})")
            return True
        except urllib.error.HTTPError as e:
            # 401/403 is expected without valid API key, but proves the server is up
            if e.code in [401, 403, 400]:
                print(f"✓ Supabase API is reachable (auth required, status: {e.code})")
                return True
            print(f"❌ API error: {e.code}")
            return False
    except Exception as e:
        print(f"❌ API test failed: {e}")
        return False


def test_ipv4_vs_ipv6():
    """Check if there's an IPv6 vs IPv4 issue."""
    print("\n" + "=" * 60)
    print("TEST: IPv4 vs IPv6 resolution")
    print("=" * 60)

    params = parse_url(TEST_URL)
    hostname = params['host']

    print(f"\nResolving {hostname}...")

    # Try IPv4
    try:
        ipv4 = socket.getaddrinfo(hostname, params['port'], socket.AF_INET)
        print(f"✓ IPv4 addresses: {[addr[4][0] for addr in ipv4]}")
    except Exception as e:
        print(f"❌ IPv4 resolution failed: {e}")

    # Try IPv6
    try:
        ipv6 = socket.getaddrinfo(hostname, params['port'], socket.AF_INET6)
        print(f"✓ IPv6 addresses: {[addr[4][0] for addr in ipv6]}")
    except Exception as e:
        print(f"  No IPv6 addresses (this is normal)")


async def test_asyncpg_ipv4_only():
    """Force IPv4 connection."""
    print("\n" + "=" * 60)
    print("TEST: asyncpg with forced IPv4")
    print("=" * 60)

    try:
        import asyncpg
    except ImportError:
        return False

    params = parse_url(TEST_URL)

    # Resolve to IPv4 only
    try:
        ipv4_addrs = socket.getaddrinfo(params['host'], params['port'], socket.AF_INET)
        if ipv4_addrs:
            ipv4_addr = ipv4_addrs[0][4][0]
            print(f"\nUsing IPv4 address: {ipv4_addr}")
        else:
            print("❌ No IPv4 address found")
            return False
    except Exception as e:
        print(f"❌ IPv4 resolution failed: {e}")
        return False

    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    try:
        conn = await asyncio.wait_for(
            asyncpg.connect(
                host=ipv4_addr,  # Use IP directly
                port=params['port'],
                user=params['user'],
                password=params['password'],
                database=params['database'],
                ssl=ssl_ctx,
                timeout=30,
                statement_cache_size=0,
                # Server name for SSL
                server_settings={'application_name': 'test'},
            ),
            timeout=45
        )

        result = await conn.fetchval("SELECT 1")
        print(f"✓ IPv4-only connection works! Result: {result}")
        await conn.close()
        return True
    except Exception as e:
        print(f"❌ IPv4-only connection failed: {type(e).__name__}: {e}")
        return False


def test_nc_connection():
    """Use netcat to test raw TCP connection timing."""
    print("\n" + "=" * 60)
    print("TEST: Raw TCP timing with netcat")
    print("=" * 60)

    params = parse_url(TEST_URL)

    try:
        import time
        start = time.time()
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(30)
        sock.connect((params['host'], params['port']))
        connect_time = time.time() - start
        print(f"✓ TCP connect took: {connect_time:.2f}s")

        # Try to receive initial data (PostgreSQL should send something)
        sock.settimeout(10)
        try:
            data = sock.recv(1024)
            print(f"✓ Received {len(data)} bytes from server")
            if data:
                print(f"  First bytes: {data[:50]}")
        except socket.timeout:
            print("❌ No data received within 10s (server not responding)")

        sock.close()
        return True
    except Exception as e:
        print(f"❌ Raw TCP test failed: {e}")
        return False


async def main():
    print("\n" + "=" * 60)
    print("COMPREHENSIVE SUPABASE CONNECTION TEST")
    print("=" * 60)

    params = parse_url(TEST_URL)
    print(f"\nTarget: {params['host']}:{params['port']}")
    print(f"User: {params['user']}")
    print(f"Database: {params['database']}")

    results = {}

    # Test raw TCP timing
    results['tcp_timing'] = test_nc_connection()

    # Test IPv4/IPv6
    test_ipv4_vs_ipv6()

    # Test Supabase API
    results['supabase_api'] = test_curl_supabase_api()

    # Test psycopg2 (sync)
    results['psycopg2'] = test_psycopg2()

    # Test psycopg3 (sync)
    results['psycopg3'] = test_psycopg3()

    # Test asyncpg with longer timeout
    results['asyncpg_long'] = await test_asyncpg_with_longer_timeout()

    # Test session pooler
    results['session_pooler'] = await test_session_pooler()

    # Test IPv4 only
    results['asyncpg_ipv4'] = await test_asyncpg_ipv4_only()

    # Summary
    print("\n" + "=" * 60)
    print("RESULTS SUMMARY")
    print("=" * 60)

    for name, result in results.items():
        status = "✓" if result else "❌"
        print(f"   {status} {name}")

    # Recommendations
    print("\n" + "=" * 60)
    print("RECOMMENDATIONS")
    print("=" * 60)

    if results.get('psycopg2') or results.get('psycopg3'):
        print("\n✓ Sync drivers work! Consider using psycopg2/psycopg3.")
        print("  You can switch SQLAlchemy to use psycopg2:")
        print("  DATABASE_URL=postgresql+psycopg2://...")

    if results.get('session_pooler'):
        print("\n✓ Session pooler works! Use port 5432 instead of 6543:")
        print("  Change your URL port from 6543 to 5432")

    if not any(results.values()):
        print("\n❌ All tests failed. Possible issues:")
        print("   - Supabase project region mismatch")
        print("   - Network/firewall issues")
        print("   - Password incorrect (verify in Supabase dashboard)")


if __name__ == "__main__":
    asyncio.run(main())
