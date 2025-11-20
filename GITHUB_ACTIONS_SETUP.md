# GitHub Actions CI/CD Setup Guide

**Quick Reference:** Setting up automated testing and deployment with GitHub Actions

---

## 🚀 Quick Start (10 Minutes)

### What You Get
- ✅ **Automated Testing**: Runs on every push and pull request
- ✅ **Code Quality Checks**: Linting, formatting, security scanning
- ✅ **Coverage Reports**: Track test coverage over time
- ✅ **Automatic Deployment**: Deploy to Render on every push to main
- ✅ **Build Status Badges**: Show CI/CD status in README

### Files Created
```
.github/
└── workflows/
    ├── test.yml      # Test suite, linting, security scans
    └── deploy.yml    # Render deployment automation
```

---

## 📋 Prerequisites

1. **GitHub Repository**
   - Your code must be pushed to GitHub
   - You need admin access to the repository

2. **Render Account**
   - Service deployed on Render.com
   - Connected to your GitHub repository

3. **Optional Services** (recommended):
   - Codecov account for coverage reports
   - Render API key for deployment automation

---

## ⚙️ Setup Instructions

### Step 1: Enable GitHub Actions

1. **Push workflow files to GitHub**:
   ```bash
   git add .github/
   git commit -m "Add GitHub Actions CI/CD workflows"
   git push origin main
   ```

2. **Verify workflows are enabled**:
   - Go to: https://github.com/pranab112/test/actions
   - You should see "Test Suite" and "Deploy to Render" workflows
   - First run will start automatically

### Step 2: Configure GitHub Secrets

GitHub Actions needs secrets to deploy to Render and access external services.

**Go to:** Repository > Settings > Secrets and variables > Actions > New repository secret

#### Required Secrets:

**For Codecov (optional but recommended):**
```
CODECOV_TOKEN
```
- Get from: https://codecov.io (sign in with GitHub)
- Add repository, copy token
- Enables automatic coverage report uploads

**For Render Deployment (optional - auto-deploy is default):**
```
RENDER_DEPLOY_HOOK_URL
```
- Get from: Render Dashboard > Your Service > Settings > Deploy Hook
- Format: `https://api.render.com/deploy/srv-xxxxx?key=yyyyy`
- Allows manual deployment triggers

```
RENDER_URL
```
- Your Render service URL
- Example: `https://casino-royal-backend.onrender.com`
- Used for health checks after deployment

```
RENDER_API_KEY (optional)
```
- Get from: Render Dashboard > Account Settings > API Keys
- Enables deployment status polling
- Not required for basic CI/CD

### Step 3: Update README Badges

Replace `YOUR_USERNAME` in README.md with your actual GitHub username:

```markdown
[![Test Suite](https://github.com/pranab112/test/actions/workflows/test.yml/badge.svg)](https://github.com/pranab112/test/actions/workflows/test.yml)
[![Deploy to Render](https://github.com/pranab112/test/actions/workflows/deploy.yml/badge.svg)](https://github.com/pranab112/test/actions/workflows/deploy.yml)
```

**Your repository:**
```markdown
[![Test Suite](https://github.com/pranab112/test/actions/workflows/test.yml/badge.svg)](https://github.com/pranab112/test/actions/workflows/test.yml)
```

### Step 4: Configure Render Auto-Deploy

Render automatically deploys on every push to `main` branch by default.

**Verify auto-deploy is enabled:**
1. Go to: Render Dashboard > Your Service > Settings
2. Find "Auto-Deploy" section
3. Ensure "Auto-Deploy" is **ON** for `main` branch

**Optional: Disable auto-deploy if you want manual control:**
- Turn off "Auto-Deploy" in Render Dashboard
- Use GitHub Actions `deploy.yml` workflow instead
- Trigger manually from GitHub Actions tab

---

## 🔍 Workflow Details

### Test Suite Workflow (`test.yml`)

**Triggers:**
- Every push to `main` or `develop` branches
- Every pull request to `main` or `develop` branches

**Jobs:**

1. **Test Job** (runs pytest with PostgreSQL)
   - Sets up PostgreSQL 15 test database
   - Runs Alembic migrations
   - Executes pytest with coverage
   - Uploads coverage to Codecov
   - Checks coverage threshold (70% minimum)
   - Archives HTML coverage reports

