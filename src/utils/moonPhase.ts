// Full moon detection using synodic period calculation
// Reference full moon: January 6, 2000 18:14 UTC
const REFERENCE_FULL_MOON = new Date('2000-01-06T18:14:00Z').getTime();
const SYNODIC_PERIOD = 29.53059 * 24 * 60 * 60 * 1000; // in milliseconds

export function isFullMoon(date: Date = new Date()): boolean {
  const diff = date.getTime() - REFERENCE_FULL_MOON;
  const phase = ((diff % SYNODIC_PERIOD) + SYNODIC_PERIOD) % SYNODIC_PERIOD;
  const daysFromFull = phase / (24 * 60 * 60 * 1000);
  // Within ~1.5 days of full moon
  return daysFromFull < 1.5 || daysFromFull > (29.53059 - 1.5);
}
