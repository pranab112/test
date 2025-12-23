#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Railway Deployment Automation via API
Works on Windows with proper encoding
"""

import os
import sys
import json
import time
import requests
from datetime import datetime

# Set UTF-8 for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Railway API Configuration
RAILWAY_API_URL = "https://backboard.railway.app/graphql/v2"
RAILWAY_TOKEN = "f2155410-17eb-40df-aa2f-5ad81fb28826"

class RailwayAPI:
    def __init__(self, token):
        self.token = token
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    def query(self, gql_query, variables=None):
        """Execute GraphQL query"""
        payload = {
            "query": gql_query,
            "variables": variables or {}
        }

        try:
            response = requests.post(
                RAILWAY_API_URL,
                headers=self.headers,
                json=payload,
                timeout=30
            )

            if response.status_code == 200:
                return response.json()
            else:
                print(f"[ERROR] API returned status {response.status_code}")
                print(f"Response: {response.text}")
                return None

        except Exception as e:
            print(f"[ERROR] Request failed: {e}")
            return None

    def get_projects(self):
        """Get all projects"""
        query = """
        query {
            me {
                projects {
                    edges {
                        node {
                            id
                            name
                            description
                        }
                    }
                }
            }
        }
        """

        print("\n[INFO] Fetching projects...")
        result = self.query(query)

        if result and 'data' in result and result['data'].get('me'):
            projects = result['data']['me']['projects']['edges']

            print(f"\n[SUCCESS] Found {len(projects)} project(s):\n")
            for idx, edge in enumerate(projects, 1):
                project = edge['node']
                print(f"{idx}. {project['name']} (ID: {project['id']})")

            return projects
        else:
            print("[ERROR] Failed to fetch projects")
            if result:
                print(f"Response: {json.dumps(result, indent=2)}")
            return []

    def get_services(self, project_id):
        """Get services in a project"""
        query = """
        query($projectId: String!) {
            project(id: $projectId) {
                services {
                    edges {
                        node {
                            id
                            name
                        }
                    }
                }
            }
        }
        """

        print(f"\n[INFO] Fetching services for project {project_id}...")
        result = self.query(query, {"projectId": project_id})

        if result and 'data' in result:
            services = result['data']['project']['services']['edges']

            print(f"\n[SUCCESS] Found {len(services)} service(s):\n")
            for idx, edge in enumerate(services, 1):
                service = edge['node']
                print(f"{idx}. {service['name']} (ID: {service['id']})")

            return services
        else:
            print("[ERROR] Failed to fetch services")
            return []

    def get_deployments(self, environment_id, limit=5):
        """Get deployments for an environment"""
        query = """
        query($environmentId: String!, $first: Int) {
            deployments(input: {environmentId: $environmentId}, first: $first) {
                edges {
                    node {
                        id
                        status
                        createdAt
                        url
                    }
                }
            }
        }
        """

        print(f"\n[INFO] Fetching deployments...")
        result = self.query(query, {
            "environmentId": environment_id,
            "first": limit
        })

        if result and 'data' in result:
            deployments = result['data']['deployments']['edges']

            print(f"\n[SUCCESS] Found {len(deployments)} deployment(s):\n")
            for idx, edge in enumerate(deployments, 1):
                dep = edge['node']
                print(f"{idx}. Status: {dep['status']} | ID: {dep['id']}")
                if dep.get('url'):
                    print(f"   URL: {dep['url']}")

            return deployments
        else:
            print("[ERROR] Failed to fetch deployments")
            return []

    def get_logs(self, deployment_id, limit=100):
        """Get logs for a deployment"""
        query = """
        query($deploymentId: String!, $limit: Int) {
            deploymentLogs(deploymentId: $deploymentId, limit: $limit) {
                logs {
                    timestamp
                    message
                }
            }
        }
        """

        print(f"\n[INFO] Fetching logs for deployment {deployment_id}...")
        result = self.query(query, {
            "deploymentId": deployment_id,
            "limit": limit
        })

        if result and 'data' in result:
            logs = result['data'].get('deploymentLogs', {}).get('logs', [])

            if logs:
                print("\n" + "="*80)
                print("DEPLOYMENT LOGS")
                print("="*80 + "\n")

                for log in logs:
                    timestamp = log.get('timestamp', 'N/A')
                    message = log.get('message', '')
                    print(f"[{timestamp}] {message}")

                print("\n" + "="*80)
                return logs
            else:
                print("[WARN] No logs available")
                return []
        else:
            print("[ERROR] Failed to fetch logs")
            return []

    def trigger_deploy(self, service_id):
        """Trigger a new deployment"""
        mutation = """
        mutation($serviceId: String!) {
            serviceInstanceRedeploy(serviceId: $serviceId)
        }
        """

        print(f"\n[INFO] Triggering deployment...")
        result = self.query(mutation, {"serviceId": service_id})

        if result and 'data' in result:
            print("[SUCCESS] Deployment triggered!")
            return True
        else:
            print("[ERROR] Failed to trigger deployment")
            return False

def interactive_menu():
    """Interactive Railway management"""
    print("="*80)
    print("RAILWAY DEPLOYMENT AUTOMATION")
    print("="*80)

    api = RailwayAPI(RAILWAY_TOKEN)

    # Test authentication
    print("\n[INFO] Testing authentication...")
    projects = api.get_projects()

    if not projects:
        print("\n[ERROR] Authentication failed or no projects found")
        print("\nPossible issues:")
        print("1. Invalid or expired token")
        print("2. No projects in your account")
        print("3. Token doesn't have required permissions")
        return

    # Select project
    if len(projects) == 1:
        project_id = projects[0]['node']['id']
        project_name = projects[0]['node']['name']
        print(f"\n[AUTO] Selected project: {project_name}")
    else:
        try:
            choice = int(input(f"\nSelect project (1-{len(projects)}): "))
            project = projects[choice - 1]['node']
            project_id = project['id']
            project_name = project['name']
        except (ValueError, IndexError, KeyboardInterrupt):
            print("\n[ERROR] Invalid selection")
            return

    # Get services
    services = api.get_services(project_id)

    if not services:
        print("\n[ERROR] No services found")
        return

    # Select service
    if len(services) == 1:
        service_id = services[0]['node']['id']
        service_name = services[0]['node']['name']
        print(f"\n[AUTO] Selected service: {service_name}")
    else:
        try:
            choice = int(input(f"\nSelect service (1-{len(services)}): "))
            service = services[choice - 1]['node']
            service_id = service['id']
            service_name = service['name']
        except (ValueError, IndexError, KeyboardInterrupt):
            print("\n[ERROR] Invalid selection")
            return

    # Main menu
    while True:
        print("\n" + "="*80)
        print(f"PROJECT: {project_name} | SERVICE: {service_name}")
        print("="*80)
        print("\nACTIONS:")
        print("1. View recent deployments")
        print("2. View deployment logs")
        print("3. Trigger new deployment")
        print("4. Monitor latest deployment")
        print("0. Exit")
        print()

        try:
            action = input("Choose action (0-4): ").strip()
        except KeyboardInterrupt:
            print("\n\nGoodbye!")
            return

        if action == "1":
            # Note: We need environment ID, not service ID
            # This is a simplified version - you may need to get environment first
            print("\n[INFO] To view deployments, we need the environment ID")
            print("[INFO] This requires additional API calls")
            print("[TODO] Implement environment selection")

        elif action == "2":
            deployment_id = input("\nEnter deployment ID: ").strip()
            if deployment_id:
                api.get_logs(deployment_id)

        elif action == "3":
            confirm = input("\n[WARN] Trigger new deployment? (yes/no): ")
            if confirm.lower() == 'yes':
                api.trigger_deploy(service_id)

        elif action == "4":
            print("\n[INFO] Monitoring requires environment ID")
            print("[TODO] Implement environment-based monitoring")

        elif action == "0":
            print("\nGoodbye!")
            break

        else:
            print("[ERROR] Invalid action")

if __name__ == "__main__":
    try:
        interactive_menu()
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
    except Exception as e:
        print(f"\n[FATAL ERROR] {e}")
        import traceback
        traceback.print_exc()
