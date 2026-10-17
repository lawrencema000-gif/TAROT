/**
 * "City, Region" for the birth-place search: Open-Meteo matches on the
 * place NAME only, so astrology-geocode searches the part before the first
 * comma — and used to throw the rest away, returning the five most
 * populous same-name places: "Springfield, Vermont" → Springfield MO, IL,
 * MA, OH, TN; "Richmond, Texas" → Richmond VA, BC, CA, IN, KY (p7 #35). A
 * user born there picked a wrong city (wrong lat/lon/timezone → wrong
 * chart) or could not finish.
 *
 * The qualifier is now parsed and every Open-Meteo row is checked against
 * it (region, sub-region, country, country code, US state and common
 * country abbreviations). Pure — exercised from Node by
 * src/test/golden/geocode-qualifier.test.ts and geocode-languages.test.ts.
 *
 * In any language (p8 O#35): Open-Meteo names the region in the language it
 * is asked for — a Japanese phone gets ミズーリ州 / バーモント州 — so
 * "Springfield, Vermont" matched nothing under ja/ko/zh and the five most
 * populous Springfields came back. A place is now a Candidate: its row in
 * the user's language AND the same place in English (rows share `id`), and a
 * qualifier may match either, so "Vermont" and "バーモント州" both find it.
 */

export interface GeoRow {
  id?: number;
  name: string;
  admin1?: string;
  admin2?: string;
  country?: string;
  country_code?: string;
}

/** One place: the row to show (the user's language) and the same place in English, when known. */
export interface Candidate<T extends GeoRow = GeoRow> {
  loc: T;
  en?: T;
}

/** "Springfield, Vermont, USA" → { name: "Springfield", qualifiers: ["Vermont", "USA"] }. */
export function splitPlace(place: string): { name: string; qualifiers: string[] } {
  const parts = place.split(/[,，、]/).map((p) => p.trim()).filter(Boolean);
  return { name: parts[0] ?? "", qualifiers: parts.slice(1) };
}

export function norm(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[.'’]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const US_STATES: Record<string, string> = {
  al: "alabama", ak: "alaska", az: "arizona", ar: "arkansas", ca: "california", co: "colorado",
  ct: "connecticut", de: "delaware", fl: "florida", ga: "georgia", hi: "hawaii", id: "idaho",
  il: "illinois", in: "indiana", ia: "iowa", ks: "kansas", ky: "kentucky", la: "louisiana",
  me: "maine", md: "maryland", ma: "massachusetts", mi: "michigan", mn: "minnesota",
  ms: "mississippi", mo: "missouri", mt: "montana", ne: "nebraska", nv: "nevada",
  nh: "new hampshire", nj: "new jersey", nm: "new mexico", ny: "new york", nc: "north carolina",
  nd: "north dakota", oh: "ohio", ok: "oklahoma", or: "oregon", pa: "pennsylvania",
  ri: "rhode island", sc: "south carolina", sd: "south dakota", tn: "tennessee", tx: "texas",
  ut: "utah", vt: "vermont", va: "virginia", wa: "washington", wv: "west virginia",
  wi: "wisconsin", wy: "wyoming", dc: "district of columbia",
};

const COUNTRY_ALIASES: Record<string, string> = {
  usa: "us", us: "us", "united states of america": "us", "united states": "us", america: "us",
  uk: "gb", gb: "gb", britain: "gb", "great britain": "gb", "united kingdom": "gb",
  england: "gb", scotland: "gb", wales: "gb", "northern ireland": "gb",
  uae: "ae", "south korea": "kr", korea: "kr", "republic of korea": "kr",
  "日本": "jp", "한국": "kr", "대한민국": "kr", "中国": "cn", "中國": "cn", "台湾": "tw", "台灣": "tw",
  "美国": "us", "美國": "us", "アメリカ": "us", "미국": "us", "英国": "gb", "イギリス": "gb", "영국": "gb",
};

/** Does one qualifier the user typed describe this row? */
export function qualifierMatches(qualifier: string, row: GeoRow): boolean {
  const q = norm(qualifier);
  if (!q) return true;
  const fields = [row.admin1, row.admin2, row.country].filter((f): f is string => !!f).map(norm);
  const code = (row.country_code ?? "").toLowerCase();

  if (fields.some((f) => f === q)) return true;
  // "Vermont" vs "State of Vermont", "Tokyo" vs "Tokyo-to"; both sides ≥ 3 chars.
  if (q.length >= 3 && fields.some((f) => f.length >= 3 && (f.includes(q) || q.includes(f)))) return true;
  // CJK names are short: 東京 vs 東京都.
  if (/[぀-ヿ㐀-鿿가-힯]/.test(q) && fields.some((f) => f.startsWith(q) || q.startsWith(f))) return true;
  // Two-letter codes: a country code, or a US state.
  if (q.length === 2 && code === q) return true;
  if (code === "us" && US_STATES[q] && fields.some((f) => f === US_STATES[q])) return true;
  const alias = COUNTRY_ALIASES[q];
  if (alias && code === alias) return true;
  return false;
}

/** Rows that match EVERY qualifier, in the provider's order (most populous first). */
export function filterByQualifiers<T extends GeoRow>(rows: T[], qualifiers: string[]): T[] {
  if (qualifiers.length === 0) return rows;
  return rows.filter((row) => qualifiers.every((q) => qualifierMatches(q, row)));
}

/**
 * Pair the user's-language rows with the English rows of the same places
 * (by `id`): the localized order first (most populous first), then English
 * rows the localized search did not return, shown in English.
 */
export function pairById<T extends GeoRow>(loc: T[], en: T[]): Candidate<T>[] {
  const enById = new Map<number, T>();
  for (const r of en) if (typeof r.id === "number") enById.set(r.id, r);
  const seen = new Set<number>();
  const out: Candidate<T>[] = [];
  for (const r of loc) {
    const twin = typeof r.id === "number" ? enById.get(r.id) : undefined;
    if (typeof r.id === "number") seen.add(r.id);
    out.push(twin ? { loc: r, en: twin } : { loc: r });
  }
  for (const r of en) {
    if (typeof r.id === "number" && seen.has(r.id)) continue;
    out.push({ loc: r, en: r });
  }
  return out;
}

/** Does every qualifier describe this place, in the user's language or in English? */
export function candidateMatches(qualifiers: string[], c: Candidate): boolean {
  return qualifiers.every((q) => qualifierMatches(q, c.loc) || (!!c.en && qualifierMatches(q, c.en)));
}

/** Candidates that match EVERY qualifier, in order. */
export function filterCandidates<T extends GeoRow>(cands: Candidate<T>[], qualifiers: string[]): Candidate<T>[] {
  if (qualifiers.length === 0) return cands;
  return cands.filter((c) => candidateMatches(qualifiers, c));
}

/**
 * A name typed in kana, hangul or han (スプリングフィールド, 스프링필드,
 * 斯普林菲尔德). Open-Meteo finds a place by such a name only when that
 * place carries one in that script — the small Springfield in Vermont does
 * not — so the caller also searches the English name of what it found.
 */
export function isNonLatinName(name: string): boolean {
  return /[぀-ヿ㐀-鿿가-힯ｦ-ﾟ]/.test(name);
}
