#!/usr/bin/env python3
"""
Render Deployment Monitor
Monitors Render deployment status, logs, and health checks using Render API
"""

import requests
import time
import json
import sys
from datetime import datetime

# Configuration
RENDER_API_KEY = "rnd_fNz7RHC04kesLR5io8s2TOf8AaK1"
RENDER_API_BASE = "https://api.render.com/v1"
HEADERS = {
    "Authorization": f"Bearer {RENDER_API_KEY}",
    "Accept": "application/json"
}

def print_section(title):
    """Print a formatted section header"""
    print(f"\n{'='*80}")
    print(f"  {title}")
    print(f"{'='*80}\n")

def get_services():
    """Get all Render services"""
    print_section("📋 Fetching Render Services")

    response = requests.get(f"{RENDER_API_BASE}/services", headers=HEADERS)

    if response.status_code != 200:
        print(f"❌ Error fetching services: {response.status_code}")
        print(f"Response: {response.text}")
        return None

    services = response.json()

    if not services:
        print("⚠️  No services found")
        return None

    print(f"✅ Found {len(services)} service(s):\n")

    for i, service in enumerate(services, 1):
        print(f"{i}. Name: {service['service'].get('name', 'N/A')}")
        print(f"   ID: {service['service'].get('id', 'N/A')}")
        print(f"   Type: {service['service'].get('type', 'N/A')}")
        print(f"   State: {service['service'].get('serviceDetails', {}).get('state', 'N/A')}")
        print(f"   URL: {service['service'].get('serviceDetails', {}).get('url', 'N/A')}")
        print()

    return services

def get_service_details(service_id):
    """Get detailed information about a service"""
    print_section(f"🔍 Service Details: {service_id}")

    response = requests.get(f"{RENDER_API_BASE}/services/{service_id}", headers=HEADERS)

    if response.status_code != 200:
        print(f"❌ Error fetching service details: {response.status_code}")
        return None

    service = response.json()['service']

    print(f"Name: {service.get('name')}")
    print(f"Type: {service.get('type')}")
    print(f"Region: {service.get('serviceDetails', {}).get('region', 'N/A')}")
    print(f"Branch: {service.get('serviceDetails', {}).get('autoDeploy', 'N/A')}")
    print(f"Build Command: {service.get('serviceDetails', {}).get('buildCommand', 'N/A')}")
    print(f"Start Command: {service.get('serviceDetails', {}).get('startCommand', 'N/A')}")
    print(f"URL: {service.get('serviceDetails', {}).get('url', 'N/A')}")
    print(f"Created: {service.get('createdAt', 'N/A')}")
    print(f"Updated: {service.get('updatedAt', 'N/A')}")

    return service

def get_deploys(service_id, limit=10):
    """Get recent deployments for a service"""
    print_section(f"🚀 Recent Deployments (Last {limit})")

    response = requests.get(
        f"{RENDER_API_BASE}/services/{service_id}/deploys",
        headers=HEADERS,
        params={"limit": limit}
    )

    if response.status_code != 200:
        print(f"❌ Error fetching deployments: {response.status_code}")
        return None

    deploys = response.json()

    if not deploys:
        print("⚠️  No deployments found")
        return None

    for i, deploy in enumerate(deploys, 1):
        deploy_data = deploy['deploy']
        status = deploy_data.get('status', 'unknown')
        status_emoji = {
            'live': '✅',
            'building': '🔨',
            'deploying': '🚀',
            'failed': '❌',
            'cancelled': '🚫'
        }.get(status, '❓')

        print(f"{i}. {status_emoji} Deploy ID: {deploy_data.get('id', 'N/A')}")
        print(f"   Status: {status}")
        print(f"   Commit: {deploy_data.get('commit', {}).get('id', 'N/A')[:8]}")
        print(f"   Message: {deploy_data.get('commit', {}).get('message', 'N/A')[:60]}")
        print(f"   Created: {deploy_data.get('createdAt', 'N/A')}")
        print(f"   Finished: {deploy_data.get('finishedAt', 'In Progress')}")
        print()

    return deploys

def get_deploy_logs(service_id, deploy_id):
    """Get logs for a specific deployment"""
    print_section(f"📝 Deployment Logs: {deploy_id}")

    response = requests.get(
        f"{RENDER_API_BASE}/services/{service_id}/deploys/{deploy_id}/logs",
        headers=HEADERS
    )

    if response.status_code != 200:
        print(f"❌ Error fetching deployment logs: {response.status_code}")
        return None

    # Note: Render API returns logs as plain text
    logs = response.text

    print(logs)
    return logs

