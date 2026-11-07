/* ============================================================================
   Tier costs | The honest first-year, three-year and five-year sums
   ============================================================================
   Computed from src/data/pricing.ts, never typed, so /services and /one-page/
   cannot drift from the prices. The rule the sums follow is the one the page
   states: year one Hosting is included in every build, so Hosting alone is billed
   from year two. A care plan is billed from the first month, and it includes
   hosting, so a client on care pays the care price every year from launch.
   A tier's starting price is used, because that is the one fixed number.
   ============================================================================ */

import { carePlans, webTiers, type CarePlan, type WebTier } from '../data/pricing.ts';
import { dollars } from './money.ts';

/** What a care level costs over a whole year: '$69' '/mo' is 828, '$180' '/yr' is 180. */
export function carePerYear(plan: Pick<CarePlan, 'price' | 'period'>): number {
  const [amount] = dollars(plan.price);
  return plan.period === '/mo' ? amount * 12 : amount;
}

/** Build price plus Hosting, with year one's Hosting included in the build. */
export function costOver(build: number, perYear: number, years: number): number {
  return build + perYear * Math.max(0, years - 1);
}

/** Build price plus a care plan billed from the first month. */
export function careOver(build: number, perYear: number, years: number): number {
  return build + perYear * years;
}

export interface Sums {
  yearOne: number;
  threeYears: number;
  fiveYears: number;
}

export interface TierCost extends Sums {
  tier: WebTier;
  /** The tier's example care level. Every care level includes hosting. */
  plan: CarePlan;
  perYear: number;
  /** The same build kept on Hosting alone, the floor every live site needs. */
  hostingPlan: CarePlan;
  hostingOnly: Sums;
}

const sums = (over: typeof costOver, build: number, perYear: number): Sums => ({
  yearOne: over(build, perYear, 1),
  threeYears: over(build, perYear, 3),
  fiveYears: over(build, perYear, 5),
});

export function tierCost(tier: WebTier, plans: CarePlan[] = carePlans): TierCost {
  const plan = plans.find((p) => p.name === tier.care);
  if (!plan) throw new Error(`No care plan called ${tier.care}`);
  const hostingPlan = plans.find((p) => p.name === 'Hosting');
  if (!hostingPlan) throw new Error('No care plan called Hosting');
  const perYear = carePerYear(plan);
  return {
    tier,
    plan,
    perYear,
    ...sums(careOver, tier.priceFrom, perYear),
    hostingPlan,
    hostingOnly: sums(costOver, tier.priceFrom, carePerYear(hostingPlan)),
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
