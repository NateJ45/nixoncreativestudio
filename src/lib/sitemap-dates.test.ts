import { test } from 'node:test';
import assert from 'node:assert/strict';
import { frontmatterLastmod } from './sitemap-dates.ts';

const entry = (lines: string) => `---\n${lines}\n---\n\nBody with updated: 2030-01-01\n`;
const now = new Date('2026-11-07');

test('updated wins over published', () => {
  assert.equal(
    frontmatterLastmod(entry('published: 2026-05-01\nupdated: 2026-10-19'), now),
    '2026-10-19',
  );
});

test('published stands in when there is no updated', () => {
  assert.equal(frontmatterLastmod(entry('published: 2026-05-01'), now), '2026-05-01');
});

test('no date in the frontmatter means no lastmod, even if the body names one', () => {
  assert.equal(frontmatterLastmod(entry('title: Hello'), now), null);
  assert.equal(frontmatterLastmod('no frontmatter at all', now), null);
});

test('a future date is not a modification', () => {
  assert.equal(frontmatterLastmod(entry('published: 2027-01-01'), now), null);
});

test('CRLF files read the same', () => {
  assert.equal(frontmatterLastmod('---\r\npublished: 2026-05-01\r\n---\r\n', now), '2026-05-01');
});
