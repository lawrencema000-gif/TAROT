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
 *
 * A city typed by its common name (p9 R28): Open-Meteo matches a name of
 * two characters only exactly, and a city's own row carries its municipal
 * name — 福岡市, 부산광역시, 青岛市 — so 福岡 found only five villages
 * called 福岡 (the first in Saitama), 대구 a village in North Korea, and
 * 京都 or 静岡 nothing at all. A name in the language's own script is now
 * also searched in its municipal forms (cityNameVariants), and the places
 * found are ranked (rankPlaces): populated places before islands and
 * mountains, then the most populous first, so the city leads.
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
  /** GeoNames feature code: PPLC capital, PPLA seat of a first-order division, PPL a populated place, ISL an island, … */
  feature_code?: string;
  population?: number;
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

/**
 * The municipal suffixes a city is filed under, per app language; the
 * script a name must be in for them to apply; and the ending of a name
 * already in municipal form. Tokyo is 東京都. Korean metropolitan cities
 * are 광역시 / 특별시 (부산시 finds nothing); every other city is 시.
 */
const CITY_SUFFIXES: Record<string, { script: RegExp; suffixes: string[]; municipal: RegExp }> = {
  ja: { script: /^[々぀-ヿ㐀-鿿ｦ-ﾟ]+$/, suffixes: ["市", "都"], municipal: /市$/ },
  zh: { script: /^[㐀-鿿]+$/, suffixes: ["市"], municipal: /市$/ },
  ko: { script: /^[가-힯]+$/, suffixes: ["시", "광역시", "특별시"], municipal: /시$/ },
};

/**
 * Open-Meteo matches a name of one or two characters only exactly; from
 * three on it matches loosely, and 名古屋 or つくば already find 名古屋市
 * and つくば市.
 */
const EXACT_MATCH_MAX = 2;

/**
 * The municipal forms of a short city name typed in the language's own
 * script: 福岡 → 福岡市 / 福岡都, 부산 → 부산시 / 부산광역시 / 부산특별시,
 * 青岛 → 青岛市. None for a name already in that form, a longer name, a
 * name in another script, or a language without such suffixes.
 */
export function cityNameVariants(name: string, language: string): string[] {
  const spec = CITY_SUFFIXES[language];
  if (!spec || [...name].length > EXACT_MATCH_MAX || !spec.script.test(name)) return [];
  if (spec.municipal.test(name)) return [];
  return spec.suffixes.map((s) => name + s);
}

/** Capital, then the seats of first- to fourth-order divisions, then any other populated place. */
const SEAT_RANK: Record<string, number> = { PPLC: 0, PPLA: 1, PPLA2: 2, PPLA3: 3, PPLA4: 4, PPLG: 5 };

/** A place people live in: PPL*, except abandoned (PPLQ), destroyed (PPLW) and historical (PPLH) ones. */
function isPopulated(r: OpenMeteoRow): boolean {
  const fc = r.feature_code ?? "PPL";
  return fc.startsWith("PPL") && !/^PPL[QWH]/.test(fc);
}

/**
 * Most likely birth place first: populated places before islands,
 * mountains and parks; then by population; then the seat rank; then the
 * provider's order. Rows that share an `id` are kept once.
 */
export function rankPlaces<T extends OpenMeteoRow>(rows: T[]): T[] {
  const seen = new Set<number>();
  const unique = rows.filter((r) => {
    if (typeof r.id !== "number") return true;
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
  const seat = (r: T) => SEAT_RANK[r.feature_code ?? ""] ?? 6;
  return unique
    .map((r, i) => ({ r, i }))
    .sort((a, b) =>
      Number(isPopulated(b.r)) - Number(isPopulated(a.r)) ||
      (b.r.population ?? 0) - (a.r.population ?? 0) ||
      seat(a.r) - seat(b.r) ||
      a.i - b.i
    )
    .map(({ r }) => r);
}

/**
 * The places called `name` in the user's language, with the municipal forms
 * of the name (cityNameVariants) searched alongside and ranked in. The
 * search on the name itself is the one that must answer; a variant that
 * fails adds nothing. Without variants the provider's order is kept.
 */
async function localizedPlaces(
  fetchFn: FetchLike,
  name: string,
  language: string,
  count: number,
  opts: OpenMeteoOptions,
): Promise<OpenMeteoRow[]> {
  const variants = cityNameVariants(name, language);
  if (variants.length === 0) return omSearch(fetchFn, name, language, count, opts);
  const [rows, ...more] = await Promise.all([
    omSearch(fetchFn, name, language, QUALIFIED_COUNT, opts),
    ...variants.map((v) => omSearch(fetchFn, v, language, QUALIFIED_COUNT, opts).catch(() => [] as OpenMeteoRow[])),
  ]);
  return rankPlaces([...rows, ...more.flat()]);
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
    localizedPlaces(fetchFn, name, language, QUALIFIED_COUNT, opts),
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
    const rows = await localizedPlaces(fetchFn, name, language, RESULT_LIMIT, opts);
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
