/* ============================================================================
   Tier costs | The honest first-year, three-year and five-year sums
   ============================================================================
   Computed from src/data/pricing.ts, never typed, so /services and /one-page/
   cannot drift from the prices. The rule the sums follow is the one the page
   states: year one hosting is included in every build, so nothing is billed for
   care until year two, and the named care level runs every year after that.
   A tier's starting price is used, because that is the one fixed number.
   ============================================================================ */

import { carePlans, webTiers, type CarePlan, type WebTier } from '../data/pricing.ts';
import { dollars } from './money.ts';

/** What a care level costs over a whole year: '$69' '/mo' is 828, '$180' '/yr' is 180. */
export function carePerYear(plan: Pick<CarePlan, 'price' | 'period'>): number {
  const [amount] = dollars(plan.price);
  return plan.period === '/mo' ? amount * 12 : amount;
}

/** Build price plus care, with year one's care included in the build. */
export function costOver(build: number, perYear: number, years: number): number {
  return build + perYear * Math.max(0, years - 1);
}

export interface TierCost {
  tier: WebTier;
  plan: CarePlan;
  perYear: number;
  yearOne: number;
  threeYears: number;
  fiveYears: number;
}

export function tierCost(tier: WebTier, plans: CarePlan[] = carePlans): TierCost {
  const plan = plans.find((p) => p.name === tier.care);
  if (!plan) throw new Error(`No care plan called ${tier.care}`);
  const perYear = carePerYear(plan);
  return {
    tier,
    plan,
    perYear,
    yearOne: costOver(tier.priceFrom, perYear, 1),
    threeYears: costOver(tier.priceFrom, perYear, 3),
    fiveYears: costOver(tier.priceFrom, perYear, 5),
  };
}

/** One row per tier, in tier order. */
export const tierCosts = (): TierCost[] => webTiers.map((t) => tierCost(t));

/** The cheapest way to keep a build running: Hosting alone, for an org that edits everything itself. */
export const hostingOnlyFiveYears = (tier: WebTier, plans: CarePlan[] = carePlans): number => {
  const hosting = plans.find((p) => p.name === 'Hosting');
  if (!hosting) throw new Error('No care plan called Hosting');
  return costOver(tier.priceFrom, carePerYear(hosting), 5);
};
