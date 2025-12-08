#!/usr/bin/env python3
"""
Get DATABASE_URL from Railway Postgres services and set it for casino-royal service
"""
import subprocess
import json
import sys

# First, link to casino-royal service
print("Linking to casino-royal service...")
subprocess.run(["railway", "link", "--service", "casino-royal"], check=False)

# Get all services in the project
print("\n" + "="*80)
print("Getting all services in casino-royal project...")
print("="*80)

# Try to get variables from postgres services
postgres_services = ["postgres", "Postgres", "postgres-RMmb", "PostgreSQL"]

database_url = None

for service_name in postgres_services:
    try:
        print(f"\nTrying service: {service_name}...")
        result = subprocess.run(
            ["railway", "variables", "--service", service_name, "--json"],
            capture_output=True,
            text=True,
            check=False
        )

        if result.returncode == 0:
            vars_data = json.loads(result.stdout)
            print(f"✓ Found service: {service_name}")
            print(f"Variables: {list(vars_data.keys())}")

            # Look for DATABASE_URL or connection string variables
            for key in ["DATABASE_URL", "POSTGRES_URL", "DATABASE_PRIVATE_URL"]:
                if key in vars_data:
                    database_url = vars_data[key]
                    print(f"\n{'='*80}")
                    print(f"✓ FOUND DATABASE_URL in {service_name}!")
                    print(f"{'='*80}")
                    print(f"Key: {key}")
                    print(f"Value: {database_url[:50]}...")
                    break

            if database_url:
                break
    except Exception as e:
        print(f"✗ Error checking {service_name}: {e}")

if database_url:
    print("\n" + "="*80)
    print("Setting DATABASE_URL for casino-royal service...")
    print("="*80)

    # Set the DATABASE_URL for casino-royal service
    try:
        result = subprocess.run(
            ["railway", "variables", "--service", "casino-royal", "--set", f"DATABASE_URL={database_url}"],
            capture_output=True,
            text=True,
            check=True
        )
        print("✓ DATABASE_URL set successfully!")
        print("\n" + "="*80)
        print("Verifying casino-royal variables...")
        print("="*80)

        # Verify it was set
        result = subprocess.run(
            ["railway", "variables", "--service", "casino-royal", "--json"],
            capture_output=True,
            text=True,
            check=True
        )

        vars_data = json.loads(result.stdout)
        if "DATABASE_URL" in vars_data:
            print("✓ DATABASE_URL confirmed in casino-royal service!")
            print(f"Value: {vars_data['DATABASE_URL'][:50]}...")
            print("\n🚀 Deployment will now restart automatically!")
        else:
            print("✗ DATABASE_URL not found after setting")

    except Exception as e:
        print(f"✗ Error setting DATABASE_URL: {e}")
        sys.exit(1)
else:
    print("\n" + "="*80)
    print("✗ Could not find DATABASE_URL in any Postgres service")
    print("="*80)
    print("\nPlease provide the DATABASE_URL manually:")
    print("1. Go to Railway dashboard")
    print("2. Click on one of the Postgres services")
    print("3. Go to 'Connect' or 'Variables' tab")
    print("4. Copy the DATABASE_URL or connection string")
    print("5. Run:")
    print('   railway variables --service casino-royal --set "DATABASE_URL=<paste-url-here>"')
    sys.exit(1)
