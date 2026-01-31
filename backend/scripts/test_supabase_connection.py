#!/usr/bin/env python3
"""
Test script to test Supabase connection with psycopg2 and asyncpg.
"""

import asyncio
import ssl
import socket
from urllib.parse import urlparse, unquote

# Test connection URL
TEST_URL = 'postgresql://postgres.iwjrbvfnwneysnbnourt:QmbKLuyQ8pGaKqc2@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=require'


def parse_and_display_url(url: str):
    """Parse and display URL components for debugging."""
    print("\n" + "=" * 60)
    print("CONNECTION STRING ANALYSIS")
    print("=" * 60)

    parsed = urlparse(url)

    print(f"\nScheme:   {parsed.scheme}")
    print(f"Username: {parsed.username}")
    print(f"Password: {unquote(parsed.password) if parsed.password else 'None'} (decoded from: {parsed.password})")
    print(f"Host:     {parsed.hostname}")
    print(f"Port:     {parsed.port}")
    print(f"Database: {parsed.path.lstrip('/')}")

    # Check for common issues
    print("\n" + "-" * 40)
    print("POTENTIAL ISSUES CHECK:")
    print("-" * 40)

    issues = []

    # Check driver
    if parsed.scheme != "postgresql":
        issues.append(f"Expected scheme 'postgresql', got '{parsed.scheme}'")

    # Check port
    if parsed.port == 5432:
        issues.append("Port 5432 is the direct connection port. For pooler, use 6543.")
    elif parsed.port == 6543:
        print("✓ Using pooler port 6543 (correct for Transaction mode)")

    # Check password encoding
    if parsed.password and "@" in unquote(parsed.password):
        if "%40" not in parsed.password:
            issues.append("Password contains '@' but is not URL-encoded. Use %40 instead of @")
        else:
            print("✓ Password is properly URL-encoded")

    # Check username format for Supabase
    if parsed.username and "." in parsed.username:
        print(f"✓ Username contains project reference: {parsed.username}")

    if issues:
        print("\n⚠️  ISSUES FOUND:")
        for issue in issues:
            print(f"   - {issue}")
    else:
        print("\n✓ No obvious URL format issues detected")

    return parsed


def test_psycopg2_connection(url: str):
    """Test connection using psycopg2 (synchronous)."""
    print("\n" + "=" * 60)
    print("TEST 0: psycopg2 Connection Test")
    print("=" * 60)

    try:
        import psycopg2
    except ImportError:
        print("❌ psycopg2 not installed. Run: pip install psycopg2-binary")
        return False

    try:
        print("\n   Attempting connection...")
        conn = psycopg2.connect(url)
        print('   ✓ SUCCESS! Connection works!')
        
        # Test query
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        print(f"   ✓ Test query returned: {result[0]}")
        
        # Get server version
        cursor.execute("SELECT version()")
        version = cursor.fetchone()[0]
        print(f"   ✓ PostgreSQL version: {version[:60]}...")
        
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"   ❌ Connection failed: {type(e).__name__}: {str(e)[:100]}")
        return False


async def test_raw_connection_with_options(url: str):
    """Test raw asyncpg connection with different SSL options."""
    print("\n" + "=" * 60)
    print("TEST 1: Raw asyncpg connection (multiple SSL modes)")
    print("=" * 60)

    try:
        import asyncpg
    except ImportError:
        print("❌ asyncpg not installed. Run: pip install asyncpg")
        return False

    parsed = urlparse(url)
    password = unquote(parsed.password) if parsed.password else None

    # Try different SSL configurations
    ssl_configs = [
        ("SSL Context (verify=none)", lambda: _create_ssl_context_none()),
        ("SSL String 'require'", lambda: "require"),
        ("SSL String 'prefer'", lambda: "prefer"),
        ("SSL Boolean True", lambda: True),
    ]

    for name, ssl_factory in ssl_configs:
        try:
            print(f"\n   Trying: {name}...")
            ssl_val = ssl_factory()

            conn = await asyncio.wait_for(
                asyncpg.connect(
                    host=parsed.hostname,
                    port=parsed.port,
                    user=parsed.username,
                    password=password,
                    database=parsed.path.lstrip('/'),
                    ssl=ssl_val,
                    timeout=15,
                    statement_cache_size=0,
                ),
                timeout=20
            )

            # Test query
            result = await conn.fetchval("SELECT 1")
            print(f"   ✓ Connection successful with {name}! Test query returned: {result}")

            # Get server version
            version = await conn.fetchval("SELECT version()")
            print(f"   ✓ PostgreSQL version: {version[:60]}...")

            await conn.close()
            return True

        except asyncio.TimeoutError:
            print(f"   ❌ Timeout with {name}")
        except asyncpg.exceptions.InvalidPasswordError as e:
            print(f"   ❌ Invalid password: {e}")
            return False  # No point trying other SSL modes
        except Exception as e:
            print(f"   ❌ Failed with {name}: {type(e).__name__}: {str(e)[:100]}")

    return False


def _create_ssl_context_none():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


