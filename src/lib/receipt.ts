/* ============================================================================
   Receipt | The live receipt's sums on /services
   ============================================================================
   The receipt under the five-year table adds up one choice: a tier's build, kept
   on Hosting, with or without a care plan, for 1 to 5 years. It follows the same
   rule as src/lib/tier-costs.ts (year one Hosting is included in the build, so
   Hosting is billed from year two; care is billed every month from launch), and
   receipt.test.ts checks it gives the cost table's numbers for every row.

   This file imports nothing, because src/scripts/prices.js bundles it for the
   browser: the page hands it the numbers from pricing.ts in a data attribute,
   so no price is typed here.
   ============================================================================ */

export interface ReceiptInput {
  /** The tier's starting price, a one-time build cost. */
  build: number;
  /** Hosting for a whole year. */
  hostingPerYear: number;
  /** The care plan's monthly price, or 0 for Hosting only. */
  carePerMonth: number;
  /** How many years, 1 to 5. */
  years: number;
}

export interface Receipt {
  build: number;
  /** The years Hosting is billed: every year after the first. */
  hostingYears: number;
  hosting: number;
  /** The months care is billed: every month from launch. */
  careMonths: number;
  care: number;
  total: number;
}

export function receipt({ build, hostingPerYear, carePerMonth, years }: ReceiptInput): Receipt {
  const y = Math.min(5, Math.max(1, Math.round(years)));
  const hostingYears = y - 1;
  const careMonths = carePerMonth > 0 ? y * 12 : 0;
  const hosting = hostingPerYear * hostingYears;
  const care = carePerMonth * careMonths;
  return { build, hostingYears, hosting, careMonths, care, total: build + hosting + care };
}

/** '$4,000', the way the site prints a price (src/lib/money.ts does the same on the server). */
export const usd = (n: number): string => `$${n.toLocaleString('en-US')}`;

/** '1 year', '3 years'. */
export const yearsWord = (n: number): string => `${n} ${n === 1 ? 'year' : 'years'}`;

/** What the receipt is about, in the names the page uses. */
export interface ReceiptNames {
  tier: string;
  /** The care plan's name, or '' for Hosting only. */
  plan: string;
  hostingName: string;
  years: number;
}

export interface ReceiptLine {
  key: 'build' | 'hosting' | 'care' | 'total';
  label: string;
  /** How the amount was worked out, in words. */
  note: string;
  amount: string;
}

/**
 * The receipt's four lines, in words. The page prints them on the server for the
 * default choice and prices.js prints them again on every change, from this one
 * function, so the two can never read differently.
 */
export function receiptLines(r: Receipt, n: ReceiptNames, input: ReceiptInput): ReceiptLine[] {
  const hostingNote =
    r.hostingYears === 0
      ? 'Year one is included in the build'
      : `Year one included, then ${usd(input.hostingPerYear)} per year for ${yearsWord(r.hostingYears)}`;
  return [
    { key: 'build', label: `${n.tier} build`, note: 'One-time', amount: usd(r.build) },
    {
      key: 'hosting',
      label: n.hostingName,
      note: hostingNote,
      amount: r.hostingYears === 0 ? 'Included' : usd(r.hosting),
    },
    n.plan
      ? {
          key: 'care',
          label: n.plan,
          note: `${usd(input.carePerMonth)} per month for ${r.careMonths} months`,
          amount: usd(r.care),
        }
      : {
          key: 'care',
          label: 'Care plan',
          note: 'None. You make changes yourself.',
          amount: 'None',
        },
    {
      key: 'total',
      label: `Total after ${yearsWord(n.years)}`,
      note: '',
      amount: usd(r.total),
    },
  ];
}
