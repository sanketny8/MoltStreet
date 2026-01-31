#!/usr/bin/env python3
"""Test Supabase connection with psycopg2"""

import psycopg2

# Simple connection test
conn = psycopg2.connect(
    'postgresql://postgres.iwjrbvfnwneysnbnourt:QmbKLuyQ8pGaKqc2@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=require'
)
print('SUCCESS! Connection works!')
conn.close()
