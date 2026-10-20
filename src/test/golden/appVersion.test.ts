import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
import { version } from '../../../package.json';

/**
 * One version for a release (p9 Q16).
 *
 * package.json's `version` is the source: vite.config.ts builds
 * /version.json from it, Settings shows it, and Android's versionName must
 * say the same. Settings carried its own '1.0.0' while the app was 1.2.0,
 * so the build number support was given was wrong. A version written
 * anywhere else drifts; this gate fails when one does.
 */

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) return walk(p);
    return /\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p) ? [p] : [];
  });
}

describe('one app version', () => {
  it('package.json holds a release version', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('version.json is built from package.json', () => {
    expect(read('vite.config.ts')).toMatch(/version:\s*pkg\.version/);
  });

  it('Android’s versionName is package.json’s version', () => {
    const gradle = read('android/app/build.gradle');
    // Either read from package.json at build time, or written to match it.
    if (/package\.json/.test(gradle)) return;
    expect(/versionName\s+"([^"]+)"/.exec(gradle)?.[1]).toBe(version);
  });

  it('the app writes no version of its own', () => {
    const literal = /\b(?:APP_VERSION|appVersion|VERSION)\s*=\s*['"`]\d+\.\d+\.\d+['"`]/;
    const offenders = walk(join(root, 'src'))
      .filter((p) => literal.test(readFileSync(p, 'utf8')))
      .map((p) => p.slice(root.length + 1).split(sep).join('/'));
    expect(offenders).toEqual([]);
  });
});
