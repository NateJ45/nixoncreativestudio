import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLUSTERS } from './journal.ts';
import { faceFor, faceSvg } from './journal-art.ts';

test('every cluster has its own drawing, and a post with none still gets one', () => {
  const none = faceFor(undefined);
  const seen = new Set([none]);
  for (const c of CLUSTERS) {
    const f = faceFor(c.key);
    assert.ok(!seen.has(f), `${c.key}: no drawing of its own`);
    seen.add(f);
    assert.ok(f.outline.length && f.detail.length && f.points.length, `${c.key}: empty drawing`);
  }
});

test('a drawing is hidden decoration, and every line can be drawn in', () => {
  const svg = faceSvg('costs');
  assert.match(svg, /^<svg class="jf" viewBox="0 0 120 120" aria-hidden="true"/);
  const lines = svg.match(/<path class="jf-[od]"[^>]*>/g) ?? [];
  assert.ok(lines.length > 2);
  for (const l of lines) assert.match(l, /pathLength="1"/);
});
