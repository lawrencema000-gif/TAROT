/**
 * The Open-Meteo half of astrology-geocode, with the fetch passed in — pure
 * enough to run from Node against fixtures or the live API
 * (src/test/golden/geocode-languages.test.ts, the FC proof).
 *
 * "City, Region" in any language (p8 O#35):
 *   1. The city is searched twice, in the user's language and in English;
 *      the rows share `id`, so each place carries both names and a
 *      qualifier may match either ("Vermont" or "バーモント州").
 *   2. A city typed in kana / hangul / han finds only the places that carry
 *      a name in that script (スプリングフィールド: nine Springfields, not
 *      the one in Vermont). When nothing matches, the English name of what
 *      was found is searched the same way, and its places are matched.
 *   3. If still nothing matches, the unfiltered places come back with
 *      matched=false — the caller then says so instead of listing wrong
 *      cities as if they were the place typed.
 * Places are shown in the user's language.
 */
import { filterCandidates, isNonLatinName, norm, pairById, splitPlace, type Candidate } from "./qualifier.ts";

export interface OpenMeteoRow {
  id?: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  admin1?: string;
  admin2?: string;
  timezone?: string;
}

export interface GeoResult {
  lat: number;
  lon: number;
  displayName: string;
  /** IANA zone when the provider knows it (Open-Meteo does). */
  timezone?: string;
}

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface OpenMeteoOptions {
  userAgent: string;
  timeoutMs: number;
}

const BASE = "https://geocoding-api.open-meteo.com/v1";
export const RESULT_LIMIT = 5;
/** Candidates fetched when a qualifier must pick among same-name places. */
const QUALIFIED_COUNT = 20;

async function getJson(fetchFn: FetchLike, url: URL, opts: OpenMeteoOptions): Promise<unknown> {
  const res = await fetchFn(url, {
    headers: { "User-Agent": opts.userAgent, "Accept": "application/json" },
    signal: AbortSignal.timeout(opts.timeoutMs),
  });
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  return res.json();
}

export async function omSearch(
  fetchFn: FetchLike,
  name: string,
  language: string,
  count: number,
  opts: OpenMeteoOptions,
): Promise<OpenMeteoRow[]> {
  const url = new URL(`${BASE}/search`);
  url.searchParams.set("name", name.slice(0, 100));
  url.searchParams.set("count", String(count));
  url.searchParams.set("language", language);
  url.searchParams.set("format", "json");
  const data = (await getJson(fetchFn, url, opts)) as { results?: unknown } | null;
  return Array.isArray(data?.results) ? (data!.results as OpenMeteoRow[]) : [];
}

export async function omGet(
  fetchFn: FetchLike,
  id: number,
  language: string,
  opts: OpenMeteoOptions,
): Promise<OpenMeteoRow | null> {
  const url = new URL(`${BASE}/get`);
  url.searchParams.set("id", String(id));
  url.searchParams.set("language", language);
  url.searchParams.set("format", "json");
  const data = (await getJson(fetchFn, url, opts)) as OpenMeteoRow | null;
  return data && typeof data.name === "string" ? data : null;
}

/** "Springfield, バーモント州, アメリカ" — name, region and country, without repeats. */
export function toResult(r: OpenMeteoRow): GeoResult {
  const parts = [r.name, r.admin1, r.country].filter(
    (p, i, arr): p is string => typeof p === "string" && p.length > 0 && arr.indexOf(p) === i,
  );
  return { lat: r.latitude, lon: r.longitude, displayName: parts.join(", "), timezone: r.timezone };
}

function usable(results: GeoResult[]): GeoResult[] {
  return results.filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lon) && r.displayName);
}

/** The places named `name`, each with its English twin when the user's language is not English. */
async function candidates(
  fetchFn: FetchLike,
  name: string,
  language: string,
  opts: OpenMeteoOptions,
): Promise<Candidate<OpenMeteoRow>[]> {
  if (language === "en") {
    const rows = await omSearch(fetchFn, name, "en", QUALIFIED_COUNT, opts);
    return rows.map((r) => ({ loc: r, en: r }));
  }
  const [loc, en] = await Promise.all([
    omSearch(fetchFn, name, language, QUALIFIED_COUNT, opts),
    // Without the English rows the match falls back to the user's language alone.
    omSearch(fetchFn, name, "en", QUALIFIED_COUNT, opts).catch(() => [] as OpenMeteoRow[]),
  ]);
  return pairById(loc, en);
}

export async function searchOpenMeteo(
  place: string,
  language: string,
  fetchFn: FetchLike,
  opts: OpenMeteoOptions,
): Promise<{ results: GeoResult[]; qualified: boolean; matched: boolean }> {
  // Open-Meteo matches on the place NAME; a "City, Region" string finds
  // nothing, so search on the first comma-separated part and check the rest
  // against each candidate's region and country.
  const { name, qualifiers } = splitPlace(place);
  if (qualifiers.length === 0) {
    const rows = await omSearch(fetchFn, name, language, RESULT_LIMIT, opts);
    return { results: usable(rows.slice(0, RESULT_LIMIT).map(toResult)), qualified: false, matched: true };
  }

  let cands = await candidates(fetchFn, name, language, opts);
  let matching = filterCandidates(cands, qualifiers);

  if (matching.length === 0 && cands.length > 0 && isNonLatinName(name)) {
    // スプリングフィールド found only the Springfields that carry a Japanese
    // name. Search their English name, in both languages, and match again.
    const first = cands[0];
    let enName = first.en && first.en !== first.loc ? first.en.name : null;
    if (!enName && typeof first.loc.id === "number") {
      enName = (await omGet(fetchFn, first.loc.id, "en", opts).catch(() => null))?.name ?? null;
    }
    if (enName && norm(enName) !== norm(name)) {
      const more = await candidates(fetchFn, enName, language, opts).catch(() => [] as Candidate<OpenMeteoRow>[]);
      const found = filterCandidates(more, qualifiers);
      if (found.length > 0) {
        cands = more;
        matching = found;
      }
    }
  }

  const matched = matching.length > 0;
  const shown = (matched ? matching : cands).slice(0, RESULT_LIMIT);
  return { results: usable(shown.map((c) => toResult(c.loc))), qualified: true, matched };
}
