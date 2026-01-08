#!/usr/bin/env node

/**
 * Pre-Deployment Verification Script
 * Checks that all configuration is correct before deploying to Railway
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`)
};

let errors = 0;
let warnings = 0;

console.log('\n==========================================');
console.log('Casino Royal - Pre-Deployment Check');
console.log('==========================================\n');

// Check 1: Required files exist
log.info('Checking required files...');
const requiredFiles = [
  'package.json',
  'package-lock.json',
  'vite.config.ts',
  'tsconfig.json',
  'index.html',
  'railway.toml',
  'railway.json',
  '.env.production'
];

requiredFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    log.success(`${file} exists`);
  } else {
    log.error(`${file} is missing`);
    errors++;
  }
});

// Check 2: Verify package.json scripts
log.info('\nChecking package.json scripts...');
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

const requiredScripts = ['dev', 'build', 'start'];
requiredScripts.forEach(script => {
  if (packageJson.scripts && packageJson.scripts[script]) {
    log.success(`Script '${script}' is defined: ${packageJson.scripts[script]}`);
  } else {
    log.error(`Script '${script}' is missing`);
    errors++;
  }
});

// Check 3: Verify environment variables in .env.production
log.info('\nChecking .env.production...');
const envFile = fs.readFileSync(path.join(__dirname, '.env.production'), 'utf8');
const requiredEnvVars = [
  'VITE_ADMIN_ROUTE_TOKEN',
  'VITE_CLIENT_ROUTE_TOKEN',
  'VITE_API_URL',
  'VITE_WS_URL',
  'VITE_ENVIRONMENT'
];

requiredEnvVars.forEach(envVar => {
  const regex = new RegExp(`^${envVar}=.+$`, 'm');
  if (regex.test(envFile)) {
    const value = envFile.match(regex)[0].split('=')[1];
    if (value && value.trim() !== '' && !value.includes('your_') && !value.includes('localhost')) {
      log.success(`${envVar} is set`);
    } else {
      log.warning(`${envVar} appears to be a placeholder or localhost`);
      warnings++;
    }
  } else {
    log.error(`${envVar} is not set`);
    errors++;
  }
});

// Check 4: Verify API URL format
log.info('\nChecking API URL format...');
const apiUrlMatch = envFile.match(/VITE_API_URL=(.+)/);
if (apiUrlMatch) {
  const apiUrl = apiUrlMatch[1].trim();
  if (apiUrl.startsWith('https://')) {
    log.success('API URL uses HTTPS');
  } else {
    log.error('API URL should use HTTPS in production');
    errors++;
  }
  if (apiUrl.includes('/api/v1')) {
    log.success('API URL includes /api/v1 path');
  } else {
    log.warning('API URL should include /api/v1 path');
    warnings++;
  }
}

// Check 5: Verify WebSocket URL format
log.info('\nChecking WebSocket URL format...');
const wsUrlMatch = envFile.match(/VITE_WS_URL=(.+)/);
if (wsUrlMatch) {
  const wsUrl = wsUrlMatch[1].trim();
  if (wsUrl.startsWith('wss://')) {
    log.success('WebSocket URL uses WSS (secure)');
  } else {
    log.error('WebSocket URL should use WSS in production');
    errors++;
  }
}

// Check 6: Verify railway.toml configuration
log.info('\nChecking railway.toml...');
const railwayContent = fs.readFileSync(path.join(__dirname, 'railway.toml'), 'utf8');
if (railwayContent.includes('nixpacks')) {
  log.success('Nixpacks builder is configured in railway.toml');
} else {
  log.warning('Nixpacks builder should be specified in railway.toml');
  warnings++;
}

if (railwayContent.includes('npm run start')) {
  log.success('Start command is configured');
} else {
  log.error('Start command should be "npm run start"');
  errors++;
}

if (railwayContent.includes('restartPolicyType')) {
  log.success('Restart policy is configured');
} else {
  log.warning('Restart policy should be configured');
  warnings++;
}

// Check 7: Verify dependencies
log.info('\nChecking dependencies...');
const criticalDeps = ['react', 'react-dom', 'react-router-dom', 'axios', 'serve'];
criticalDeps.forEach(dep => {
  if (packageJson.dependencies && packageJson.dependencies[dep]) {
    log.success(`${dep} is installed`);
  } else {
    log.error(`${dep} is missing from dependencies`);
    errors++;
  }
});

// Check 8: Verify build works locally
log.info('\nChecking if dist directory exists (previous build)...');
if (fs.existsSync(path.join(__dirname, 'dist'))) {
  log.success('dist directory exists (previous build found)');

  // Check if index.html exists in dist
  if (fs.existsSync(path.join(__dirname, 'dist', 'index.html'))) {
    log.success('dist/index.html exists');
  } else {
    log.warning('dist/index.html not found - run "npm run build" to verify');
    warnings++;
  }
} else {
  log.warning('dist directory not found - run "npm run build" to verify build works');
  warnings++;
}

// Check 9: Verify .gitignore
log.info('\nChecking .gitignore...');
if (fs.existsSync(path.join(__dirname, '.gitignore'))) {
  const gitignore = fs.readFileSync(path.join(__dirname, '.gitignore'), 'utf8');
  if (gitignore.includes('.env') || gitignore.includes('.env.production')) {
    log.success('.env files are gitignored');
  } else {
    log.error('.env files should be in .gitignore');
    errors++;
  }
  if (gitignore.includes('node_modules')) {
    log.success('node_modules is gitignored');
  } else {
    log.error('node_modules should be in .gitignore');
    errors++;
  }
} else {
  log.error('.gitignore file is missing');
  errors++;
}

// Summary
console.log('\n==========================================');
console.log('Summary');
console.log('==========================================\n');

if (errors === 0 && warnings === 0) {
  log.success('All checks passed! Ready to deploy to Railway.');
  console.log('\nNext steps:');
  console.log('1. Run: railway login (if not logged in)');
  console.log('2. Create a new service in Railway dashboard for frontend');
  console.log('3. Run: cd frontend && railway link');
  console.log('4. Run: ./deploy-railway.sh (Linux/Mac) or deploy-railway.bat (Windows)');
  process.exit(0);
} else {
  if (errors > 0) {
    log.error(`${errors} error(s) found - must be fixed before deployment`);
  }
  if (warnings > 0) {
    log.warning(`${warnings} warning(s) found - recommended to fix`);
  }

  console.log('\nPlease fix the issues above before deploying.');
  process.exit(1);
}
