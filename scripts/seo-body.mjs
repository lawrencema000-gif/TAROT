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
    export { PLAYING_CARDS_ALL, CARTO_LESSONS, CARTO_SPREADS } from './src/data/cartomancy/index.ts';
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

// ── cartomancy: the playing deck, its lessons ────────────────────────────
// Data from src/data/cartomancy (PLAYING_CARDS_ALL — 52 cards + 2 Jokers,
// CARTO_LESSONS — the 12-lesson guide). Slugs are `PlayingCard.slug` and
// `CartoLesson.slug`, never derived from a name.

export function cartomancyCardBody(card) {
  const combos = (card.combinations || [])
    .map((c) => `<li><strong>${esc(titleCase(c.with))}</strong> — ${esc(c.meaning)}</li>`)
    .join('');
  return [
    `<h1>${esc(card.name)} Meaning in Cartomancy</h1>`,
    card.keywords && card.keywords.length ? `<p class="seo-kw">${esc(card.keywords.join(' · '))}</p>` : '',
    p(card.quickMeaning),
    section('Upright Meaning', card.meaningUpright),
    section('Reversed Meaning', card.meaningReversed),
    section('Love & Relationships', card.loveMeaning),
    section('Career & Money', card.careerMeaning),
    section('Advice', card.adviceMeaning),
    section('Timing', card.timing),
    section('As a Person', card.asPerson),
    combos ? `${h2('Card Combinations')}<ul>${combos}</ul>` : '',
    section('Reflection', card.reflectionPrompt),
  ].join('');
}

export function cartomancyLessonBody(lesson) {
  return [
    `<h1>${esc(lesson.title)}</h1>`,
    lesson.eyebrow ? `<p class="seo-kw">${esc(lesson.eyebrow)} of 12 — the Arcana cartomancy guide</p>` : '',
    p(lesson.lede),
    lesson.points && lesson.points.length ? `${h2('Key points')}${list(lesson.points)}` : '',
    ...(lesson.body || []).map((para) => p(para)),
    section('Practice', lesson.practice),
  ].join('');
}

// ── hub pages: crawlable link lists ──────────────────────────────────────

export function hubBody(title, intro, links) {
  return `<h1>${esc(title)}</h1>${p(intro)}${linkList(links)}`;
}

export function tarotHubLinks(deck) {
  return deck.map((c) => ({ href: `${SITE}/tarot-meanings/${slugify(c.name)}`, label: c.name }));
}
export function astroHubLinks(entries) {
  return entries.map((e) => ({ href: `${SITE}/astrology/${e.slug}`, label: e.name }));
}
export function crystalHubLinks(entries) {
  return entries.map((e) => ({ href: `${SITE}/crystals/${e.slug}`, label: e.name }));
}
export function glossaryHubLinks(entries) {
  return entries.map((e) => ({ href: `${SITE}/glossary/${e.slug}`, label: e.term }));
}
export function numerologyHubLinks(entries) {
  return entries.map((e) => ({ href: `${SITE}/numerology/${e.slug}`, label: `Number ${e.number}` }));
}
export function spreadHubLinks(slugs, spreadMap) {
  return slugs.map((s) => ({ href: `${SITE}/spreads/${s}`, label: (spreadMap[s] && spreadMap[s].name) || titleCase(s) }));
}
export function blogHubLinks(posts) {
  return posts.map((post) => ({ href: `${SITE}/blog/${post.slug}`, label: post.title }));
}
export function cartomancyCardLinks(cards) {
  return cards.map((c) => ({ href: `${SITE}/cartomancy/cards/${c.slug}`, label: c.name }));
}
export function cartomancyLessonLinks(lessons) {
  return lessons.map((l) => ({ href: `${SITE}/cartomancy/guide/${l.slug}`, label: `${l.eyebrow ? `${l.eyebrow}: ` : ''}${l.title}` }));
}

/** Wrap article/nav HTML in the prerender container that React later replaces. */
export function wrapBody(inner) {
  return `<div class="seo-prerender"><main><article>${inner}</article></main></div>`;
}

/** The live hero's Play badge target (LandingPage.tsx PLAY_STORE_URL). */
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.arcana.app';

/**
 * The landing hero, as static HTML for `/`.
 *
 * Lighthouse put the landing's LCP on the hero paragraph with a 3.1 s
 * "element render delay": the page was `<div id="root"></div>` until the
 * entry chunk had downloaded, parsed and rendered. The hubs already
 * prerender a body; this does the same for the one page every cold visitor
 * sees — the eyebrow, the two-line headline, the lede and the primary CTA,
 * in English (the shells are English-only), with the same type the live
 * hero uses so hydration repaints the same picture in place. `strings` is
 * the `hero` object of src/i18n/locales/en/landing.json, `playAlt` its
 * `play.alt`.
 *
 * The geometry is the live hero's (`.lp-hero` paddings, the 240×176 deck fan
 * at its final frame — DeckFan `lg`, the default back — the ruled eyebrow,
 * the gold `lg` Button with its chevron beside the Play badge, the caption),
 * measured against the live page at 390 and 1280 to the pixel, so nothing
 * jumps when React replaces it. The guard script after it decides,
 * during parse and before the first paint, whether this visitor should see it
 * at all: not in the Capacitor app (the native shell boots into auth or Home,
 * never the landing), not for a returning visitor with a Supabase session
 * (they get Home at `/`), and not for a ja/ko/zh visitor (`?lang` or the
 * stored choice — the hero is English). Otherwise it marks
 * `<html data-prerendered="landing">`, and LandingPage skips its one
 * entrance so the live hero lands on top of this one without a fade.
 */
