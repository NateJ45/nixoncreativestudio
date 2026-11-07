// Safe to edit. Site-owned (not PORTABLE): it checks this site's case studies.
// =============================================================================
// Case-study palette gate
// =============================================================================
// Client color lives only inside the work. A window's chrome, a quote band, a
// sheet and a study's hero all set the client's paper on their accent, so that
// pair has to clear WCAG AA for every study. Study order is the Up next loop.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { contrastRatio, AA_BODY_TEXT } from './contrast.ts';
import { nightMark, NIGHT_SURFACES } from './night-mark.ts';

const dir = new URL('../content/case-studies/', import.meta.url);
const studies = readdirSync(dir)
  .filter((f) => f.endsWith('.mdx'))
  .map((f) => {
    const text = readFileSync(new URL(f, dir), 'utf8').replace(/\r\n/g, '\n');
    const front = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? '';
    const palette = /^palette:\n((?: {2}.*\n)+)/m.exec(front)?.[1] ?? '';
    const color = (k: string) =>
      new RegExp(`^ {2}${k}: '(#[0-9a-fA-F]{6})'`, 'm').exec(palette)?.[1];
    return {
      slug: f.replace(/\.mdx$/, ''),
      order: Number(/^order: (\d+)/m.exec(front)?.[1]),
      paper: color('paper'),
      accent: color('accent'),
      markDark: color('markDark'),
    };
  });

test('there are case studies to check', () => {
  assert.ok(studies.length > 0);
});

test('study order runs 1..n with no gaps or repeats', () => {
  const orders = studies.map((s) => s.order).sort((a, b) => a - b);
  assert.deepEqual(
    orders,
    studies.map((_, i) => i + 1),
  );
});

// The accent also leaves the hero as small text on the page: chapter marks, the corner number on a
// decision, "What I did". So it has to read on the neutral page and on a white card.
for (const { slug, accent } of studies) {
  test(`${slug}: accent as text on the page and on a card clears AA`, () => {
    assert.ok(accent);
    for (const ground of ['#f5f5f3', '#ffffff']) {
      const ratio = contrastRatio(accent, ground);
      assert.ok(ratio >= AA_BODY_TEXT, `${slug}: ${accent} on ${ground} is ${ratio.toFixed(2)}:1`);
    }
  });
}

// On the dark side the accent is usually too deep to read, so a study's marks take nightMark().
for (const { slug, accent, markDark } of studies) {
  test(`${slug}: its mark on the dark side clears AA on the page and on a card`, () => {
    assert.ok(accent);
    const mark = nightMark(accent, markDark);
    for (const ground of NIGHT_SURFACES) {
      const ratio = contrastRatio(mark, ground);
      assert.ok(ratio >= AA_BODY_TEXT, `${slug}: ${mark} on ${ground} is ${ratio.toFixed(2)}:1`);
    }
  });
}

for (const { slug, paper, accent } of studies) {
  test(`${slug}: paper on accent clears AA`, () => {
    assert.ok(paper && accent, `${slug} needs palette.paper and palette.accent`);
    const ratio = contrastRatio(paper, accent);
    assert.ok(ratio >= AA_BODY_TEXT, `${slug}: ${paper} on ${accent} is ${ratio.toFixed(2)}:1`);
  });
}
