// Safe to edit. The public reviews quoted on the site, gathered from the case studies and the
// quotes with no case study (src/data/quotes.ts).
//
// A review is a `testimonials` item with a `source` (see src/content.config.ts). This file turns
// them into one flat list for the pieces that show more than one study's review at once: the home
// hero's rating chip (the faces) and the client sheet (via clients.ts). The words themselves stay in
// the case study frontmatter or quotes.ts, so there is one copy of each review.

import { getCollection } from 'astro:content';
import { QUOTES } from '../data/quotes';

export interface Review {
  slug: string;
  name: string;
  title: string;
  quote: string;
  highlight?: string;
  /** Public path without size or extension: add -96.webp or -192.webp. */
  photo?: string;
  url: string;
  rating: number;
}

/** Every quote with a public source, newest first. */
export async function getReviews(): Promise<Review[]> {
  const studies = await getCollection('case-studies');
  const out: (Review & { date: Date })[] = [];
  for (const s of studies) {
    for (const t of s.data.testimonials ?? []) {
      if (!t.source) continue;
      out.push({
        slug: s.id,
        name: t.name,
        title: t.title,
        quote: t.quote,
        highlight: t.highlight,
        photo: t.photo,
        url: t.source.url,
        rating: t.source.rating,
        date: t.date,
      });
    }
  }
  for (const q of QUOTES) {
    if (!q.source) continue;
    out.push({
      slug: q.id,
      name: q.name,
      title: q.title,
      quote: q.quote,
      highlight: q.highlight,
      photo: q.photo,
      url: q.source.url,
      rating: q.source.rating,
      date: new Date(`${q.date}T00:00:00Z`),
    });
  }
  return out.sort((a, b) => b.date.valueOf() - a.date.valueOf()).map(({ date: _d, ...r }) => r);
}

/** The first name, for "Staci's review". */
export const firstName = (name: string) => name.split(/\s+/)[0];
