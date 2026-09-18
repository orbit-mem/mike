#!/usr/bin/env node
/**
 * scripts/dev.js
 *
 * Full-stack development runner for Mike OSS:
 * 1. Ensures environment files and local secrets are initialized.
 * 2. Starts backing services (Supabase Postgres, GoTrue auth, PostgREST, RustFS S3, Redis, Mailpit) in Docker.
 * 3. Concurrently runs Express backend (tsx watch) and Next.js frontend (next dev) with live hot-reloading.
 * 4. Cleans up all child processes on exit (Ctrl+C).
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const http = require('http');

const rootDir = path.resolve(__dirname, '..');

// Colors for terminal output
const cyan = (text) => `\x1b[36m${text}\x1b[0m`;
const magenta = (text) => `\x1b[35m${text}\x1b[0m`;
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const yellow = (text) => `\x1b[33m${text}\x1b[0m`;
const red = (text) => `\x1b[31m${text}\x1b[0m`;
const bold = (text) => `\x1b[1m${text}\x1b[0m`;

let children = [];

function killProcess(child) {
  if (!child || !child.pid) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
    } else {
      process.kill(-child.pid, 'SIGTERM');
    }
  } catch (err) {
    try {
      child.kill('SIGTERM');
    } catch (e) {
      // Ignore cleanup error
    }
  }
}

function cleanup() {
  console.log('\nShutting down development servers...');
  children.forEach(killProcess);
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', () => children.forEach(killProcess));

function isDockerRunning() {
  try {
    execSync('docker info', { stdio: 'ignore', timeout: 5000 });
    return true;
  } catch (err) {
    return false;
  }
}

function checkPort(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}

async function startInfrastructure() {
  console.log(bold('1. Checking local infrastructure...'));

  const dockerAvailable = isDockerRunning();

  if (!dockerAvailable) {
    console.log(yellow('⚠️  Docker is not currently running.'));
    console.log(
      '   If you want to use the local containerized stack (Postgres, Auth, RustFS, Redis),\n' +
      '   please launch Docker Desktop and re-run this command.\n' +
      '   Continuing under the assumption that you are connecting to an existing or hosted service.\n'
    );
    return;
  }

  console.log('   Starting backing services via Docker Compose in background...');
  try {
    execSync(
      'docker compose up -d db auth rest gateway storage createbucket redis mailpit db-init workflow-sync',
      { cwd: rootDir, stdio: 'inherit' }
    );
    console.log(green('   ✓ Backing services are up.'));
  } catch (err) {
    console.error(red('   ✗ Failed to launch Docker Compose services:'), err.message);
  }
}

function pipeOutput(child, prefix, colorFn) {
  const readline = require('readline');

  if (child.stdout) {
    const rlOut = readline.createInterface({ input: child.stdout });
    rlOut.on('line', (line) => console.log(`${colorFn(prefix)} ${line}`));
  }

  if (child.stderr) {
    const rlErr = readline.createInterface({ input: child.stderr });
    rlErr.on('line', (line) => console.error(`${colorFn(prefix)} ${line}`));
  }
}

async function runDev() {
  console.log('====================================================');
  console.log(`  ${bold('Mike OSS — Unified Development Runner')}`);
  console.log('====================================================\n');

  // Step 1: Initialize local environment files
  try {
    require('./init-env.js');
  } catch (err) {
    console.warn('Could not run init-env.js automatically:', err.message);
  }

  // Step 2: Ensure infrastructure is running
  await startInfrastructure();

  // Step 3: Launch backend and frontend concurrently
  console.log(bold('\n2. Starting application servers...'));

  const isWin = process.platform === 'win32';
  const npmCmd = isWin ? 'npm.cmd' : 'npm';

  console.log(`   ${cyan('[backend]')} Starting Express server (tsx watch on port 3001)...`);
  const backendProc = spawn(npmCmd, ['run', 'dev', '--prefix', 'backend'], {
    cwd: rootDir,
    env: { ...process.env, FORCE_COLOR: '1' },
    detached: !isWin,
  });
  children.push(backendProc);
  pipeOutput(backendProc, '[backend]', cyan);

  console.log(`   ${magenta('[frontend]')} Starting Next.js server (next dev on port 3000)...`);
  const frontendProc = spawn(npmCmd, ['run', 'dev', '--prefix', 'frontend'], {
    cwd: rootDir,
    env: { ...process.env, FORCE_COLOR: '1' },
    detached: !isWin,
  });
  children.push(frontendProc);
  pipeOutput(frontendProc, '[frontend]', magenta);

  console.log(bold('\n3. Endpoints:'));
  console.log(`   • ${green('Frontend:')}       http://localhost:3000`);
  console.log(`   • ${cyan('Backend API:')}    http://localhost:3001 (proxied at /api)`);
  console.log(`   • ${yellow('Mailpit Inbox:')}  http://localhost:8025`);
  console.log(`\n   ${bold('Press Ctrl+C to stop all processes.')}\n`);

  backendProc.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(red(`[backend] exited with status code ${code}`));
    }
  });

  frontendProc.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(red(`[frontend] exited with status code ${code}`));
    }
  });
}

runDev();
