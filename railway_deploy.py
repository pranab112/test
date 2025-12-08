#!/usr/bin/env python3
"""
Railway Deployment Automation Script
Deploys and monitors Railway projects via GraphQL API
"""

import os
import sys
import json
import time
import requests
from datetime import datetime

# Railway API Configuration
RAILWAY_API_URL = "https://backboard.railway.app/graphql/v2"
RAILWAY_TOKEN = "f2155410-17eb-40df-aa2f-5ad81fb28826"

class RailwayDeployer:
    def __init__(self, token):
        self.token = token
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    def graphql_query(self, query, variables=None):
        """Execute GraphQL query"""
        payload = {
            "query": query,
            "variables": variables or {}
        }

        try:
            response = requests.post(
                RAILWAY_API_URL,
                headers=self.headers,
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"❌ API Error: {e}")
            if hasattr(e.response, 'text'):
                print(f"Response: {e.response.text}")
            return None

    def get_projects(self):
        """Get all projects"""
        query = """
        query {
            projects {
                edges {
                    node {
                        id
                        name
                        description
                        createdAt
                    }
                }
            }
        }
        """

        print("📋 Fetching Railway projects...")
        result = self.graphql_query(query)

        if result and 'data' in result:
            projects = result['data']['projects']['edges']
            print(f"\n✅ Found {len(projects)} project(s):\n")

            for idx, edge in enumerate(projects, 1):
                project = edge['node']
                print(f"{idx}. {project['name']}")
                print(f"   ID: {project['id']}")
                print(f"   Created: {project.get('createdAt', 'N/A')}")
                print()

            return projects
        else:
            print("❌ Failed to fetch projects")
            return []

    def get_project_details(self, project_id):
        """Get detailed project information"""
        query = """
        query($projectId: String!) {
            project(id: $projectId) {
                id
                name
                description
                services {
                    edges {
                        node {
                            id
                            name
                            icon
                        }
                    }
                }
            }
        }
        """

        print(f"🔍 Fetching project details...")
        result = self.graphql_query(query, {"projectId": project_id})

        if result and 'data' in result:
            project = result['data']['project']
            print(f"\n✅ Project: {project['name']}")

            if project.get('services'):
                services = project['services']['edges']
                print(f"\n📦 Services ({len(services)}):")
                for idx, edge in enumerate(services, 1):
                    service = edge['node']
                    print(f"  {idx}. {service['name']} (ID: {service['id']})")

            return project
        else:
            print("❌ Failed to fetch project details")
            return None

    def get_service_deployments(self, service_id, limit=5):
        """Get recent deployments for a service"""
        query = """
        query($serviceId: String!, $first: Int) {
            deployments(serviceId: $serviceId, first: $first) {
                edges {
                    node {
                        id
                        status
                        createdAt
                        staticUrl
                        meta
                    }
                }
            }
        }
        """

        print(f"\n🚀 Fetching deployments...")
        result = self.graphql_query(query, {
            "serviceId": service_id,
            "first": limit
        })

        if result and 'data' in result:
            deployments = result['data']['deployments']['edges']
            print(f"\n✅ Found {len(deployments)} recent deployment(s):\n")

            for idx, edge in enumerate(deployments, 1):
                deployment = edge['node']
                status = deployment['status']

                # Color code status
                status_icon = {
                    'SUCCESS': '✅',
                    'FAILED': '❌',
                    'BUILDING': '🔨',
                    'DEPLOYING': '🚀',
                    'CRASHED': '💥',
                    'REMOVED': '🗑️'
                }.get(status, '❓')

                print(f"{idx}. {status_icon} {status}")
                print(f"   ID: {deployment['id']}")
                print(f"   Created: {deployment.get('createdAt', 'N/A')}")
                if deployment.get('staticUrl'):
                    print(f"   URL: {deployment['staticUrl']}")
                print()

            return deployments
        else:
            print("❌ Failed to fetch deployments")
            return []

    def get_deployment_logs(self, deployment_id):
        """Get logs for a deployment"""
        query = """
        query($deploymentId: String!) {
            deploymentLogs(deploymentId: $deploymentId) {
                logs
            }
        }
        """

        print(f"\n📜 Fetching deployment logs...")
        result = self.graphql_query(query, {"deploymentId": deployment_id})

        if result and 'data' in result:
            logs = result['data'].get('deploymentLogs', {}).get('logs', '')

            if logs:
                print("\n" + "="*80)
                print("DEPLOYMENT LOGS")
                print("="*80 + "\n")
                print(logs)
                print("\n" + "="*80 + "\n")
                return logs
            else:
                print("⚠️  No logs available yet")
                return None
        else:
            print("❌ Failed to fetch logs")
            return None

    def trigger_deployment(self, service_id):
        """Trigger a new deployment"""
        mutation = """
        mutation($serviceId: String!) {
            serviceRedeploy(serviceId: $serviceId)
        }
        """

        print(f"\n🚀 Triggering deployment for service {service_id}...")
        result = self.graphql_query(mutation, {"serviceId": service_id})

        if result and 'data' in result:
            print("✅ Deployment triggered successfully!")
            return True
        else:
            print("❌ Failed to trigger deployment")
            return False

    def get_environment_variables(self, service_id):
        """Get environment variables for a service"""
        query = """
        query($serviceId: String!) {
            variables(serviceId: $serviceId) {
                edges {
                    node {
                        name
                        value
                    }
                }
            }
        }
        """

        print(f"\n🔐 Fetching environment variables...")
        result = self.graphql_query(query, {"serviceId": service_id})

        if result and 'data' in result:
            variables = result['data']['variables']['edges']
            print(f"\n✅ Found {len(variables)} environment variable(s):\n")

            for edge in variables:
                var = edge['node']
                # Mask sensitive values
                value = var['value']
                if len(value) > 20 or any(key in var['name'].lower() for key in ['key', 'secret', 'password', 'token']):
                    value = value[:8] + "..." + value[-4:] if len(value) > 12 else "***"

                print(f"  {var['name']} = {value}")

            return variables
        else:
            print("❌ Failed to fetch environment variables")
            return []

