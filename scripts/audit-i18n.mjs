import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, '..', 'src', 'i18n', 'locales');

const LANGS = ['en', 'ja', 'ko', 'zh'];
const NAMESPACES = ['common', 'onboarding', 'landing', 'app', 'tarot', 'zodiac', 'aspects', 'planetInHouse', 'planetInSign', 'transits', 'horoscopes'];

function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

function loadNs(lang, ns) {
  const p = path.join(localesDir, lang, `${ns}.json`);
  if (!fs.existsSync(p)) return { _missing: true };
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.error(`PARSE FAIL: ${lang}/${ns}.json — ${e.message}`);
    return { _parseError: true };
  }
}

const report = { parseErrors: [], tsSourceOverlays: [], missing: {}, empty: {}, summary: {} };

for (const ns of NAMESPACES) {
  const enDoc = loadNs('en', ns);
  if (enDoc._parseError) { report.parseErrors.push(`en/${ns}`); continue; }
  if (enDoc._missing) {
    report.tsSourceOverlays.push(ns);
    // Still check empty strings and inter-locale parity for non-EN overlays
    const nonEnDocs = {};
    for (const lang of LANGS) {
      if (lang === 'en') continue;
      const d = loadNs(lang, ns);
      if (d._parseError) { report.parseErrors.push(`${lang}/${ns}`); continue; }
      if (d._missing) continue;
      nonEnDocs[lang] = d;
      const flat = flatten(d);
      const empty = Object.keys(flat).filter(k => typeof flat[k] === 'string' && flat[k].trim() === '');
      if (empty.length) report.empty[`${lang}/${ns}`] = empty;
    }
    // Cross-check parity between ja/ko/zh (none should have keys the others lack)
    const allKeys = new Set();
    for (const d of Object.values(nonEnDocs)) Object.keys(flatten(d)).forEach(k => allKeys.add(k));
    for (const [l, d] of Object.entries(nonEnDocs)) {
      const ks = new Set(Object.keys(flatten(d)));
      const miss = [...allKeys].filter(k => !ks.has(k));
      if (miss.length) report.missing[`${l}/${ns}`] = miss;
    }
    continue;
  }
  const enKeys = Object.keys(flatten(enDoc));

  for (const lang of LANGS) {
    if (lang === 'en') continue;
    const doc = loadNs(lang, ns);
    if (doc._parseError) { report.parseErrors.push(`${lang}/${ns}`); continue; }
    if (doc._missing) { report.missing[`${lang}/${ns}`] = enKeys; continue; }
    const keys = Object.keys(flatten(doc));
    const flat = flatten(doc);
    const miss = enKeys.filter(k => !keys.includes(k));
    const empty = keys.filter(k => typeof flat[k] === 'string' && flat[k].trim() === '');
    if (miss.length) report.missing[`${lang}/${ns}`] = miss;
    if (empty.length) report.empty[`${lang}/${ns}`] = empty;
  }
}

// Content parity: check tarot/zodiac/etc have equal counts per language
for (const ns of ['tarot', 'zodiac', 'aspects', 'planetInHouse', 'planetInSign', 'transits', 'horoscopes']) {
  report.summary[ns] = {};
  for (const lang of LANGS) {
    const doc = loadNs(lang, ns);
    if (!doc) { report.summary[ns][lang] = 'MISSING'; continue; }
    const topKeys = Object.keys(doc);
    report.summary[ns][lang] = topKeys.length;
  }
}

// Chrome key totals
for (const ns of ['common', 'onboarding', 'landing', 'app']) {
  report.summary[ns] = {};
  for (const lang of LANGS) {
    const doc = loadNs(lang, ns);
    if (!doc) { report.summary[ns][lang] = 'MISSING'; continue; }
    report.summary[ns][lang] = Object.keys(flatten(doc)).length;
  }
}

console.log('═══════════════════════════════════════════════════');
console.log('TAROT i18n audit');
console.log('═══════════════════════════════════════════════════\n');

console.log('Parse errors:', report.parseErrors.length === 0 ? '✓ none' : report.parseErrors);
if (report.tsSourceOverlays.length) {
  console.log('Overlays (EN source is .ts, ja/ko/zh have JSON):', report.tsSourceOverlays.join(', '));
}

console.log('\nKey parity vs EN (per namespace per language):');
if (Object.keys(report.missing).length === 0) {
  console.log('  ✓ all languages have every EN key');
} else {
  for (const [bundle, keys] of Object.entries(report.missing)) {
    console.log(`  ✗ ${bundle}: missing ${keys.length} keys`);
    if (keys.length <= 20) keys.forEach(k => console.log(`      - ${k}`));
  }
}

console.log('\nEmpty string values:');
if (Object.keys(report.empty).length === 0) {
  console.log('  ✓ none');
} else {
  for (const [bundle, keys] of Object.entries(report.empty)) {
    console.log(`  ✗ ${bundle}: ${keys.length} empty`);
    keys.slice(0, 5).forEach(k => console.log(`      - ${k}`));
  }
}

console.log('\nContent counts per language:');
const allNs = Object.keys(report.summary);
const colW = 24;
console.log(`  ${'namespace'.padEnd(colW)}  en   ja   ko   zh`);
for (const ns of allNs) {
  const row = report.summary[ns];
  console.log(`  ${ns.padEnd(colW)}  ${String(row.en).padEnd(4)} ${String(row.ja).padEnd(4)} ${String(row.ko).padEnd(4)} ${String(row.zh).padEnd(4)}`);
}

const hasErrors = report.parseErrors.length > 0 || Object.keys(report.missing).length > 0;
console.log(`\n${hasErrors ? '⚠ Audit found issues' : '✅ Audit clean'}`);
process.exit(hasErrors ? 1 : 0);