2. **Lint Job** (code quality checks)
   - **Black**: Checks code formatting
   - **isort**: Checks import sorting
   - **Flake8**: Linting and syntax errors

3. **Security Job** (vulnerability scanning)
   - **Bandit**: Security linting for Python code
   - **Safety**: Dependency vulnerability checks
   - Archives security reports

4. **Build Job** (integration test)
   - Installs all dependencies
   - Starts application with test config
   - Runs health check to verify startup
   - Only runs if test, lint, and security jobs pass

**Environment Variables Used:**
```yaml
DATABASE_URL: postgresql://test_user:test_password@localhost:5432/casino_test
SECRET_KEY: test-secret-key-for-ci-only-do-not-use-in-production
ALGORITHM: HS256
ACCESS_TOKEN_EXPIRE_MINUTES: 30
ENVIRONMENT: development
CORS_ORIGINS: http://localhost:3000,http://localhost:8000
CREDENTIAL_ENCRYPTION_KEY: gAAAAABhX1234567890abcdefGHIJKLMNOPQRSTUVWXYZ=
ENABLE_RATE_LIMITING: False
LOG_LEVEL: INFO
```

### Deployment Workflow (`deploy.yml`)

**Triggers:**
- Every push to `main` branch (automatic)
- Manual trigger from GitHub Actions tab (workflow_dispatch)

**Jobs:**

1. **Deploy Job**
   - Runs pre-deployment checks (Alembic, critical files)
   - Triggers Render deployment (if RENDER_DEPLOY_HOOK_URL set)
   - Waits for deployment to complete
   - Runs health check on live service
   - Creates deployment summary

2. **Database Backup Job** (runs after successful deploy)
   - Reminds about Render's automatic daily backups
   - Provides manual backup instructions

3. **Rollback Job** (runs if deployment fails)
   - Provides rollback instructions
   - Links to Render Dashboard for quick rollback

**Manual Deployment:**
1. Go to: https://github.com/pranab112/test/actions
2. Click "Deploy to Render" workflow
3. Click "Run workflow" button
4. Select environment (production/staging)
5. Click "Run workflow"

---

## 📊 Codecov Integration (Optional)

Codecov provides beautiful coverage reports and PR comments.

### Setup:

1. **Create Codecov Account**:
   - Go to: https://codecov.io
   - Sign in with GitHub
   - Add your repository

2. **Copy Token**:
   - Codecov > Your Repo > Settings > General
   - Copy "Repository Upload Token"

3. **Add to GitHub Secrets**:
   - GitHub > Your Repo > Settings > Secrets > Actions
   - New secret: `CODECOV_TOKEN`
   - Paste token

4. **Enable PR Comments**:
   - Codecov > Your Repo > Settings > PR Comments
   - Enable "Require CI to pass before commenting"

### Benefits:
- Coverage reports on every commit
- Automatic PR comments showing coverage changes
- Coverage history graphs
- Branch comparison
- Sunburst charts for visualizing coverage

### Free Tier:
- Unlimited public repositories
- Unlimited private repos (with limitations)
- Coverage reports
- PR comments
- Branch analysis

---

## 🛠️ Customization

### Change Test Coverage Threshold

Edit `.github/workflows/test.yml`:
```yaml
- name: Check coverage threshold
  run: |
    coverage report --fail-under=70  # Change 70 to your desired %
```

### Add More Linting Tools

Add to lint job in `.github/workflows/test.yml`:
```yaml
- name: Run pylint
  run: |
    pip install pylint
    pylint app/ --exit-zero
```

### Run Tests on More Branches

Edit triggers in `.github/workflows/test.yml`:
```yaml
on:
  push:
    branches: [ main, develop, staging, feature/* ]  # Add your branches
  pull_request:
    branches: [ main, develop ]
```

### Add Slack Notifications

Add to end of deploy job in `.github/workflows/deploy.yml`:
```yaml
- name: Notify Slack
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "Deployment to Render: ${{ job.status }}"
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Add Deployment Environments

GitHub > Your Repo > Settings > Environments > New environment

Create environments:
- `production` (requires approval)
- `staging` (auto-deploy)

Then in `.github/workflows/deploy.yml`:
```yaml
environment:
  name: production  # Requires manual approval in GitHub UI
