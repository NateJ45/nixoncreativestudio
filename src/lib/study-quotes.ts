// Safe to edit. Which client quotes a case study shows (added 2026-11-16).
//
// Every quote is written ONCE, on the study it came from (its "home"). A quote about more than one
// site, like Richard Burnett's Google review of Theology Matters and the Foundation for Reformed
// Theology, names the other studies in `alsoOn`. Then:
//
//   - a study PAGE shows its own quotes, then the ones shared onto it (quotesFor below);
//   - everything that gathers quotes across the whole site (the home band, the hero's quoted
//     phrases, the rating chip's faces, src/lib/reviews.ts, the review count test) reads each
//     study's own `testimonials` only, so a shared quote is never counted or shown twice.
//
// So never paste a quote into a second study's frontmatter: add that study to `alsoOn`.
// src/lib/case-testimonials.test.ts checks every `alsoOn` names a real, different study.

import type { CollectionEntry } from 'astro:content';

type Study = Pick<CollectionEntry<'case-studies'>, 'id' | 'data'>;
export type StudyQuote = NonNullable<Study['data']['testimonials']>[number];

/** A study's own quotes first, then any another study shares onto it, in study order. */
export function quotesFor(all: readonly Study[], slug: string): StudyQuote[] {
  const own = all.find((s) => s.id === slug)?.data.testimonials ?? [];
  const shared = [...all]
    .filter((s) => s.id !== slug)
    .sort((a, b) => a.id.localeCompare(b.id))
    .flatMap((s) => (s.data.testimonials ?? []).filter((t) => t.alsoOn?.includes(slug)));
  return [...own, ...shared];
}

/** The same person under two spellings ("Richard E. Burnett, Ph.D." and "Richard Burnett"):
 *  credentials after the comma and middle names or initials are ignored. */
export function samePerson(a: string, b: string): boolean {
  const key = (n: string) => {
    const words = n.split(',')[0].trim().toLowerCase().split(/\s+/);
    return `${words[0]} ${words[words.length - 1]}`;
  };
  return key(a) === key(b);
}

/** Quotes grouped one card per person, in order of each person's first quote, oldest words
 *  first inside a card. */
export function byPerson<T extends { name: string; date: Date }>(quotes: readonly T[]): T[][] {
  const cards: T[][] = [];
  for (const q of quotes) {
    const card = cards.find((c) => samePerson(c[0].name, q.name));
    if (card) card.push(q);
    else cards.push([q]);
  }
  return cards.map((c) => [...c].sort((a, b) => a.date.valueOf() - b.date.valueOf()));
}

/** "February 2025", for the small dated note on a card with more than one quote. */
export const monthYear = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
