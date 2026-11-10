/* ============================================================================
   Reply order | How soon a message is answered, by plan
   ============================================================================
   The care section on /services shows where a message lands by plan: soonest
   reply first. The only thing it may say is what each plan's `support` line in
   src/data/pricing.ts already promises, so this file reads the promise out of
   that line and never states a time of its own.

   A plan whose line promises no reply time (Hosting) has no rank and goes last.
   reply-order.test.ts fails if a care plan's wording changes so that its promise
   can no longer be read, rather than letting the page guess.
   ============================================================================ */

import type { CarePlan } from '../data/pricing.ts';

export interface ReplyPromise {
  /** Business days until a reply is promised: 0 is the same day. null when no time is promised. */
  days: number | null;
  /** The plan's own sentence about replies, word for word, or '' when it has none. */
  says: string;
}

/** The first sentence of a line, with its full stop. */
export const firstSentence = (line: string): string => (line.match(/^[^.]*\./) ?? [''])[0];

/** Read the reply promise out of a plan's support line. */
export function replyPromise(plan: Pick<CarePlan, 'support'>): ReplyPromise {
  const says = firstSentence(plan.support);
  if (!/repl(y|ies)/i.test(says)) return { days: null, says: '' };
  if (/same business day/i.test(says)) return { days: 0, says };
  if (/next business day/i.test(says)) return { days: 1, says };
  const within = says.match(/within (\d+) business days?/i);
  if (within) return { days: Number(within[1]), says };
  return { days: null, says: '' };
}

export interface ReplyRow extends ReplyPromise {
  plan: CarePlan;
}

/** Every plan with its promise, soonest reply first; a plan with no promised time goes last. */
export function replyOrder(plans: CarePlan[]): ReplyRow[] {
  return plans
    .map((plan) => ({ plan, ...replyPromise(plan) }))
    .sort((a, b) => (a.days ?? Infinity) - (b.days ?? Infinity));
}
