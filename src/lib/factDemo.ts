/* ============================================================================
   factDemo.ts | the pure half of the "change one fact" demo on the homepage
   ============================================================================
   Safe to edit. The band is src/components/home/FactDemo.astro and the
   browser half is src/scripts/factDemo.ts; this file holds the parts worth
   unit-testing (src/lib/factDemo.test.ts): reading a time the way a church
   office would type it, printing it back, and the one derived fact (coffee is
   served 15 minutes before the service starts).

   Times are minutes after midnight (0 to 1439) so the arithmetic is plain.
   No DOM, no dependencies: the browser script imports these as they are.
   ============================================================================ */

/** The service time the band starts with (10:30 AM), in minutes after midnight. */
export const START_MINUTES = 10 * 60 + 30;

/** Coffee is served this many minutes before the service: the demo's derived fact. */
export const COFFEE_LEAD_MINUTES = 15;

const DAY = 24 * 60;

/** 630 -> "10:30 AM". Wraps round midnight, so -15 -> "11:45 PM". */
export function formatTime(minutes: number): string {
  const m = ((Math.round(minutes) % DAY) + DAY) % DAY;
  const h24 = Math.floor(m / 60);
  const min = m % 60;
  const suffix = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 || 12;
  return `${h12}:${min < 10 ? '0' : ''}${min} ${suffix}`;
}

/**
 * Reads a time typed the way people type one, or returns null when it is not a time.
 *
 * Accepts "9", "9:15", "9.15", "915", "9:15am", "9:15 a.m.", "6 pm", "18:00" and "noon".
 * A bare hour from 1 to 6 with no am or pm reads as afternoon or evening (nobody holds
 * a 3 AM service, and "6" on a church sign means six in the evening). Refuses anything
 * else, including "half ten", "25:00", "9:75" and an empty field.
 */
export function parseTime(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/\s+/g, '');
  if (s === 'noon' || s === 'midday') return 12 * 60;
  const m = /^(\d{1,2})(?:[:.]?(\d{2}))?(?:(a|p)\.?(?:m\.?)?)?$/.exec(s);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (min > 59) return null;
  if (m[3]) {
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (m[3] === 'p' ? 12 : 0);
  } else if (h > 23) {
    return null;
  } else if (h >= 1 && h <= 6) {
    h += 12;
  }
  return h * 60 + min;
}

/** The derived fact: when the coffee starts, worked out from the service time. */
export function coffeeFrom(serviceMinutes: number): number {
  return (((serviceMinutes - COFFEE_LEAD_MINUTES) % DAY) + DAY) % DAY;
}

/**
 * The time the page-by-page mode types in for you when it is switched on, so the drift
 * shows at once: half an hour later, or earlier if that would run past 10 PM.
 */
export function nudgedTime(minutes: number): number {
  return minutes + 30 > 22 * 60 ? minutes - 30 : minutes + 30;
}
