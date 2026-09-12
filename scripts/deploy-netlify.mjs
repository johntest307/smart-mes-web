import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Config ??MUST be set via environment variables (never hardcoded)
const SITE_URL = process.env.NETLIFY_URL;
const NETLIFY_SITE_ID = process.env.NETLIFY_SITE_ID;
const NETLIFY_AUTH_TOKEN = process.env.NETLIFY_AUTH_TOKEN;
if (!SITE_URL || !NETLIFY_SITE_ID || !NETLIFY_AUTH_TOKEN) {
  console.error('Missing required env: NETLIFY_URL, NETLIFY_SITE_ID, NETLIFY_AUTH_TOKEN');
  process.exit(1);
}

const BIN = join(ROOT, 'node_modules', '.bin');

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd: ROOT, stdio: 'inherit', shell: true, ...opts });
}

function localBin(cmd) {
  return join(BIN, cmd);
}

function hasNetlifyCli() {
  try {
    const out = execSync(`"${localBin('netlify')}" --version`, { cwd: ROOT, stdio: 'pipe', shell: true });
    return out.toString().includes('netlify-cli');
  } catch {
    return false;
  }
}

function isLinked() {
  const stateFile = join(ROOT, '.netlify', 'state.json');
  if (!existsSync(stateFile)) return false;
  try {
    const state = JSON.parse(readFileSync(stateFile, 'utf-8'));
    return state.siteId === NETLIFY_SITE_ID;
  } catch {
    return false;
  }
}

async function main() {
  const start = Date.now();

  console.log('=== Netlify Deploy Script ===');
  console.log(`Target: ${SITE_URL}`);

  // 1. Ensure netlify-cli
  if (!hasNetlifyCli()) {
    console.log('\n[1/5] Installing netlify-cli locally...');
    run('npm install --save-dev netlify-cli');
  } else {
    console.log('\n[1/5] netlify-cli already installed');
  }

  // 2. Ensure site is linked
  if (!isLinked()) {
    console.log('\n[2/5] Linking project to Netlify site...');
    run(`"${localBin('netlify')}" link --id ${NETLIFY_SITE_ID}`, { env: { ...process.env, NETLIFY_AUTH_TOKEN } });
  } else {
    console.log('\n[2/5] Project already linked');
  }

  // 3. Ensure dependencies
  console.log('\n[3/5] Ensuring dependencies...');
  if (!existsSync(join(ROOT, 'node_modules'))) {
    run('npm install');
  } else {
    console.log('  node_modules exists, skipping install');
  }

  // 4. Build (skip if already built by deploy.ps1)
  const distIndex = join(ROOT, 'dist', 'index.html');
  if (existsSync(distIndex)) {
    console.log('\n[4/5] dist/ already exists (built by deploy.ps1), skipping build');
  } else {
    console.log('\n[4/5] Building...');
    run(`"${localBin('vite')}" build`, { env: { ...process.env } });
  }

  // 5. Deploy
  console.log('\n[5/5] Deploying to Netlify...');
  run(`"${localBin('netlify')}" deploy --prod --dir=dist --no-build`, { env: { ...process.env, NETLIFY_AUTH_TOKEN } });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n??Deploy complete in ${elapsed}s`);
  console.log(`  URL: ${SITE_URL}`);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});