```

---

## 🐛 Troubleshooting

### Workflow Not Running

**Problem**: Pushed code but workflow didn't trigger

**Solutions**:
1. Check GitHub Actions is enabled: Settings > Actions > General > "Allow all actions"
2. Verify branch name matches trigger: `main` or `develop`
3. Check workflow syntax: GitHub Actions tab will show parsing errors
4. Ensure `.github/workflows/` directory is in repository root

### Tests Failing in CI But Pass Locally

**Problem**: Tests pass with `pytest` locally but fail in GitHub Actions

**Common Causes**:
1. **Database differences**: CI uses PostgreSQL, local might use SQLite
   - Solution: Test locally with PostgreSQL using Docker Compose
2. **Environment variables missing**: Check `env:` section in workflow
3. **Dependency versions**: CI uses fresh install
   - Solution: Pin versions in `requirements.txt`
4. **Timezone issues**: CI runs in UTC
   - Solution: Use UTC in tests or set timezone in workflow

**Debug**:
```yaml
- name: Debug environment
  run: |
    echo "Python version: $(python --version)"
    echo "Pip packages: $(pip list)"
    echo "DATABASE_URL: $DATABASE_URL"
    env  # Print all environment variables
```

### Coverage Upload Failing

**Problem**: Codecov upload fails with 401 or 403 error

**Solutions**:
1. Verify `CODECOV_TOKEN` is correct and not expired
2. Check repository is added to Codecov account
3. Ensure token has upload permissions
4. Try regenerating token in Codecov dashboard

**Workaround**: Set `fail_ci_if_error: false` in workflow (already configured)

### Render Deployment Not Triggering

**Problem**: GitHub Actions runs but Render doesn't deploy

**Solutions**:
1. **Auto-Deploy enabled**: Check Render Dashboard > Settings > Auto-Deploy
2. **Branch mismatch**: Ensure Render is watching `main` branch
3. **Deploy hook**: If using manual trigger, verify `RENDER_DEPLOY_HOOK_URL` is correct
4. **Render service status**: Check Render dashboard for service errors

**Test Deploy Hook Manually**:
```bash
curl -X POST "YOUR_RENDER_DEPLOY_HOOK_URL"
```

### Health Check Failing After Deployment

**Problem**: Deployment succeeds but health check fails

**Solutions**:
1. **Service not ready**: Increase sleep time in workflow (currently 60s)
2. **Wrong URL**: Verify `RENDER_URL` matches your service URL
3. **Health endpoint**: Ensure `/health` endpoint exists and works
   - Test: `curl https://your-app.onrender.com/health`
4. **Cold start**: Free tier services sleep after 15min inactivity
   - Solution: Wait longer or upgrade to paid tier

**Disable Health Check** (temporary):
```yaml
# Comment out health check step in deploy.yml
# - name: Post-deployment health check
#   if: success()
#   run: |
#     ...
```

### Linting Failures Blocking Deployment

**Problem**: Code style issues prevent deployment

**Solutions**:
1. **Run locally before commit**:
   ```bash
   black app/ tests/
   isort app/ tests/
   flake8 app/ tests/
   ```

2. **Auto-fix with pre-commit hook**:
   ```bash
   pip install pre-commit
   pre-commit install
   ```

3. **Make linting non-blocking** (not recommended):
   ```yaml
   # Add to lint job
   continue-on-error: true
   ```

---

## 📈 Best Practices

### 1. Branch Protection Rules

**Recommended settings:**

GitHub > Settings > Branches > Add rule for `main`:
- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging
  - Select: `test`, `lint`, `security`, `build`
- ✅ Require branches to be up to date before merging
- ✅ Do not allow bypassing the above settings

**Benefits:**
- Prevents broken code from reaching main
- Forces code review
- Ensures all tests pass before merge

### 2. Pull Request Workflow

**Recommended process:**
1. Create feature branch: `git checkout -b feature/new-feature`
2. Make changes and commit
3. Push to GitHub: `git push origin feature/new-feature`
4. Create pull request to `main`
5. Wait for CI checks to pass (test, lint, security)
6. Request code review
7. Address review comments
8. Merge when approved and all checks pass
9. Automatic deployment to Render

### 3. Commit Message Convention

Use conventional commits for better changelogs:
```
feat: Add Stripe payment integration
fix: Resolve bcrypt password length error
docs: Update deployment guide
test: Add tests for game credentials router
chore: Update dependencies
```

### 4. Testing Strategy

