/* ============================================================================
   tier-pick | The three questions that suggest a tier
   ============================================================================
   One rule, read in two places: the picker on /services (src/scripts/prices.js)
   and the corner card the dock offers on every page (TierPicker.astro,
   src/scripts/tier-picker.js). Both print the questions from QUESTIONS and get
   their answer from suggestTier() and whyLine(), so they can never disagree.

   The rule: the answer is the largest thing asked for, because one big need
   sets the scope, with one exception. Flagship is for custom tools, so only
   that answer reaches it. Everything else tops out at Signature. The "Why:"
   line says which answers decided it.

   No price lives here. The tiers' names and prices come from
   src/data/pricing.ts through pickTiers().
   ============================================================================ */

export interface PickQuestion {
  /** The radio group's name: 'size', 'who' or 'tools'. */
  name: 'size' | 'who' | 'tools';
  /** The question, as asked. */
  ask: string;
  /** The three answers, smallest first. An answer's value is its place: 0, 1 or 2. */
  options: [string, string, string];
  /** What each answer means, in the words of a "Why:" line. */
  said: [string, string, string];
}

export const QUESTIONS: PickQuestion[] = [
  {
    name: 'size',
    ask: 'How much does the site need to hold?',
    options: ['The essential pages', 'Deeper sections', 'A large, deep site'],
    said: ['it holds the essential pages', 'it needs deeper sections', 'it is a large site'],
  },
  {
    name: 'who',
    ask: 'What will your team keep up to date?',
    options: ['A few pages', 'Several kinds of content', 'A lot, across many kinds'],
    said: [
      'your team keeps a few pages current',
      'your team keeps several kinds of content current',
      'your team keeps a lot current',
    ],
  },
  {
    name: 'tools',
    ask: 'Does it need to do real work?',
    options: [
      'Mostly inform people',
      'Connect to other services',
      'Custom tools, like bookings or sign-ups',
    ],
    said: ['it mostly informs people', 'it connects to other services', 'it needs custom tools'],
  },
];

/** Which tier three answers point at: 0 Launch, 1 Signature, 2 Flagship. -1 until all are in. */
export function suggestTier(vals: number[]): number {
  if (vals.length < QUESTIONS.length || vals.some((v) => !(v >= 0 && v <= 2))) return -1;
  return vals[2] === 2 ? 2 : Math.min(1, Math.max(...vals));
}

const join = (parts: string[]) =>
  parts.length < 2 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;

/** The sentence under the suggested card: which answers decided it. */
export function whyLine(vals: number[], tier: number): string {
  if (tier === 2) return `Why: you said ${QUESTIONS[2].said[2]}.`;
  const parts = QUESTIONS.map((q, k) => (vals[k] >= tier ? q.said[vals[k]] : '')).filter(Boolean);
  const capped = vals[0] === 2 || vals[1] === 2;
  return `Why: you said ${join(parts)}.${
    capped ? ' Flagship is for custom tools, so Signature is the place to start.' : ''
  }`;
}

/** What a picker shows for each tier, built from pricing.ts by the page that prints it. */
export interface PickTier {
  name: string;
  /** The starting price as text, "$3,500". */
  from: string;
  /** The usual range, ending in a full stop. */
  range: string;
}

export function pickTiers(
  tiers: { name: string; priceFrom: number; range: string }[],
  money: (n: number) => string,
): PickTier[] {
  return tiers.map((t) => ({ name: t.name, from: money(t.priceFrom), range: `${t.range}.` }));
}
