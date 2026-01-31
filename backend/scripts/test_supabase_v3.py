#!/usr/bin/env python3
"""
Final diagnostic - test different password formats and connection string styles.
"""

import ssl
from urllib.parse import unquote

def test_with_different_passwords():
    """Test with different password encoding approaches."""
    print("\n" + "=" * 60)
    print("TEST: Different password formats with psycopg2")
    print("=" * 60)

    try:
        import psycopg2
    except ImportError:
        print("❌ psycopg2 not installed")
        return

    host = "aws-1-ap-southeast-2.pooler.supabase.com"
    port = 6543
    user = "postgres.iwjrbvfnwneysnbnourt"
    database = "postgres"

    # Different password variations to try
    passwords = [
        ("URL-decoded: MoltStreet@123", "MoltStreet@123"),
        ("Raw as provided", "MoltStreet%40123"),
        ("Just alphanumeric test", "MoltStreet123"),  # In case the @ is the issue
    ]

    for name, password in passwords:
        print(f"\n   Trying: {name}")
        try:
            conn = psycopg2.connect(
                host=host,
                port=port,
                user=user,
                password=password,
                dbname=database,
                sslmode='require',
                connect_timeout=15,
            )
            print(f"   ✓ SUCCESS with password: {name}")
            cur = conn.cursor()
            cur.execute("SELECT 1")
            print(f"   ✓ Query works!")
            conn.close()
            return True
        except psycopg2.OperationalError as e:
            error_msg = str(e)
            if "password authentication failed" in error_msg.lower():
                print(f"   ❌ Wrong password")
            elif "closed the connection unexpectedly" in error_msg:
                print(f"   ❌ Connection closed by server (auth failed or SSL issue)")
            else:
                print(f"   ❌ Error: {error_msg[:100]}")
        except Exception as e:
            print(f"   ❌ {type(e).__name__}: {e}")

    return False


def test_connection_string_format():
    """Test using full connection string instead of individual params."""
    print("\n" + "=" * 60)
    print("TEST: Connection string format (DSN)")
    print("=" * 60)

    try:
        import psycopg2
    except ImportError:
        return False

    # Try different connection string formats
    connection_strings = [
        # Standard format
        (
            "Standard URI",
            "postgresql://postgres.iwjrbvfnwneysnbnourt:MoltStreet%40123@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=require"
        ),
        # With connection timeout
        (
            "URI with timeout",
            "postgresql://postgres.iwjrbvfnwneysnbnourt:MoltStreet%40123@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=require&connect_timeout=30"
        ),
        # DSN format
        (
            "DSN format",
            "host=aws-1-ap-southeast-2.pooler.supabase.com port=6543 dbname=postgres user=postgres.iwjrbvfnwneysnbnourt password=MoltStreet@123 sslmode=require"
        ),
    ]

    for name, dsn in connection_strings:
        print(f"\n   Trying: {name}")
        try:
            conn = psycopg2.connect(dsn)
            print(f"   ✓ SUCCESS!")
            cur = conn.cursor()
            cur.execute("SELECT current_user, current_database()")
            result = cur.fetchone()
            print(f"   ✓ Connected as: {result[0]} to database: {result[1]}")
            conn.close()
            return True
        except psycopg2.OperationalError as e:
            error_msg = str(e)
            if "password authentication failed" in error_msg.lower():
                print(f"   ❌ Password authentication failed")
            elif "closed the connection unexpectedly" in error_msg:
                print(f"   ❌ Server closed connection")
            elif "SSL" in error_msg:
                print(f"   ❌ SSL error: {error_msg[:80]}")
            else:
                print(f"   ❌ {error_msg[:100]}")
        except Exception as e:
            print(f"   ❌ {type(e).__name__}: {str(e)[:100]}")

    return False


def test_ssl_modes():
    """Test different SSL modes."""
    print("\n" + "=" * 60)
    print("TEST: Different SSL modes")
    print("=" * 60)

    try:
        import psycopg2
    except ImportError:
        return False

    host = "aws-1-ap-southeast-2.pooler.supabase.com"
    port = 6543
    user = "postgres.iwjrbvfnwneysnbnourt"
    password = "MoltStreet@123"
    database = "postgres"

    ssl_modes = ['require', 'verify-ca', 'verify-full', 'prefer', 'allow', 'disable']

    for sslmode in ssl_modes:
        print(f"\n   Trying sslmode={sslmode}...")
        try:
            conn = psycopg2.connect(
                host=host,
                port=port,
                user=user,
                password=password,
                dbname=database,
                sslmode=sslmode,
                connect_timeout=10,
            )
            print(f"   ✓ SUCCESS with sslmode={sslmode}!")
            conn.close()
            return True
        except psycopg2.OperationalError as e:
            error_msg = str(e).split('\n')[0]
            print(f"   ❌ {error_msg[:80]}")
        except Exception as e:
            print(f"   ❌ {type(e).__name__}: {str(e)[:60]}")

    return False


def check_password_in_supabase():
    """Instructions for verifying password."""
    print("\n" + "=" * 60)
    print("PASSWORD VERIFICATION STEPS")
    print("=" * 60)

    print("""
The connection is being rejected by the server. This typically means:

1. WRONG PASSWORD
   - Go to: https://supabase.com/dashboard
   - Select your project
   - Go to: Project Settings > Database
   - Click "Reset database password" to set a new one
   - Update your connection string with the new password

2. OR TRY THE CONNECTION STRING FROM SUPABASE DIRECTLY:
   - Go to: Project Settings > Database
   - Copy the "URI" connection string directly
   - It should look like:
     postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

3. CHECK IF IP RESTRICTIONS ARE ENABLED:
   - Go to: Project Settings > Database
   - Check "Network Restrictions" section
   - If enabled, add your IP address

4. THE PASSWORD YOU PROVIDED:
   - Password: MoltStreet@123
   - URL-encoded: MoltStreet%40123
   - Make sure this matches what's in Supabase dashboard
""")


def main():
    print("\n" + "=" * 60)
    print("SUPABASE CONNECTION STRING DIAGNOSTICS")
    print("=" * 60)

    test_with_different_passwords()
    test_connection_string_format()
    test_ssl_modes()
    check_password_in_supabase()


if __name__ == "__main__":
    main()
