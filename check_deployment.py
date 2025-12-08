#!/usr/bin/env python3
import requests
import time

# Railway project URL
PROJECT_URL = "https://railway.com/project/737397c5-f143-447a-9cd3-6ca364c9fb00"
SERVICE_ID = "0f7353fe-4ef0-4ade-81cd-ca8cffe31804"

print("="*80)
print("RAILWAY DEPLOYMENT STATUS")
print("="*80)
print(f"\nProject URL: {PROJECT_URL}")
print(f"Service ID: {SERVICE_ID}")
print("\n" + "="*80)
print("ENVIRONMENT VARIABLES SET:")
print("="*80)

variables = {
    "ENVIRONMENT": "production",
    "SECRET_KEY": "8d440925...f088 (set)",
    "CREDENTIAL_ENCRYPTION_KEY": "Z_iT0VG...wks= (set)",
    "ALGORITHM": "HS256",
    "ACCESS_TOKEN_EXPIRE_MINUTES": "30",
    "ENABLE_RATE_LIMITING": "True",
    "LOG_LEVEL": "INFO"
}

for key, value in variables.items():
    print(f"✓ {key} = {value}")

print("\n" + "="*80)
print("MISSING VARIABLES (need deployment URL):")
print("="*80)
print("✗ CORS_ORIGINS (waiting for domain)")
print("✗ BASE_URL (waiting for domain)")
print("✗ DATABASE_URL (should be auto-set by Postgres service)")

print("\n" + "="*80)
print("NEXT STEPS:")
print("="*80)
print("1. Go to Railway dashboard")
print(f"2. Open: {PROJECT_URL}")
print("3. Click 'casino-royal' service")
print("4. Go to Settings → Domains → Generate Domain")
print("5. Copy the domain and tell me")
print("6. I'll set CORS_ORIGINS and BASE_URL with that domain")
print("\n" + "="*80)
