import { nextCheckinOpensAt } from '../../dal/moonstones';

/**
 * When the next daily check-in opens, in the reader's own clock.
 *
 * A check-in belongs to the UTC day (the server's CURRENT_DATE), so the
 * next one opens at UTC midnight: 09:00 the same morning in Tokyo for a
 * claim made at 08:30, 17:00 the same afternoon in Los Angeles. The widget
 * said "Come back tomorrow" and then offered the claim again hours later on
 * the same day, beside a ritual that rolls over at local midnight (p8 F56).
 * It now names the time, and "tomorrow" only when that is the reader's
 * tomorrow.
 */
export interface CheckinOpening {
  /** The instant the next check-in opens. */
  at: Date;
  /** That instant on the reader's clock ("9:00", "5:00 PM", "오전 9:00"). */
  time: string;
  /** Later on the reader's calendar today, or tomorrow. */
  day: 'today' | 'tomorrow';
  /** It opens at the reader's own midnight (UTC+0): "tomorrow" says it all. */
  atMidnight: boolean;
}

/** 'YYYY-MM-DD' of `d` on the clock of `timeZone` (the device's when omitted). */
function calendarDate(d: Date, timeZone?: string): string {
  // en-CA formats a date as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).format(d);
}

export function checkinOpening(now: Date, locale: string, timeZone?: string): CheckinOpening {
  const at = nextCheckinOpensAt(now);
  const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone }).format(at);
  const day = calendarDate(at, timeZone) === calendarDate(now, timeZone) ? 'today' : 'tomorrow';
  const clock = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(at);
  return { at, time, day, atMidnight: clock === '00:00' };
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** The widget's line once today's check-in is claimed: "Next claim at 5:00 PM". */
export function nextClaimLabel(t: Translate, now: Date, locale: string, timeZone?: string): string {
  const opening = checkinOpening(now, locale, timeZone);
  if (opening.atMidnight) {
    return t('moonstones.alreadyClaimed', { defaultValue: 'Come back tomorrow' });
  }
  return opening.day === 'today'
    ? t('moonstones.nextClaimAt', { defaultValue: 'Next claim at {{time}}', time: opening.time })
    : t('moonstones.nextClaimTomorrowAt', { defaultValue: 'Next claim tomorrow at {{time}}', time: opening.time });
}
