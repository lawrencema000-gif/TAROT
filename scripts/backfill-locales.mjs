#!/usr/bin/env node
/**
 * Backfill-locales: copy missing keys from EN into JA/KO/ZH so the locale
 * files have parity. Does NOT translate — copies the EN string as a stub.
 * i18next's `defaultValue:` fallback already handles missing keys at runtime,
 * but having the full structure in every file:
 *   - lets translation tooling (and future human translators) see what
 *     needs translating at a glance
 *   - keeps the files structurally parallel so refactors don't drift
 *
 * Only adds missing leaves — never overwrites existing translations.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = join(__dirname, '..', 'src', 'i18n', 'locales');
const FILES = ['app.json'];
const LOCALES = ['ja', 'ko', 'zh'];

let added = 0;
let filesChanged = 0;

function mergeMissing(source, target) {
  if (typeof source !== 'object' || source === null) return target;
  if (typeof target !== 'object' || target === null) {
    added++;
    return structuredClone(source);
  }
  const out = { ...target };
  for (const k of Object.keys(source)) {
    if (!(k in out)) {
      out[k] = structuredClone(source[k]);
      added++;
    } else if (typeof source[k] === 'object' && source[k] !== null && !Array.isArray(source[k])) {
      out[k] = mergeMissing(source[k], out[k]);
    }
  }
  return out;
}

for (const file of FILES) {
  const en = JSON.parse(readFileSync(join(LOCALES_DIR, 'en', file), 'utf8'));
  for (const loc of LOCALES) {
    const targetPath = join(LOCALES_DIR, loc, file);
    const before = added;
    const target = JSON.parse(readFileSync(targetPath, 'utf8'));
    const merged = mergeMissing(en, target);
    if (added > before) {
      writeFileSync(targetPath, JSON.stringify(merged, null, 2) + '\n', 'utf8');
      filesChanged++;
      console.log(`[${loc}/${file}] +${added - before} keys`);
    } else {
      console.log(`[${loc}/${file}] already in parity`);
    }
  }
}

console.log(`\n✓ Added ${added} keys across ${filesChanged} files`);
