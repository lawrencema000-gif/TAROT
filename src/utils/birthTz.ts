/**
 * Birth-place timezone derivation.
 *
 * Given geocoded birth coordinates, resolve the IANA timezone of the
 * BIRTH PLACE (e.g. Asia/Tokyo) so the server-side trigger can compute
 * the canonical `birth_utc` with the historically-correct offset. The
 * device timezone is the wrong answer for anyone who has moved since
 * birth — this is what fixes the "born in Japan, lives in LA" case.
 *
 * tz-lookup is ~33KB gzipped of packed timezone geometry — lazy-loaded
 * so it never enters the main bundle; only users actively editing their
 * birth place pay for it.
 */

export async function deriveBirthTz(lat: number, lon: number): Promise<string | null> {
  try {
    const { default: tzlookup } = await import('tz-lookup');
    return tzlookup(lat, lon) ?? null;
  } catch {
    // Library load failure or out-of-range coords — let the DB trigger
    // fall back to the device timezone.
    return null;
  }
}
