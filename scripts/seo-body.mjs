/**
 * SEO body-content generator.
 *
 * The prerenderer previously wrote only per-route <head> meta; the <body>
 * stayed an empty SPA shell (`<div id="root"></div>`). Crawlers therefore saw
 * ~250 near-identical thin pages and left most in "Crawled - currently not
 * indexed". This module renders each page's REAL content (already present in
 * src/data/*) into static HTML that gets injected inside #root. Since main.tsx
 * uses createRoot().render(), React replaces this content on hydration — so
 * users see it instantly (good LCP) and crawlers index it without executing JS.
 *
 * Hub pages emit real <a href> link lists so Googlebot can crawl the whole
 * leaf graph from raw HTML (previously the only nav was JS onClick).
 *
 * Data is imported from the TypeScript source at build time via esbuild.
 */

import { build } from 'esbuild';
import { writeFileSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { pathToFileURL } from 'url';

const SITE = 'https://tarotlife.app';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function slugify(name) {
  return String(name).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}
function titleCase(slug) {
  return String(slug).split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
function p(text) { return text ? `<p>${esc(text)}</p>` : ''; }
function h2(t) { return `<h2>${esc(t)}</h2>`; }
function section(title, text) { return text ? `${h2(title)}${p(text)}` : ''; }
function list(items) {
  if (!items || !items.length) return '';
  return `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
}
function linkList(links) {
  return `<ul class="seo-links">${links.map((l) => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`).join('')}</ul>`;
}

/** Load the content data modules from TS source via an esbuild bundle. */
export async function loadContentData() {
  const entry = `
    export { fullDeck } from './src/data/tarotDeck.ts';
    export { majorEnrichment, minorEnrichment } from './src/data/tarotEnrichment.ts';
    export { astrologyEntries } from './src/data/astrologyLearn.ts';
    export { crystalEntries } from './src/data/crystalsLearn.ts';
    export { glossaryEntries } from './src/data/glossaryLearn.ts';
    export { numerologyEntries } from './src/data/numerologyLearn.ts';
    export { tarotSpreads } from './src/data/tarotSpreads.ts';
    export { majorArcanaSpreads } from './src/data/majorArcanaSpreads.ts';
  `;
  const result = await build({
    stdin: { contents: entry, resolveDir: process.cwd(), sourcefile: 'seo-entry.ts', loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent',
  });
  const tmp = join(mkdtempSync(join(tmpdir(), 'seo-body-')), 'bundle.mjs');
  writeFileSync(tmp, result.outputFiles[0].text);
  const mod = await import(pathToFileURL(tmp).href);
  // Merge spread sources into one slug-keyed map.
  const spreadMap = {};
  for (const s of [...(mod.tarotSpreads || []), ...(mod.majorArcanaSpreads || [])]) spreadMap[s.slug] = s;
  return { ...mod, spreadMap };
}

// ── per-entry content builders (return inner HTML of <article>) ──────────

export function tarotCardBody(card, enrich) {
  const parts = [
    `<h1>${esc(card.name)} Tarot Card Meaning</h1>`,
    card.keywords ? `<p class="seo-kw">Keywords: ${esc(card.keywords.join(', '))}</p>` : '',
    section('Upright Meaning', card.meaningUpright),
    section('Reversed Meaning', card.meaningReversed),
    section('Love & Relationships', card.loveMeaning),
    section('Career & Money', card.careerMeaning),
  ];
  if (enrich) {
    const corr = [];
    if (enrich.element) corr.push(`Element: ${enrich.element}`);
    if (enrich.planet) corr.push(`Planet: ${enrich.planet}`);
    if (enrich.zodiac) corr.push(`Zodiac: ${enrich.zodiac}`);
    if (enrich.hebrewLetter) corr.push(`Hebrew letter: ${enrich.hebrewLetter}`);
    if (corr.length) parts.push(h2('Astrological Correspondences') + p(corr.join(' · ')));
    if (enrich.yesNo) parts.push(h2('Yes or No') + p(`${enrich.yesNo}. ${enrich.yesNoReason || ''}`));
    if (enrich.numerology) parts.push(h2('Numerology') + p(enrich.numerology));
  }
  return parts.join('');
}

export function astroBody(e) {
  return [
    `<h1>${esc(e.name)} — Astrology Meaning</h1>`,
    e.keywords ? `<p class="seo-kw">${esc(e.keywords.join(' · '))}</p>` : '',
    p(e.shortDescription),
    p(e.longDescription),
    e.element ? p(`Element: ${e.element}${e.modality ? `, ${e.modality}` : ''}${e.rulingPlanet ? `, ruled by ${e.rulingPlanet}` : ''}${e.dates ? ` (${e.dates})` : ''}.`) : '',
    section('Strengths', Array.isArray(e.strengths) ? e.strengths.join(', ') : e.strengths),
    section('In Love', e.inLove),
    section('In Career', e.inCareer),
    section('In Spirituality', e.inSpirituality),
  ].join('');
}

export function crystalBody(e) {
  return [
    `<h1>${esc(e.name)} — Meaning &amp; Properties</h1>`,
    e.keywords ? `<p class="seo-kw">${esc(e.keywords.join(' · '))}</p>` : '',
    p(e.shortDescription),
    p(e.longDescription),
    section('Metaphysical Properties', e.metaphysicalProperties),
    section('In Love', e.inLove),
    section('In Healing', e.inHealing),
    section('In Spirituality', e.inSpirituality),
    e.chakras && e.chakras.length ? p(`Chakras: ${e.chakras.join(', ')}.`) : '',
    e.howToUse && e.howToUse.length ? h2('How to Use') + list(e.howToUse) : '',
    section('Tarot Connection', e.tarotConnection),
  ].join('');
}

export function glossaryBody(e) {
  return [
    `<h1>${esc(e.term)} — Definition</h1>`,
    p(e.longDefinition || e.shortDefinition),
    e.origin ? section('Origin', e.origin) : '',
    e.example ? section('Example', e.example) : '',
  ].join('');
}

export function numerologyBody(e) {
  return [
    `<h1>Number ${esc(e.number)} — Life Path Meaning</h1>`,
    e.keywords ? `<p class="seo-kw">${esc(e.keywords.join(' · '))}</p>` : '',
    p(e.shortDescription),
    p(e.longDescription),
    section('Personality', e.personality),
    section('In Love', e.inLove),
    section('In Career', e.inCareer),
    section('In Spirituality', e.inSpirituality),
    section('Tarot Connection', e.tarotConnection),
  ].join('');
}

export function spreadBody(slug, spread) {
  if (!spread) {
    const name = titleCase(slug);
    return `<h1>${esc(name)} Tarot Spread</h1><p>Position-by-position guidance for the ${esc(name)} tarot spread.</p>`;
  }
  const positions = (spread.positions || []).map((pos, i) => `<li><strong>${i + 1}. ${esc(pos.name)}</strong>${pos.meaning ? ` — ${esc(pos.meaning)}` : ''}</li>`).join('');
  return [
    `<h1>${esc(spread.name)} Tarot Spread</h1>`,
    p(spread.description || spread.summary),
    positions ? `${h2('Positions')}<ol>${positions}</ol>` : '',
  ].join('');
}

export function blogPostBody(post) {
  // post.content may be markdown/HTML; strip to plain paragraphs for the
  // prerender (React renders the real formatted article on hydration).
  const body = post.content
    ? String(post.content).replace(/<[^>]+>/g, ' ').replace(/[#*_>`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 4000)
    : '';
  return [
    `<h1>${esc(post.title)}</h1>`,
    p(post.excerpt),
    body ? p(body) : '',
  ].join('');
}

// ── hub pages: crawlable link lists ──────────────────────────────────────

export function hubBody(title, intro, links) {
  return `<h1>${esc(title)}</h1>${p(intro)}${linkList(links)}`;
}

export function tarotHubLinks(deck) {
  return deck.map((c) => ({ href: `${SITE}/tarot-meanings/${slugify(c.name)}/`, label: c.name }));
}
export function astroHubLinks(entries) {
  return entries.map((e) => ({ href: `${SITE}/astrology/${e.slug}/`, label: e.name }));
}
export function crystalHubLinks(entries) {
  return entries.map((e) => ({ href: `${SITE}/crystals/${e.slug}/`, label: e.name }));
}
export function glossaryHubLinks(entries) {
  return entries.map((e) => ({ href: `${SITE}/glossary/${e.slug}/`, label: e.term }));
}
export function numerologyHubLinks(entries) {
  return entries.map((e) => ({ href: `${SITE}/numerology/${e.slug}/`, label: `Number ${e.number}` }));
}
export function spreadHubLinks(slugs, spreadMap) {
  return slugs.map((s) => ({ href: `${SITE}/spreads/${s}/`, label: (spreadMap[s] && spreadMap[s].name) || titleCase(s) }));
}
export function blogHubLinks(posts) {
  return posts.map((post) => ({ href: `${SITE}/blog/${post.slug}/`, label: post.title }));
}

/** Wrap article/nav HTML in the prerender container that React later replaces. */
export function wrapBody(inner) {
  return `<div class="seo-prerender"><main><article>${inner}</article></main></div>`;
}

/** Minimal inline styling so the pre-hydration content isn't unstyled flash. */
export const SEO_STYLE = `<style>.seo-prerender{max-width:760px;margin:0 auto;padding:88px 22px 64px;color:#c9c4d8;font-family:Georgia,'Times New Roman',serif;line-height:1.7}.seo-prerender h1{color:#e9c877;font-size:1.9rem;margin:0 0 14px}.seo-prerender h2{color:#d8d2e6;font-size:1.15rem;margin:26px 0 8px}.seo-prerender p{margin:0 0 14px}.seo-prerender .seo-kw{color:#8f88a8;font-style:italic}.seo-prerender ul,.seo-prerender ol{margin:0 0 16px;padding-left:22px}.seo-prerender .seo-links{columns:2;column-gap:28px}.seo-prerender a{color:#9fb6e0;text-decoration:none}</style>`;
