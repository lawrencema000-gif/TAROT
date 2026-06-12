// Full moon detection using synodic period calculation
// Reference NEW moon: January 6, 2000 18:14 UTC (canonical ephemeris anchor).
// Full moon occurs ~14.7653 days (half a synodic cycle) after the new moon.
const REFERENCE_NEW_MOON = new Date('2000-01-06T18:14:00Z').getTime();
const SYNODIC_PERIOD = 29.53059 * 24 * 60 * 60 * 1000; // in milliseconds
const FULL_MOON_AGE_DAYS = 29.53059 / 2; // ≈ 14.7653 days after new moon

export function isFullMoon(date: Date = new Date()): boolean {
  const diff = date.getTime() - REFERENCE_NEW_MOON;
  const phase = ((diff % SYNODIC_PERIOD) + SYNODIC_PERIOD) % SYNODIC_PERIOD;
  const ageDays = phase / (24 * 60 * 60 * 1000);
  // Within ~1.5 days of full moon (moon age ≈ 14.77 days)
  return Math.abs(ageDays - FULL_MOON_AGE_DAYS) < 1.5;
}
