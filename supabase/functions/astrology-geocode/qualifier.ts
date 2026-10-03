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
 * src/test/golden/geocode-qualifier.test.ts.
 */

export interface GeoRow {
  name: string;
  admin1?: string;
  admin2?: string;
  country?: string;
  country_code?: string;
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
