// @vitest-environment node
/**
 * A build names the commit it was made from (health-status-23). Production is
 * built by hand, where nothing set VITE_BUILD_SHA, so the live version.json said
 * "local", no release could be matched to a commit, and `npm run deploy:check`
 * reported "AHEAD of or diverged" on every run.
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
// @ts-expect-error — a plain .mjs build script, no types
import { resolveBuildSha, DIRTY_EXCLUDES } from '../../../scripts/build-sha.mjs';
// @ts-expect-error — a plain .mjs build script, no types
import { judge } from '../../../scripts/deploy-check.mjs';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8').replace(/\r\n/g, '\n');
const HEAD = '843cd0fd7ebe38121220f611bbbb84b2d9f871ae';
const OTHER = '1175c4caa4946a0ac5480c208df8c906fd17861a';
/** A git stand-in: `head` for rev-parse, `status` for status --porcelain (null = git failed). */
const fakeGit = (head: string | null, status: string | null, calls: string[][] = []) => (args: string[]) => {
  calls.push(args);
  if (args[0] === 'rev-parse') return head;
  if (args.includes('status')) return status;
  return null;
};

describe('resolveBuildSha', () => {
  it('takes an explicit VITE_BUILD_SHA first, lower-cased', () => {
    expect(resolveBuildSha({ VITE_BUILD_SHA: HEAD.toUpperCase(), GITHUB_SHA: OTHER }, fakeGit(OTHER, ''))).toBe(HEAD);
  });

  it('otherwise asks git: a clean tree is the commit, a changed one is "-dirty"', () => {
    expect(resolveBuildSha({}, fakeGit(HEAD, ''))).toBe(HEAD);
    expect(resolveBuildSha({}, fakeGit(HEAD, ' M src/App.tsx'))).toBe(`${HEAD}-dirty`);
    expect(resolveBuildSha({}, fakeGit(HEAD, '?? src/new.ts'))).toBe(`${HEAD}-dirty`);
    expect(resolveBuildSha({}, fakeGit(HEAD, null))).toBe(`${HEAD}-dirty`);
  });

  it('prefers git to COMMIT_REF and GITHUB_SHA, which cannot tell a dirty tree', () => {
    expect(resolveBuildSha({ COMMIT_REF: OTHER, GITHUB_SHA: OTHER }, fakeGit(HEAD, ' M src/App.tsx'))).toBe(`${HEAD}-dirty`);
  });

  it('without git: COMMIT_REF, then GITHUB_SHA, then "local"', () => {
    expect(resolveBuildSha({ COMMIT_REF: OTHER, GITHUB_SHA: HEAD }, () => null)).toBe(OTHER);
    expect(resolveBuildSha({ GITHUB_SHA: OTHER }, () => null)).toBe(OTHER);
    expect(resolveBuildSha({}, () => null)).toBe('local');
  });

  it('ignores a value that is not a 40-character sha', () => {
    expect(resolveBuildSha({ VITE_BUILD_SHA: 'local' }, fakeGit(HEAD, ''))).toBe(HEAD);
    expect(resolveBuildSha({ VITE_BUILD_SHA: '843cd0fd' }, fakeGit(HEAD, ''))).toBe(HEAD);
  });

  it('never counts tool churn as dirty, and never writes .git/index', () => {
    const calls: string[][] = [];
    resolveBuildSha({}, fakeGit(HEAD, '', calls));
    expect(DIRTY_EXCLUDES).toEqual([':(exclude)supabase/.temp', ':(exclude)android', ':(exclude)ios']);
    expect(calls[1]).toEqual(['--no-optional-locks', 'status', '--porcelain', '--', '.', ...DIRTY_EXCLUDES]);
  });

  it('in this checkout, names the checked-out commit', () => {
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    expect(resolveBuildSha({})).toMatch(new RegExp(`^${head}(-dirty)?$`));
  });

  it('a copy that is not the top of its own checkout says "local", not the outer repository’s commit', async () => {
    // The owner's home folder is a git repository: a project copy without its own
    // .git inside it would otherwise report the home repository's commit.
    const base = join(process.cwd(), 'node_modules', '.cache', `build-sha-${process.pid}`);
    mkdirSync(join(base, 'scripts'), { recursive: true });
    copyFileSync(join(process.cwd(), 'scripts', 'build-sha.mjs'), join(base, 'scripts', 'build-sha.mjs'));
    try {
      const copy = await import(/* @vite-ignore */ pathToFileURL(join(base, 'scripts', 'build-sha.mjs')).href);
      expect(copy.resolveBuildSha({})).toBe('local');
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});

describe('vite.config.ts takes the sha from resolveBuildSha', () => {
  const vite = read('vite.config.ts');
  it('imports it and has no literal "local" fallback', () => {
    expect(vite).toMatch(/import \{ resolveBuildSha \} from '\.\/scripts\/build-sha\.mjs';/);
    expect(vite).not.toMatch(/\?\?\s*'local'/);
  });
  it('names the Sentry release as main.tsx does (arcana@<sha>)', () => {
    expect(vite).toMatch(/`arcana@\$\{sha\}`/);
  });
});

describe('deploy-check verdicts', () => {
  const yes = () => true;
  const no = () => false;
  it.each([
    ['local', yes, yes, 2, 'no-commit'],
    [HEAD.slice(0, 7), yes, yes, 2, 'no-commit'],
    [`${HEAD}-dirty`, yes, yes, 1, 'dirty'],
    [HEAD, no, no, 0, 'same'],
    [OTHER, yes, yes, 0, 'behind'],
    [OTHER, yes, no, 1, 'diverged'],
    [OTHER, no, no, 2, 'unknown-commit'],
  ])('live %s → exit %i', (liveSha, hasCommit, isAncestor, code, verdict) => {
    expect(judge({ liveSha, localSha: HEAD, hasCommit, isAncestor })).toMatchObject({ code, verdict });
  });
});
