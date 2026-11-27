#!/usr/bin/env node
// Is the live build the commit you think it is? Compares /version.json with your HEAD.
//
// Usage:  npm run deploy:check
//         npm run deploy:check -- https://pr-123--arcana-ritual-app.netlify.app
//
// Exit codes:
//   0  live is your HEAD, or an ancestor of it (prod is behind; the commits are listed)
//   1  live is a dirty build, or ahead of / diverged from your HEAD
//   2  live could not be read, names no commit (sha "local"), or its commit is not in this clone

import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const LIVE_SHA_RE = /^([0-9a-f]{40})(-dirty)?$/;

/**
 * The verdict for a live sha. Pure, so src/test/golden/buildSha.test.ts can pin it.
 * hasCommit(sha): the commit exists in this clone; isAncestor(sha): it is an ancestor of HEAD.
 */
export function judge({ liveSha, localSha, hasCommit, isAncestor }) {
  const m = typeof liveSha === 'string' ? LIVE_SHA_RE.exec(liveSha) : null;
  if (!m) {
    return { code: 2, verdict: 'no-commit', message: `The live build names no commit (sha ${JSON.stringify(liveSha)}). Rebuild from a clean checkout of main and deploy again.` };
  }
  const [, commit, dirty] = m;
  if (dirty) {
    return { code: 1, verdict: 'dirty', commit, message: `The live build was made from ${commit} WITH uncommitted changes. Rebuild from a clean checkout of main and deploy again.` };
  }
  if (commit === localSha) return { code: 0, verdict: 'same', commit, message: 'OK - live matches your HEAD.' };
  if (!hasCommit(commit)) {
    return { code: 2, verdict: 'unknown-commit', commit, message: `The live commit ${commit} is not in this clone. Run \`git fetch origin\` and check again.` };
  }
  if (isAncestor(commit)) return { code: 0, verdict: 'behind', commit, message: 'Prod is BEHIND your HEAD; the next deploy of HEAD ships:' };
  return { code: 1, verdict: 'diverged', commit, message: 'Prod is AHEAD of or diverged from your HEAD - pull main before merging.' };
}

function hdr(s) { return `\x1b[1m${s}\x1b[0m`; }
function ok(s)  { return `\x1b[32m${s}\x1b[0m`; }
function warn(s){ return `\x1b[33m${s}\x1b[0m`; }
function err(s) { return `\x1b[31m${s}\x1b[0m`; }

// execFileSync with an argument list: nothing read from the network reaches a shell.
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const gitOk = (...args) => { try { execFileSync('git', args, { stdio: 'ignore' }); return true; } catch { return false; } };

async function main() {
  const base = (process.argv[2] ?? 'https://tarotlife.app').replace(/\/$/, '');
  const url = `${base}/version.json?cb=${Date.now()}`;
  const localSha = git('rev-parse', 'HEAD');

  let live;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    live = await res.json();
  } catch (e) {
    console.error(err(`Failed to fetch ${url}: ${e.message}`));
    return 2;
  }

  console.log(hdr('Deploy check'));
  console.log(`  URL:        ${url}`);
  console.log(`  Local HEAD: ${localSha}`);
  console.log(`  Live SHA:   ${live.sha}`);
  console.log(`  Version:    ${live.version}`);
  console.log(`  Built at:   ${live.builtAt}`);

  const v = judge({
    liveSha: live.sha,
    localSha,
    hasCommit: (c) => gitOk('cat-file', '-e', `${c}^{commit}`),
    isAncestor: (c) => gitOk('merge-base', '--is-ancestor', c, 'HEAD'),
  });
  const paint = v.code === 0 ? (v.verdict === 'same' ? ok : warn) : err;
  console.log(paint(`\n  ${v.message}`));
  if (v.verdict === 'behind') {
    console.log(`    ${git('rev-list', '--count', `${v.commit}..HEAD`)} commit(s):`);
    console.log(git('log', '--oneline', '--max-count=20', `${v.commit}..HEAD`).replace(/^/gm, '    '));
  }
  return v.code;
}

// Run only as a script, not when a test imports judge(). process.exitCode, not
// process.exit(): on Windows, exiting while fetch's sockets close can abort Node
// with a libuv assertion (exit 127 instead of the code).
const here = fileURLToPath(import.meta.url);
const invoked = process.argv[1] ? resolve(process.argv[1]) : '';
const isScript = process.platform === 'win32' ? here.toLowerCase() === invoked.toLowerCase() : here === invoked;
if (isScript) process.exitCode = await main();
