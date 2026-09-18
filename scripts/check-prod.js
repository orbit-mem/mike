#!/usr/bin/env node
/**
 * scripts/check-prod.js
 *
 * Verifies that the production Docker stack is running, checks health endpoints,
 * and reports the operational status of all services.
 */

const http = require('http');
const { execSync } = require('child_process');

const TIMEOUT_MS = 60000;
const INTERVAL_MS = 3000;

const checks = [
  {
    name: 'Backend API Health',
    url: 'http://127.0.0.1:3001/health',
    validator: (data, statusCode) => statusCode === 200 && data.includes('ok'),
  },
  {
    name: 'Frontend Application Gateway',
    url: 'http://127.0.0.1:3000/',
    validator: (_data, statusCode) => statusCode < 500,
  },
  {
    name: 'Supabase Gateway (PostgREST / Auth)',
    url: 'http://127.0.0.1:54321/rest/v1/',
    validator: (_data, statusCode) => statusCode < 500,
  },
];

function fetchEndpoint(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 4000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ ok: true, statusCode: res.statusCode, data }));
    });

    req.on('error', (err) => resolve({ ok: false, error: err.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: 'Connection timed out' });
    });
  });
}

async function checkContainers() {
  try {
    const output = execSync('docker compose -f docker-compose.prod.yml ps --format "{{.Service}}: {{.Status}}"', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    return output.trim().split('\n').filter(Boolean);
  } catch (err) {
    return null;
  }
}

async function run() {
  console.log('====================================================');
  console.log('  Mike OSS — Production Stack Verification');
  console.log('====================================================');

  const startTime = Date.now();
  let allHealthy = false;

  process.stdout.write('Waiting for production services to become ready...\n');

  while (Date.now() - startTime < TIMEOUT_MS) {
    let iterationPassed = true;

    for (const check of checks) {
      const res = await fetchEndpoint(check.url);
      if (!res.ok || !check.validator(res.data, res.statusCode)) {
        iterationPassed = false;
        break;
      }
    }

    if (iterationPassed) {
      allHealthy = true;
      break;
    }

    process.stdout.write('.');
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }

  console.log('\n');

  // Print container statuses
  const containers = await checkContainers();
  if (containers && containers.length > 0) {
    console.log('Container States:');
    containers.forEach((line) => console.log(`  • ${line}`));
    console.log('');
  }

  // Print endpoint verification results
  console.log('Endpoint Verification:');
  for (const check of checks) {
    const res = await fetchEndpoint(check.url);
    if (res.ok && check.validator(res.data, res.statusCode)) {
      console.log(`  ✓ ${check.name} (${check.url}) — HTTP ${res.statusCode} [HEALTHY]`);
    } else {
      const detail = res.error ? res.error : `HTTP ${res.statusCode}`;
      console.log(`  ✗ ${check.name} (${check.url}) — ${detail} [FAILED]`);
    }
  }

  console.log('----------------------------------------------------');
  if (allHealthy) {
    console.log('🎉 Production stack is HEALTHY and ready!');
    console.log('🌐 Access the application at: http://localhost:3000');
    process.exit(0);
  } else {
    console.error('⚠️ One or more production services failed health verification.');
    console.error('Run `docker compose -f docker-compose.prod.yml logs` to inspect container logs.');
    process.exit(1);
  }
}

run();
