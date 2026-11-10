/* ============================================================================
   Cost views | The cost bars at 1, 3 and 5 years
   ============================================================================
   The cost bars on /services can show each tier's usual pairing after 1, 3 or 5
   years. Each view splits the total into build, Hosting and care, by the rule in
   src/lib/tier-costs.ts: the build is one-time, Hosting is billed for every year
   after the first, and care is billed for every year from launch.

   Nothing is typed here. Every number comes from tierCost(), and
   cost-views.test.ts holds each view's total to the cost table's own column
   (yearOne, threeYears, fiveYears) and the five-year parts to the row's parts.
   ============================================================================ */

import { carePerYear, type TierCost } from './tier-costs.ts';

/** The years the cost table prints a column for, and so the views the bars offer. */
export const VIEW_YEARS = [1, 3, 5] as const;

export interface CostView {
  years: number;
  build: number;
  /** Hosting billed so far: every year after the first. 0 in year one, when it is included. */
  hosting: number;
  care: number;
  /** build + hosting + care. Equals the cost table's cell for this row and column. */
  total: number;
}

/** One view of a tier's usual pairing, after so many years. */
export function costView(c: TierCost, years: number): CostView {
  const build = c.usual.parts.build;
  const hosting = carePerYear(c.hostingPlan) * Math.max(0, years - 1);
  const care = c.usual.withCare ? carePerYear(c.usual.plan) * years : 0;
  return { years, build, hosting, care, total: build + hosting + care };
}

/** The three views, in the cost table's column order. */
export const costViews = (c: TierCost): CostView[] => VIEW_YEARS.map((y) => costView(c, y));

/** '1 year', '3 years'. */
const yearsWord = (n: number): string => `${n} ${n === 1 ? 'year' : 'years'}`;

/** What the Hosting part of the key says for a view: which years are billed. */
export function hostingKey(hostingName: string, years: number): string {
  if (years <= 1) return `${hostingName}, included in year one`;
  if (years === 2) return `${hostingName}, year 2`;
  return `${hostingName}, years 2 ${years === 3 ? 'and' : 'to'} ${years}`;
}

/** What the care part of the key says for a view. */
export const careKey = (years: number): string => `Care plan, ${yearsWord(years)}`;

/**
 * The sentence under a bar: every part and the total, in words. `money` formats
 * a number the way the page prints a price.
 */
export function viewSentence(
  v: CostView,
  names: { hosting: string; plan: string },
  money: (n: number) => string,
): string {
  const hosting =
    v.hosting === 0
      ? `${names.hosting} included in year one`
      : `${names.hosting} ${money(v.hosting)}`;
  return `Build ${money(v.build)}, ${hosting}, ${names.plan} ${money(v.care)}. Total ${money(v.total)}.`;
}

/** '$15,040 over 5 years'. */
export const viewSum = (v: CostView, money: (n: number) => string): string =>
  `${money(v.total)} over ${yearsWord(v.years)}`;
