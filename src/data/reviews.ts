// Safe to edit by hand.
// =============================================================================
// The studio's public review totals (Google Business Profile)
// =============================================================================
// The home hero's rating chip reads these numbers. They are typed in by hand,
// copied from the Business Profile, because a live count needs the Google
// Places API and a billed Cloud project (a money decision, not made yet).
//
// WHEN A NEW GOOGLE REVIEW ARRIVES
//   1. Open the profile (site.social.googleBusiness) and copy the rating and
//      the count shown next to the stars.
//   2. Change `rating`, `count` and `checked` below.
//   3. If the review is good enough to quote, add it to the client's case
//      study `testimonials:` with its `source` link (src/content.config.ts
//      explains the fields) and record it in the vault note
//      projects/ncs-testimonials.md.
//
// src/lib/reviews.test.ts checks the numbers make sense and that the count is
// never lower than the number of Google reviews quoted on the site.
// =============================================================================

import { site } from './site.ts';

export interface ReviewTotals {
  platform: 'google';
  /** The average shown on the profile, one decimal place (5.0, 4.9). */
  rating: number;
  /** How many reviews the profile shows. */
  count: number;
  /** Where the chip links: the profile, which opens on its reviews. */
  url: string;
  /** The day these numbers were copied off the profile (YYYY-MM-DD). */
  checked: string;
}

export const googleReviews: ReviewTotals = {
  platform: 'google',
  rating: 5.0,
  count: 2,
  url: site.social.googleBusiness,
  checked: '2026-11-15',
};
