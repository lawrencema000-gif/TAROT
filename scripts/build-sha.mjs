// The commit a build is made from: dist/version.json, the Sentry release and the
// web-vitals release all take it from here (vite.config.ts).
//
// Production is built by hand (npm run build, netlify deploy --prod), where no CI
// sets VITE_BUILD_SHA, so version.json said "local" and no release could be traced
// to a commit (health-status-23). Sources, first match wins:
//   1. VITE_BUILD_SHA  an explicit choice: deploy.yml and preview.yml set it
//   2. git             HEAD, plus "-dirty" when the working tree differs from it
//   3. COMMIT_REF      Netlify's own builds, when there is no git checkout
//   4. GITHUB_SHA      GitHub Actions, when there is no git checkout
//   5. "local"         nothing at all
// Git comes before COMMIT_REF and GITHUB_SHA because only git can tell a dirty tree;
// where both exist they name the same commit. A value that is not a 40-character hex
// sha is ignored, with a warning.
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHA_RE = /^[0-9a-f]{40}$/i;
const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

// Changes here do not change dist/: the Supabase CLI rewrites its tracked cache
// (supabase/.temp/cli-latest) on every run, and `npx cap sync` writes the native
// projects after the build.
export const DIRTY_EXCLUDES = [':(exclude)supabase/.temp', ':(exclude)android', ':(exclude)ios'];

function gitRaw(args) {
  try {
    return execFileSync('git', args, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

const samePath = (a, b) => {
  const x = resolve(a);
  const y = resolve(b);
  return process.platform === 'win32' ? x.toLowerCase() === y.toLowerCase() : x === y;
};

let ownCheckout;
/**
 * Runs git in the repository root: trimmed stdout, or null when git fails, is
 * missing, or the project is not the top of its own checkout. A copy without its
 * own .git inside another repository (the owner's home folder is one) would
 * otherwise report that repository's commit as this build's.
 */
export function runGit(args) {
  if (ownCheckout === undefined) {
    const top = gitRaw(['rev-parse', '--show-toplevel']);
    ownCheckout = top !== null && samePath(top, REPO_ROOT);
  }
  return ownCheckout ? gitRaw(args) : null;
}

function fromEnv(env, key) {
  const value = (env[key] ?? '').trim();
  if (SHA_RE.test(value)) return value.toLowerCase();
  if (value) console.warn(`[build-sha] ignoring ${key}=${JSON.stringify(value)}: not a 40-character commit sha`);
  return null;
}

export function resolveBuildSha(env = process.env, git = runGit) {
  const explicit = fromEnv(env, 'VITE_BUILD_SHA');
  if (explicit) return explicit;

  const head = git(['rev-parse', 'HEAD']);
  if (head && SHA_RE.test(head)) {
    // --no-optional-locks: a build never writes .git/index.
    const status = git(['--no-optional-locks', 'status', '--porcelain', '--', '.', ...DIRTY_EXCLUDES]);
    const sha = head.toLowerCase();
    // A status that cannot be read counts as dirty: unknown is not clean.
    return status === '' ? sha : `${sha}-dirty`;
  }

  return fromEnv(env, 'COMMIT_REF') ?? fromEnv(env, 'GITHUB_SHA') ?? 'local';
}