**Current coverage: 5%** → **Target: 70%+**

**Priority order** (from PM_EXECUTION_PLAN.md):
1. Authentication (`app/routers/auth.py`) - Critical
2. User management (`app/routers/users.py`) - Critical
3. Friends (`app/routers/friends.py`)
4. Chat (`app/routers/chat.py`)
5. Games (`app/routers/games.py`)
6. Promotions (`app/routers/promotions.py`)

**Test types to include:**
- Unit tests (business logic)
- Integration tests (database operations)
- API endpoint tests (request/response)
- Authentication tests (JWT validation)
- Security tests (SQL injection, XSS)

### 5. Security Scanning

**Tools configured:**
- **Bandit**: Python security linting
- **Safety**: Dependency vulnerability checks

**Review reports:**
- GitHub Actions > Test Suite > security job
- Download artifact: `security-reports`

**Address findings:**
- High severity: Fix immediately
- Medium severity: Fix before production
- Low severity: Document as acceptable risk if safe

### 6. Monitoring CI/CD Performance

**Track metrics:**
- Test execution time (target: < 5 minutes)
- Deployment time (target: < 10 minutes)
- Success rate (target: > 95%)

**Optimize slow tests:**
```bash
pytest --durations=10  # Show 10 slowest tests
```

**Parallelize tests** (if needed):
```yaml
# Add to test.yml
- name: Run tests with parallelization
  run: |
    pytest -n auto  # Requires pytest-xdist
```

---

## 🔄 Workflow Lifecycle

### Development Flow

```mermaid
graph TD
    A[Developer pushes code] --> B[GitHub Actions triggered]
    B --> C[Run tests]
    C --> D{Tests pass?}
    D -->|No| E[Notify developer]
    D -->|Yes| F[Run linting]
    F --> G{Lint pass?}
    G -->|No| E
    G -->|Yes| H[Run security scans]
    H --> I{Security OK?}
    I -->|No| E
    I -->|Yes| J[Build application]
    J --> K{Build success?}
    K -->|No| E
    K -->|Yes| L[Mark PR as ready]
```

### Deployment Flow

```mermaid
graph TD
    A[Merge to main] --> B[GitHub Actions triggered]
    B --> C[Pre-deployment checks]
    C --> D{Checks pass?}
    D -->|No| E[Abort deployment]
    D -->|Yes| F[Trigger Render deployment]
    F --> G[Render builds app]
    G --> H[Render runs migrations]
    H --> I[Render starts service]
    I --> J[GitHub Actions health check]
    J --> K{Health OK?}
    K -->|No| L[Alert team]
    K -->|Yes| M[Deployment success!]
```

---

## 📞 Support

**GitHub Actions Issues:**
- Docs: https://docs.github.com/en/actions
- Community: https://github.community/c/github-actions

**Render Issues:**
- Docs: https://render.com/docs
- Support: Dashboard > Help

**Codecov Issues:**
- Docs: https://docs.codecov.com
- Support: support@codecov.io

**Project Issues:**
- Check: `PM_EXECUTION_PLAN.md`
- Check: `COMPLETION_ROADMAP.md`
- GitHub Issues: Report bugs or request features

---

## ✅ Setup Complete!

Once GitHub Actions is configured:
1. ✅ Every push triggers automated tests
2. ✅ Every PR shows test results
3. ✅ Coverage reports track progress
4. ✅ Security scans protect codebase
5. ✅ Merges to main auto-deploy to Render
6. ✅ Build badges show status in README

**Next Steps:**
1. Push workflow files to GitHub
2. Configure GitHub Secrets (CODECOV_TOKEN, RENDER_URL)
3. Update README badges with your username
4. Enable branch protection on `main`
5. Create your first pull request to test CI/CD

**From PM_EXECUTION_PLAN.md Phase 1 (Week 1):**
- ✅ Create .env.example (COMPLETED)
- ✅ Setup GitHub Actions CI/CD (COMPLETED)
- 🔄 Next: SendGrid email integration (8 hours)
- 🔄 Next: Test coverage expansion (45 hours)

**Start with:**
```bash
git add .github/ README.md GITHUB_ACTIONS_SETUP.md
git commit -m "feat: Add GitHub Actions CI/CD workflows"
git push origin main
```

Then visit: https://github.com/pranab112/test/actions to watch your first automated build!
