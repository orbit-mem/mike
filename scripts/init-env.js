const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rootDir = path.resolve(__dirname, '..');
const rootEnvPath = path.join(rootDir, '.env');
const rootEnvExamplePath = path.join(rootDir, '.env.example');
const backendEnvPath = path.join(rootDir, 'backend', '.env');
const backendEnvExamplePath = path.join(rootDir, 'backend', '.env.example');
const frontendEnvLocalPath = path.join(rootDir, 'frontend', '.env.local');

const DEMO_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const DEMO_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

function generateSecret() {
  return crypto.randomBytes(32).toString('hex');
}

console.log('Initializing local environment files...');

// 1. Root .env
if (!fs.existsSync(rootEnvPath)) {
  if (fs.existsSync(rootEnvExamplePath)) {
    fs.copyFileSync(rootEnvExamplePath, rootEnvPath);
    console.log('✓ Created .env from .env.example');
  } else {
    console.warn('⚠️ .env.example not found in root directory.');
  }
} else {
  console.log('ℹ .env already exists. Skipping root env creation.');
}

// 2. Frontend .env.local
if (!fs.existsSync(frontendEnvLocalPath)) {
  fs.writeFileSync(frontendEnvLocalPath, 'API_BASE_URL=http://localhost:3001\n', 'utf8');
  console.log('✓ Created frontend/.env.local (API_BASE_URL=http://localhost:3001)');
} else {
  console.log('ℹ frontend/.env.local already exists.');
}

// 3. Backend .env
function applyLocalDefaults(content) {
  let updated = content;

  // Replace crypto secrets if placeholder
  if (updated.includes('replace-with-a-random-32-byte-hex-string')) {
    updated = updated.replace(
      /DOWNLOAD_SIGNING_SECRET=.*/,
      `DOWNLOAD_SIGNING_SECRET=${generateSecret()}`
    );
  }
  if (updated.includes('your-long-random-secret')) {
    updated = updated.replace(
      /USER_API_KEYS_ENCRYPTION_SECRET=.*/,
      `USER_API_KEYS_ENCRYPTION_SECRET=${generateSecret()}`
    );
  }

  // Populate local Supabase endpoints if still pointing to placeholder
  if (updated.includes('https://your-project.supabase.co')) {
    updated = updated.replace(/SUPABASE_URL=.*/, 'SUPABASE_URL=http://localhost:54321');
  }
  if (updated.includes('your-supabase-publishable-key')) {
    updated = updated.replace(/SUPABASE_PUBLISHABLE_KEY=.*/, `SUPABASE_PUBLISHABLE_KEY=${DEMO_ANON_KEY}`);
  }
  if (updated.includes('your-supabase-service-role-key')) {
    updated = updated.replace(/SUPABASE_SECRET_KEY=.*/, `SUPABASE_SECRET_KEY=${DEMO_SERVICE_ROLE_KEY}`);
  }

  // Populate local S3 / RustFS endpoints if still pointing to Cloudflare placeholder
  if (updated.includes('https://your-account-id.r2.cloudflarestorage.com')) {
    updated = updated.replace(/R2_ENDPOINT_URL=.*/, 'R2_ENDPOINT_URL=http://localhost:9000');
  }
  if (updated.includes('your-r2-access-key')) {
    updated = updated.replace(/R2_ACCESS_KEY_ID=.*/, 'R2_ACCESS_KEY_ID=rustfsadmin');
  }
  if (updated.includes('your-r2-secret-key')) {
    updated = updated.replace(/R2_SECRET_ACCESS_KEY=.*/, 'R2_SECRET_ACCESS_KEY=rustfsadmin');
  }

  // Populate local Redis URL if empty
  if (/^REDIS_URL=\s*$/m.test(updated)) {
    updated = updated.replace(/^REDIS_URL=\s*$/m, 'REDIS_URL=redis://localhost:6379');
  }

  return updated;
}

if (!fs.existsSync(backendEnvPath)) {
  if (fs.existsSync(backendEnvExamplePath)) {
    let content = fs.readFileSync(backendEnvExamplePath, 'utf8');
    content = applyLocalDefaults(content);
    fs.writeFileSync(backendEnvPath, content, 'utf8');
    console.log('✓ Created backend/.env with local stack settings and generated secrets');
  } else {
    console.warn('⚠️ backend/.env.example not found.');
  }
} else {
  console.log('ℹ backend/.env already exists. Ensuring secrets & local stack defaults are populated...');
  let content = fs.readFileSync(backendEnvPath, 'utf8');
  const updatedContent = applyLocalDefaults(content);
  if (updatedContent !== content) {
    fs.writeFileSync(backendEnvPath, updatedContent, 'utf8');
    console.log('✓ Updated placeholder settings with local stack defaults in backend/.env');
  }
}

console.log('Environment initialization complete.');