export function landingHeroBody(strings, playAlt = 'Get it on Google Play') {
  const h = strings || {};
  const fan = [[-44, 6, -14, 1], [0, 0, 0, 2], [44, 6, 14, 1]]
    .map(([x, y, r, z]) => `<span style="z-index:${z};transform:translate(-50%,-50%) translate(${x}px,${y}px) rotate(${r}deg)"><img src="/card-backs/default.svg" alt="" width="96" height="144"></span>`)
    .join('');
  const guard =
    `<script>(function(){try{var keep=true;` +
    `if(window.Capacitor||(location.hostname==='localhost'&&!location.port))keep=false;` +
    `var q=new URLSearchParams(location.search).get('lang'),s=null;try{s=localStorage.getItem('arcana_locale')}catch(e){}` +
    `var l=String(q||s||'en').toLowerCase().split('-')[0];if(l==='ja'||l==='ko'||l==='zh')keep=false;` +
    `try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.indexOf('sb-')===0&&k.slice(-11)==='-auth-token'){keep=false;break}}}catch(e){}` +
    `var el=document.querySelector('.seo-landing');` +
    `if(!keep){if(el)el.parentNode.removeChild(el)}else{document.documentElement.setAttribute('data-prerendered','landing')}` +
    `}catch(e){}})();</script>`;
  return (
    `<div class="seo-prerender seo-landing"><main><section class="seo-hero">` +
    `<div class="seo-fan" aria-hidden="true">${fan}</div>` +
    `<p class="seo-eyebrow"><span class="seo-rule" aria-hidden="true"></span><span class="seo-badge">${esc(h.badge)}</span><span class="seo-rule seo-rule-r" aria-hidden="true"></span></p>` +
    `<h1>${esc(h.headlineTop)}<br><span class="seo-gold">${esc(h.headlineBottom)}</span></h1>` +
    `<p class="seo-lede">${esc(h.sub)}</p>` +
    `<div class="seo-ctas"><a class="seo-cta" href="/signup">${esc(h.cta)}<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></a>` +
    `<a class="seo-play" href="${PLAY_STORE_URL}" target="_blank" rel="noopener noreferrer"><span><img src="/google-play-badge.png" alt="${esc(playAlt)}" width="900" height="554"></span></a></div>` +
    `<p class="seo-note">${esc(h.note)}</p>` +
    `</section></main></div>` +
    guard
  );
}

/** Inline styling for the prerendered landing hero: the live hero's measure, type and inks, no motion. */
export const LANDING_STYLE = `<style>.seo-landing{min-height:70vh;display:flex;justify-content:center;padding:96px 16px 64px;color:#e8e6f0;font-family:Inter,'Inter Fallback',system-ui,sans-serif;-webkit-font-smoothing:antialiased}@media (min-width:640px){.seo-landing{padding:128px 28px 88px}}.seo-hero{width:100%;max-width:640px;text-align:center}.seo-fan{position:relative;width:240px;height:176px;margin:0 auto}.seo-fan span{position:absolute;left:50%;top:50%;width:96px;height:144px;border-radius:8px;border:1px solid rgba(212,175,55,.3);overflow:hidden;background:#16162e}.seo-fan img{display:block;width:100%;height:100%;object-fit:cover}.seo-eyebrow{display:flex;align-items:center;justify-content:center;gap:12px;margin:16px 0 0;font-size:.6875rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#d4af37}.seo-badge{white-space:nowrap}.seo-rule{flex:1;max-width:3rem;height:1px;background:linear-gradient(to right,transparent,rgba(212,175,55,.5))}.seo-rule-r{background:linear-gradient(to right,rgba(212,175,55,.5),transparent)}.seo-landing h1{margin:12px 0 16px;font-family:'Cormorant Garamond','Cormorant Fallback','Cormorant Fallback Android',Georgia,serif;font-weight:500;font-size:clamp(2.25rem,5.5vw,3.25rem);line-height:1.08;letter-spacing:-.005em}.seo-gold{color:#d4af37}.seo-lede{margin:0 auto;max-width:28rem;font-size:1.1875rem;line-height:1.55;color:#c9c4d8}.seo-ctas{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;justify-content:center;margin-top:28px}.seo-cta{display:inline-flex;align-items:center;justify-content:center;gap:8px;box-sizing:border-box;min-height:56px;padding:0 28px;border-radius:12px;background:linear-gradient(to right,#b8960f,#d4af37,#f4d668);color:#07070f;font-weight:500;font-size:1.0625rem;line-height:1.65;text-decoration:none}.seo-play{display:inline-flex;padding:12px;border-radius:12px}.seo-play span{display:block;position:relative;overflow:hidden;width:168px;height:48px;border-radius:5px}.seo-play img{position:absolute;left:-55.1px;top:-61.6px;width:278.7px;height:171.6px;max-width:none}.seo-note{margin:8px 0 0;font-size:.75rem;line-height:1.45;color:#7d7a99}</style>`;

/** Minimal inline styling so the pre-hydration content isn't unstyled flash. */
export const SEO_STYLE = `<style>.seo-prerender{max-width:760px;margin:0 auto;padding:88px 22px 64px;color:#c9c4d8;font-family:Georgia,'Times New Roman',serif;line-height:1.7}.seo-prerender h1{color:#e9c877;font-size:1.9rem;margin:0 0 14px}.seo-prerender h2{color:#d8d2e6;font-size:1.15rem;margin:26px 0 8px}.seo-prerender p{margin:0 0 14px}.seo-prerender .seo-kw{color:#8f88a8;font-style:italic}.seo-prerender ul,.seo-prerender ol{margin:0 0 16px;padding-left:22px}.seo-prerender .seo-links{columns:2;column-gap:28px}.seo-prerender a{color:#9fb6e0;text-decoration:none}</style>`;
