// The home hero's contour grounds (src/lib/heroGround.ts, DESIGN.md "Hero ground"): every
// word in the hero can sit on a contour line, so each text colour is checked against the
// worst pixel the layers can make: the ground, the bed, and each line colour at its
// opacity flattened over the ground and over the bed (lines cross the river bed too).
//
// What sits on each ground (HomeHero.astro, HeroReel.astro captions, HomeClose.astro):
//   ink    body text, the price link and the reel's caption words in paper; the italic
//          turn in vermilion (display size only: AA large, 3:1)
//   paper  body text in ink-body, headings and links in ink; the italic turn in brick
//          (display size only: 3:1)
// The mask files must exist and carry the layers ContourLayers.astro reads.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AA_BODY_TEXT,
  AA_LARGE_TEXT,
  contrastRatio,
  flatten,
  hexToRgb,
  rgbToHex,
} from './contrast.ts';
import { HERO_GROUNDS, MINOR_LINE, heroGroundStyle } from './heroGround.ts';

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'home');

const TEXT: Record<keyof typeof HERO_GROUNDS, Array<[string, number, string]>> = {
  ink: [
    ['#f3eee4', AA_BODY_TEXT, 'paper body text'],
    ['#f2835f', AA_LARGE_TEXT, 'the vermilion italic turn (display size)'],
  ],
  paper: [
    ['#1d2532', AA_BODY_TEXT, 'ink-body text'],
    ['#0a1628', AA_BODY_TEXT, 'ink headings and links'],
    ['#8e2b1b', AA_LARGE_TEXT, 'the brick italic turn (display size)'],
  ],
};

for (const [name, t] of Object.entries(HERO_GROUNDS)) {
  test(`hero ground "${name}": every text colour clears AA over every line`, () => {
    const mix = (hex: string, a: number, base: string) =>
      rgbToHex(flatten(hexToRgb(hex), a, hexToRgb(base)));
    const bases = [t.ground, t.bed];
    const pixels = [...bases];
    for (const b of bases)
      pixels.push(
        mix(t.line, t.lineOpacity, b),
        mix(t.line, t.lineOpacity * MINOR_LINE, b),
        mix(t.edge, t.edgeOpacity, b),
      );
    for (const [text, min, role] of TEXT[name as keyof typeof HERO_GROUNDS]) {
      const worst = Math.min(...pixels.map((p) => contrastRatio(text, p)));
      assert.ok(worst >= min, `${role} (${text}) is ${worst.toFixed(2)}:1 on the worst pixel`);
    }
  });
}

test('the mask files exist, and the style string carries every layer token', () => {
  for (const f of ['lines', 'bed', 'edge', 'edge-phone'])
    assert.ok(existsSync(resolve(dir, `contours-${f}.svg`)), f);
  assert.match(readFileSync(resolve(dir, 'contours-edge.svg'), 'utf8'), /Ohio River/);
  assert.doesNotMatch(readFileSync(resolve(dir, 'contours-edge-phone.svg'), 'utf8'), /<text/);
  const style = heroGroundStyle(HERO_GROUNDS.ink);
  for (const v of ['--hg-line', '--hg-line-o', '--hg-bed', '--hg-edge', '--hg-edge-o'])
    assert.ok(style.includes(`${v}:`), v);
});