async def test_direct_port_connection(url: str):
    """Test direct PostgreSQL connection (port 5432) instead of pooler."""
    print("\n" + "=" * 60)
    print("TEST 2: Direct connection (port 5432 instead of 6543)")
    print("=" * 60)

    try:
        import asyncpg
    except ImportError:
        return False

    parsed = urlparse(url)
    password = unquote(parsed.password) if parsed.password else None

    # Try direct connection host (different from pooler)
    # Supabase direct host format: db.[project-ref].supabase.co
    project_ref = parsed.username.split('.')[1] if '.' in parsed.username else None

    if not project_ref:
        print("   Could not extract project reference from username")
        return False

    direct_host = f"db.{project_ref}.supabase.co"
    print(f"   Trying direct host: {direct_host}:5432")

    try:
        ssl_ctx = _create_ssl_context_none()

        conn = await asyncio.wait_for(
            asyncpg.connect(
                host=direct_host,
                port=5432,
                user="postgres",  # Direct connection uses just 'postgres'
                password=password,
                database=parsed.path.lstrip('/'),
                ssl=ssl_ctx,
                timeout=15,
            ),
            timeout=20
        )

        result = await conn.fetchval("SELECT 1")
        print(f"   ✓ Direct connection works! Result: {result}")
        await conn.close()
        return True

    except asyncio.TimeoutError:
        print(f"   ❌ Direct connection timed out")
        print("   This suggests the Supabase project may be PAUSED")
        print("   → Go to Supabase Dashboard and check if project needs to be resumed")
    except Exception as e:
        print(f"   ❌ Direct connection failed: {type(e).__name__}: {str(e)[:100]}")

    return False


async def test_psql_equivalent():
    """Show the equivalent psql command for manual testing."""
    print("\n" + "=" * 60)
    print("MANUAL TEST COMMAND")
    print("=" * 60)

    parsed = urlparse(TEST_URL)
    password = unquote(parsed.password) if parsed.password else ""

    print("\nTry this command in terminal to test manually:")
    print(f"\nPGPASSWORD='{password}' psql -h {parsed.hostname} -p {parsed.port} -U {parsed.username} -d {parsed.path.lstrip('/')}")
    print("\nOr with the pooler URL:")
    print(f"\npsql 'postgresql://{parsed.username}:{parsed.password}@{parsed.hostname}:{parsed.port}{parsed.path}?sslmode=require'")


async def check_supabase_status():
    """Check if there might be Supabase issues."""
    print("\n" + "=" * 60)
    print("SUPABASE PROJECT STATUS CHECK")
    print("=" * 60)

    print("\n⚠️  Common reasons for connection timeout:")
    print("   1. Project is PAUSED (free tier pauses after 1 week of inactivity)")
    print("   2. Project region mismatch")
    print("   3. Network/firewall blocking")
    print("   4. Wrong credentials")

    print("\n📋 To check your project:")
    print("   1. Go to: https://supabase.com/dashboard/projects")
    print("   2. Find your project and check if it says 'Paused'")
    print("   3. If paused, click 'Restore project'")
    print("   4. Verify the password in Project Settings > Database")


async def test_dns_resolution(hostname: str):
    """Test DNS resolution."""
    print("\n" + "=" * 60)
    print("TEST 3: DNS Resolution")
    print("=" * 60)

    try:
        print(f"\n   Resolving {hostname}...")
        ips = socket.gethostbyname_ex(hostname)
        print(f"   ✓ Hostname resolved to: {ips[2]}")
        return True
    except socket.gaierror as e:
        print(f"   ❌ DNS resolution failed: {e}")
        return False


async def test_port_connectivity(hostname: str, port: int):
    """Test TCP port connectivity."""
    print("\n" + "=" * 60)
    print("TEST 4: Port Connectivity")
    print("=" * 60)

    try:
        print(f"\n   Testing TCP connection to {hostname}:{port}...")
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        result = sock.connect_ex((hostname, port))
        sock.close()

        if result == 0:
            print(f"   ✓ Port {port} is open and accepting connections")
            return True
        else:
            print(f"   ❌ Port {port} is not accessible (error code: {result})")
            return False
    except Exception as e:
        print(f"   ❌ Port connectivity test failed: {e}")
        return False


async def main():
    print("\n" + "=" * 60)
    print("SUPABASE CONNECTION DIAGNOSTICS")
    print("=" * 60)

    # Parse and analyze URL
    parsed = parse_and_display_url(TEST_URL)

    # Run tests
    results = {}

    # Test psycopg2 connection (synchronous)
    results['psycopg2'] = test_psycopg2_connection(TEST_URL)

    # Test DNS
    results['dns'] = await test_dns_resolution(parsed.hostname)

    # Test port
    results['port'] = await test_port_connectivity(parsed.hostname, parsed.port)

    # Test raw connection with multiple SSL options
    results['asyncpg'] = await test_raw_connection_with_options(TEST_URL)

    # Try direct connection if pooler fails
    if not results['asyncpg']:
        results['direct'] = await test_direct_port_connection(TEST_URL)

    # Show manual test command
    await test_psql_equivalent()

    # Check Supabase status
    await check_supabase_status()

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)

    passed = sum(1 for v in results.values() if v)
    total = len(results)
    print(f"\nTests passed: {passed}/{total}")

    for name, result in results.items():
        status = "✓" if result else "❌"
        print(f"   {status} {name}")

    if results.get('psycopg2') or results.get('asyncpg'):
        print("\n✓ Connection works! Update your .env file with:")
        print(f"DATABASE_URL={TEST_URL}")
    elif results.get('dns') and results.get('port') and not (results.get('psycopg2') or results.get('asyncpg')):
        print("\n❌ Network is reachable but database connection fails.")
        print("   Most likely cause: SUPABASE PROJECT IS PAUSED")
        print("   → Go to https://supabase.com/dashboard and restore your project")


if __name__ == "__main__":
    asyncio.run(main())
