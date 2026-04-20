#!/usr/bin/env node
// Compare live /version.json against local HEAD so you can sanity-check
// whether prod matches what you're about to merge.
//
// Usage:  npm run deploy:check
//         npm run deploy:check -- https://deploy-preview-123--arcana-ritual-app.netlify.app

import { execSync } from 'node:child_process';

const url = (process.argv[2] ?? 'https://tarotlife.app').replace(/\/$/, '') + '/version.json';

function hdr(s) { return `\x1b[1m${s}\x1b[0m`; }
function ok(s)  { return `\x1b[32m${s}\x1b[0m`; }
function warn(s){ return `\x1b[33m${s}\x1b[0m`; }
function err(s) { return `\x1b[31m${s}\x1b[0m`; }

const localSha = execSync('git rev-parse HEAD').toString().trim();

let live;
try {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  live = await res.json();
} catch (e) {
  console.error(err(`Failed to fetch ${url}: ${e.message}`));
  process.exit(2);
}

console.log(hdr('Deploy check'));
console.log(`  URL:        ${url}`);
console.log(`  Local HEAD: ${localSha}`);
console.log(`  Live SHA:   ${live.sha}`);
console.log(`  Version:    ${live.version}`);
console.log(`  Built at:   ${live.builtAt}`);

if (live.sha === localSha) {
  console.log(ok('\n  OK - live matches your HEAD.'));
  process.exit(0);
}

// Is live an ancestor of HEAD? Then prod is behind and will catch up on merge.
try {
  execSync(`git merge-base --is-ancestor ${live.sha} HEAD`, { stdio: 'ignore' });
  console.log(warn('\n  Prod is BEHIND your HEAD - merging to main will ship new commits.'));
  process.exit(0);
} catch {
  console.log(err('\n  Prod is AHEAD of or diverged from your HEAD - pull main before merging.'));
  process.exit(1);
}
