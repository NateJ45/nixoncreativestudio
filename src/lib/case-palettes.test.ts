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

for (const { slug, paper, accent } of studies) {
  test(`${slug}: paper on accent clears AA`, () => {
    assert.ok(paper && accent, `${slug} needs palette.paper and palette.accent`);
    const ratio = contrastRatio(paper, accent);
    assert.ok(ratio >= AA_BODY_TEXT, `${slug}: ${paper} on ${accent} is ${ratio.toFixed(2)}:1`);
  });
}
