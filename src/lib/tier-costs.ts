/* ============================================================================
   Tier costs | The honest first-year, three-year and five-year sums
   ============================================================================
   Computed from src/data/pricing.ts, never typed, so /services and /one-page/
   cannot drift from the prices. The rule the sums follow is the one the page
   states: year one Hosting is included in every build, so Hosting alone is billed
   from year two. Care is an add-on on top of Hosting, billed from the first month,
   so a client on care pays care from launch and Hosting from year two as well.
   A tier's starting price is used, because that is the one fixed number.

   Each tier gets the rows its cost table prints (costRows): Hosting alone, then
   the usual care pairing. A tier with `needsCare` (Flagship: custom tools need
   Care or Care+) never gets a Hosting-only row; it gets one row per care plan
   from that level up instead (Nathan, 2026-11-07).
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

/** Build price plus a care add-on billed from the first month, plus Hosting from year two. */
export function careOver(
  build: number,
  carePerYearAmount: number,
  hostingPerYear: number,
  years: number,
): number {
  return build + carePerYearAmount * years + hostingPerYear * Math.max(0, years - 1);
}

export interface Sums {
  yearOne: number;
  threeYears: number;
  fiveYears: number;
}

/** One printed row of a cost table: the build kept on Hosting alone, or with a care add-on. */
export interface CostRow extends Sums {
  /** The plan the row is about: Hosting itself, or the care add-on paid on top of Hosting. */
  plan: CarePlan;
  /** True when the row adds a care plan on top of Hosting. */
  withCare: boolean;
  /** The five-year total split into its three parts, for the cost bar. They add up to fiveYears. */
  parts: { build: number; hosting: number; care: number };
}

export interface TierCost extends Sums {
  tier: WebTier;
  /** The tier's usual care add-on, paid on top of Hosting. The Sums above are for it. */
  plan: CarePlan;
  perYear: number;
  hostingPlan: CarePlan;
  /** The rows the cost tables print, in order. */
  rows: CostRow[];
  /** The usual pairing's row: what the cost bar draws. */
  usual: CostRow;
}

const sums = (over: (years: number) => number): Sums => ({
  yearOne: over(1),
  threeYears: over(3),
  fiveYears: over(5),
});

const findPlan = (plans: CarePlan[], name: string): CarePlan => {
  const plan = plans.find((p) => p.name === name);
  if (!plan) throw new Error(`No care plan called ${name}`);
  return plan;
};

/** A row for the build on Hosting alone (plan is Hosting), or with a care add-on on top. */
export function costRow(build: number, plan: CarePlan, hostingPlan: CarePlan): CostRow {
  const hostingPerYear = carePerYear(hostingPlan);
  const withCare = plan !== hostingPlan;
  const careYear = withCare ? carePerYear(plan) : 0;
  return {
    plan,
    withCare,
    ...sums((y) => careOver(build, careYear, hostingPerYear, y)),
    parts: { build, hosting: hostingPerYear * 4, care: careYear * 5 },
  };
}

/** The rows a tier's cost table prints: Hosting alone and the usual care, or every care level it may take. */
export function costRows(tier: WebTier, plans: CarePlan[] = carePlans): CostRow[] {
  const hostingPlan = findPlan(plans, 'Hosting');
  if (tier.needsCare) {
    const from = plans.indexOf(findPlan(plans, tier.needsCare));
    return plans.slice(from).map((p) => costRow(tier.priceFrom, p, hostingPlan));
  }
  return [hostingPlan, findPlan(plans, tier.care)].map((p) =>
    costRow(tier.priceFrom, p, hostingPlan),
  );
}

export function tierCost(tier: WebTier, plans: CarePlan[] = carePlans): TierCost {
  const plan = findPlan(plans, tier.care);
  const hostingPlan = findPlan(plans, 'Hosting');
  const perYear = carePerYear(plan);
  const hostingPerYear = carePerYear(hostingPlan);
  const rows = costRows(tier, plans);
  const usual = rows.find((r) => r.plan === plan) ?? costRow(tier.priceFrom, plan, hostingPlan);
  return {
    tier,
    plan,
    perYear,
    ...sums((y) => careOver(tier.priceFrom, perYear, hostingPerYear, y)),
    hostingPlan,
    rows,
    usual,
  };
}

/** One entry per tier, in tier order. */
export const tierCosts = (): TierCost[] => webTiers.map((t) => tierCost(t));

/** The cheapest way to keep a build running: Hosting alone, for an org that edits everything itself. */
export const hostingOnlyFiveYears = (tier: WebTier, plans: CarePlan[] = carePlans): number => {
  const hosting = findPlan(plans, 'Hosting');
  return costOver(tier.priceFrom, carePerYear(hosting), 5);
};
