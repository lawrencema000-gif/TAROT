/**
 * Every mailbox the app publishes on tarotlife.app must be able to receive
 * mail (p12 health-status-01: the domain had no MX record, and mail to
 * support@, press@ and advisors@ bounced). Finds each @tarotlife.app address
 * in the shipped files, resolves its domain's MX, and fails on: no MX, a null
 * MX (RFC 7505), an MX host with no address, or more than one SPF record
 * (RFC 7208 §3.2, permerror). Needs the network: it runs weekly in
 * .github/workflows/mail-routing.yml and by hand, never inside vitest
 * (src/test/golden/supportAddress.test.ts covers the logic offline).
 *
 *   node scripts/check-mail-routing.mjs
 *   DNS_SERVERS=8.8.8.8,1.1.1.1 node scripts/check-mail-routing.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Resolver } from 'node:dns/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

// A string, not new URL(...): under vitest's jsdom, URL is jsdom's and fileURLToPath rejects it.
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
/** What ships: the app, its static files, the edge functions, the HTML shell. */
export const SHIPPED = ['src', 'public', 'supabase/functions', 'index.html'];
const SKIP = /(^|\/)src\/test\/|\/__tests__\/|\/__snapshots__\/|\.(?:test|spec)\.[cm]?[jt]sx?$/;
const BINARY = /\.(?:png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|mp3|mp4|webm|pdf)$/i;
const ADDRESS = /\b[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9-]+\.)*tarotlife\.app\b/gi;

function walk(root, rel) {
  const abs = join(root, rel);
  if (!statSync(abs).isDirectory()) return [rel];
  return readdirSync(abs).flatMap((name) => walk(root, `${rel}/${name}`));
}

/** Every @tarotlife.app address in the shipped files → the files that publish it (paths with '/'). */
export function publishedAddresses(root = REPO) {
  const found = new Map();
  for (const path of SHIPPED.flatMap((p) => walk(root, p))) {
    if (SKIP.test(path) || BINARY.test(path)) continue;
    for (const [match] of readFileSync(join(root, path), 'utf8').matchAll(ADDRESS)) {
      const address = match.toLowerCase();
      if (!found.has(address)) found.set(address, new Set());
      found.get(address).add(path);
    }
  }
  return found;
}

/** Can `domain` receive mail? `dns` is a node:dns/promises Resolver, or a stand-in with the same four methods. */
export async function checkDomain(domain, dns) {
  let mx;
  try {
    mx = await dns.resolveMx(domain);
  } catch (e) {
    const code = e && e.code ? e.code : String(e);
    return { domain, ok: false, reason: code === 'ENODATA' || code === 'ENOTFOUND'
      ? `no MX record (${code}): senders fall back to the A record, a web host, and the mail bounces`
      : `MX lookup failed (${code})` };
  }
  if (!mx.length) return { domain, ok: false, reason: 'no MX record' };
  if (mx.some((r) => r.exchange === '' || r.exchange === '.')) return { domain, ok: false, reason: 'null MX (RFC 7505): the domain refuses mail' };
  for (const r of mx) {
    const v4 = await dns.resolve4(r.exchange).catch(() => []);
    const v6 = v4.length ? [] : await dns.resolve6(r.exchange).catch(() => []);
    if (!v4.length && !v6.length) return { domain, ok: false, reason: `MX host ${r.exchange} has no address` };
  }
  const txt = await dns.resolveTxt(domain).catch(() => []);
  const spf = txt.map((chunks) => chunks.join('')).filter((s) => /^v=spf1(\s|$)/i.test(s));
  if (spf.length > 1) return { domain, ok: false, reason: `${spf.length} SPF records (RFC 7208 §3.2: permerror); keep exactly one` };
  return { domain, ok: true, mx: [...mx].sort((a, b) => a.priority - b.priority).map((r) => `${r.priority} ${r.exchange}`), spf: spf[0] ?? null };
}

async function main() {
  const dns = new Resolver();
  if (process.env.DNS_SERVERS) dns.setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()).filter(Boolean));
  const byDomain = new Map();
  for (const address of [...publishedAddresses().keys()].sort()) {
    const domain = address.slice(address.indexOf('@') + 1);
    byDomain.set(domain, [...(byDomain.get(domain) ?? []), address]);
  }
  let failed = byDomain.size === 0;
  if (failed) console.log('FAIL no @tarotlife.app address found: the scan itself is broken');
  for (const [domain, list] of byDomain) {
    const r = await checkDomain(domain, dns);
    console.log(r.ok
      ? `OK   ${domain} (${list.join(', ')}) MX ${r.mx.join('; ')}${r.spf ? '' : ' (no SPF record: only matters for mail sent as this domain)'}`
      : `FAIL ${domain} (${list.join(', ')}) ${r.reason}`);
    if (!r.ok) failed = true;
  }
  process.exitCode = failed ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