def monitor_latest_deploy(service_id, poll_interval=10, max_wait=600):
    """Monitor the latest deployment until completion"""
    print_section("⏳ Monitoring Latest Deployment")

    start_time = time.time()
    previous_status = None

    while (time.time() - start_time) < max_wait:
        response = requests.get(
            f"{RENDER_API_BASE}/services/{service_id}/deploys",
            headers=HEADERS,
            params={"limit": 1}
        )

        if response.status_code != 200:
            print(f"❌ Error checking deployment status: {response.status_code}")
            time.sleep(poll_interval)
            continue

        deploys = response.json()

        if not deploys:
            print("⚠️  No deployments found")
            return False

        latest_deploy = deploys[0]['deploy']
        status = latest_deploy.get('status', 'unknown')
        deploy_id = latest_deploy.get('id')

        if status != previous_status:
            timestamp = datetime.now().strftime("%H:%M:%S")
            print(f"[{timestamp}] Deploy {deploy_id[:8]}: {status.upper()}")
            previous_status = status

        if status == 'live':
            print(f"\n✅ Deployment successful!")
            print(f"   Deploy ID: {deploy_id}")
            print(f"   Duration: {int(time.time() - start_time)}s")
            return True

        if status == 'failed':
            print(f"\n❌ Deployment failed!")
            print(f"   Deploy ID: {deploy_id}")
            print(f"\n📝 Fetching failure logs...\n")
            get_deploy_logs(service_id, deploy_id)
            return False

        if status == 'cancelled':
            print(f"\n🚫 Deployment cancelled!")
            return False

        time.sleep(poll_interval)

    print(f"\n⏱️  Timeout: Deployment monitoring exceeded {max_wait}s")
    return False

def check_health(service_url):
    """Check service health endpoint"""
    print_section("🏥 Health Check")

    health_url = f"{service_url}/health"

    print(f"Checking: {health_url}")

    try:
        response = requests.get(health_url, timeout=10)

        if response.status_code == 200:
            print(f"✅ Health check passed!")
            print(f"Response: {response.text}")
            return True
        else:
            print(f"⚠️  Health check returned status {response.status_code}")
            print(f"Response: {response.text}")
            return False

    except requests.exceptions.RequestException as e:
        print(f"❌ Health check failed: {e}")
        return False

def check_database_status(service_id):
    """Check if database is connected (via env vars)"""
    print_section("🗄️  Database Configuration")

    response = requests.get(
        f"{RENDER_API_BASE}/services/{service_id}/env-vars",
        headers=HEADERS
    )

    if response.status_code != 200:
        print(f"❌ Error fetching environment variables: {response.status_code}")
        return False

    env_vars = response.json()

    database_vars = [
        'DATABASE_URL',
        'SECRET_KEY',
        'CORS_ORIGINS',
        'CREDENTIAL_ENCRYPTION_KEY',
        'ENVIRONMENT'
    ]

    found_vars = []
    missing_vars = []

    for env_var in env_vars:
        key = env_var['envVar'].get('key')
        if key in database_vars:
            found_vars.append(key)

    for var in database_vars:
        if var not in found_vars:
            missing_vars.append(var)

    print(f"✅ Found environment variables: {', '.join(found_vars)}")

    if missing_vars:
        print(f"⚠️  Missing environment variables: {', '.join(missing_vars)}")
        return False

    print(f"\n✅ All required environment variables are configured")
    return True

def main():
    """Main execution flow"""
    print_section("🎯 Render Deployment Monitor")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Step 1: Get all services
    services = get_services()
    if not services:
        print("❌ No services found. Exiting.")
        sys.exit(1)

    # Use the first service (or let user select)
    service_id = services[0]['service']['id']
    service_url = services[0]['service']['serviceDetails'].get('url', '')

    # Step 2: Get service details
    service = get_service_details(service_id)

    # Step 3: Check database configuration
    check_database_status(service_id)

    # Step 4: Get recent deployments
    deploys = get_deploys(service_id, limit=5)

    if deploys:
        latest_deploy = deploys[0]['deploy']
        latest_status = latest_deploy.get('status')
        latest_deploy_id = latest_deploy.get('id')

        # Step 5: Monitor if currently deploying
        if latest_status in ['building', 'deploying']:
            success = monitor_latest_deploy(service_id, poll_interval=10, max_wait=600)

            if not success:
                print(f"\n📝 Fetching detailed logs...")
                get_deploy_logs(service_id, latest_deploy_id)
        else:
            print(f"\n📊 Latest deployment status: {latest_status.upper()}")

            if latest_status == 'failed':
                print(f"\n📝 Fetching failure logs...")
                get_deploy_logs(service_id, latest_deploy_id)

    # Step 6: Health check
    if service_url:
        time.sleep(5)  # Wait for service to stabilize
        check_health(service_url)

    print_section("✅ Monitoring Complete")
    print(f"Finished: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Monitoring interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