def main():
    """Main deployment automation"""
    print("=" * 80)
    print("RAILWAY DEPLOYMENT AUTOMATION")
    print("=" * 80)
    print()

    deployer = RailwayDeployer(RAILWAY_TOKEN)

    # Get projects
    projects = deployer.get_projects()

    if not projects:
        print("\n⚠️  No projects found or authentication failed")
        print("\nTroubleshooting:")
        print("1. Verify your Railway token is correct")
        print("2. Check if you have access to any projects")
        print("3. Try logging in via browser: railway login")
        return

    # Select project
    if len(projects) == 1:
        project_id = projects[0]['node']['id']
        print(f"✓ Using project: {projects[0]['node']['name']}")
    else:
        try:
            choice = int(input(f"\nSelect project (1-{len(projects)}): "))
            project_id = projects[choice - 1]['node']['id']
        except (ValueError, IndexError):
            print("❌ Invalid choice")
            return

    # Get project details
    project = deployer.get_project_details(project_id)

    if not project or not project.get('services'):
        print("❌ No services found in project")
        return

    # Select service
    services = project['services']['edges']
    if len(services) == 1:
        service_id = services[0]['node']['id']
        print(f"✓ Using service: {services[0]['node']['name']}")
    else:
        try:
            choice = int(input(f"\nSelect service (1-{len(services)}): "))
            service_id = services[choice - 1]['node']['id']
        except (ValueError, IndexError):
            print("❌ Invalid choice")
            return

    # Main menu
    while True:
        print("\n" + "=" * 80)
        print("ACTIONS")
        print("=" * 80)
        print("1. View deployments")
        print("2. View deployment logs")
        print("3. View environment variables")
        print("4. Trigger new deployment")
        print("5. Monitor latest deployment")
        print("0. Exit")
        print()

        try:
            action = input("Choose action (0-5): ").strip()
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!")
            return

        if action == "1":
            deployer.get_service_deployments(service_id, limit=10)

        elif action == "2":
            deployments = deployer.get_service_deployments(service_id, limit=5)
            if deployments:
                try:
                    choice = int(input(f"\nSelect deployment (1-{len(deployments)}): "))
                    deployment_id = deployments[choice - 1]['node']['id']
                    deployer.get_deployment_logs(deployment_id)
                except (ValueError, IndexError):
                    print("❌ Invalid choice")

        elif action == "3":
            deployer.get_environment_variables(service_id)

        elif action == "4":
            confirm = input("\n⚠️  Trigger new deployment? (yes/no): ")
            if confirm.lower() == 'yes':
                if deployer.trigger_deployment(service_id):
                    print("\n✅ Deployment started!")
                    print("Use action 5 to monitor progress")

        elif action == "5":
            print("\n🔄 Monitoring deployment (Ctrl+C to stop)...")
            try:
                last_status = None
                while True:
                    deployments = deployer.get_service_deployments(service_id, limit=1)
                    if deployments:
                        deployment = deployments[0]['node']
                        status = deployment['status']

                        if status != last_status:
                            timestamp = datetime.now().strftime("%H:%M:%S")
                            print(f"\n[{timestamp}] Status: {status}")

                            if status in ['SUCCESS', 'FAILED', 'CRASHED']:
                                print(f"\n✓ Deployment finished with status: {status}")

                                # Show logs
                                deployer.get_deployment_logs(deployment['id'])
                                break

                            last_status = status

                    time.sleep(5)
            except KeyboardInterrupt:
                print("\n\n⏸️  Monitoring stopped")

        elif action == "0":
            print("\n👋 Goodbye!")
            break

        else:
            print("❌ Invalid action")

if __name__ == "__main__":
    main()
