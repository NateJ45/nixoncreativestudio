// Safe to edit. Site-owned: checks the hand-typed Google review totals in
// src/data/reviews.ts against what the case studies quote.
//
// The hero chip says "5.0 on Google, 3 reviews". Those numbers are typed in by
// hand, so this catches the two easy slips: a rating or date that cannot be
// right, and a count lower than the number of Google reviews the site itself
// quotes (which would mean the count was not updated when a review was added).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { googleReviews } from '../data/reviews.ts';

const dir = fileURLToPath(new URL('../content/case-studies/', import.meta.url));
// One review can be quoted in parts on more than one study (Clark Remsburg's, split between
// Orangeburg and Theology Matters on 2026-11-20), so reviews are counted by their Google link.
const caseLinks = readdirSync(dir)
  .filter((f) => f.endsWith('.mdx'))
  .map((f) => readFileSync(dir + f, 'utf8').split(/\r?\n---\r?\n/)[0])
  .flatMap((front) => [...front.matchAll(/^ {6}url: '([^']+)'\s*$/gm)].map((m) => m[1]));
const quotedOnGoogle =
  new Set(caseLinks).size +
  // and the quotes with no case study
  (
    readFileSync(fileURLToPath(new URL('../data/quotes.ts', import.meta.url)), 'utf8').match(
      /^\s+platform: 'google',$/gm,
    ) ?? []
  ).length;

test('the Google rating is between 1 and 5, to one decimal place', () => {
  const r = googleReviews.rating;
  assert.ok(r >= 1 && r <= 5, `rating ${r} is outside 1 to 5`);
  assert.equal(Math.round(r * 10) / 10, r, 'Google shows one decimal place');
});

test('the review count is a whole number and covers every Google review quoted on the site', () => {
  assert.ok(Number.isInteger(googleReviews.count) && googleReviews.count > 0);
  assert.ok(
    googleReviews.count >= quotedOnGoogle,
    `the site quotes ${quotedOnGoogle} Google reviews but reviews.ts says ${googleReviews.count}`,
  );
});

test('the checked date is a real day and not in the future', () => {
  const c = googleReviews.checked;
  assert.match(c, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(new Date(`${c}T00:00:00Z`).toISOString().slice(0, 10), c);
  assert.ok(c <= new Date().toISOString().slice(0, 10), `${c} is in the future`);
});

test('the chip links to the Business Profile on Google Maps', () => {
  assert.match(googleReviews.url, /^https:\/\/www\.google\.com\/maps\?cid=\d+$/);
});
