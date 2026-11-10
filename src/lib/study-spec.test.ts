// Safe to edit. Site-owned (not PORTABLE).
// The numbers a case study prints about itself: the spec on a decision card and the sizing frame
// in the hero. Both must say only what is true, so this holds them to the files and the palettes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import {
  PHONE_STILL,
  pairSpec,
  pxWords,
  ratioWords,
  rgbToHexString,
  sizeWords,
} from './study-spec.ts';
import { webpSize } from './capture-size.ts';
import { contrastRatio } from './contrast.ts';
import sizes from '../data/capture-sizes.json' with { type: 'json' };

const dir = new URL('../content/case-studies/', import.meta.url);
const studies = readdirSync(dir)
  .filter((f) => f.endsWith('.mdx'))
  .map((f) => {
    const text = readFileSync(new URL(f, dir), 'utf8').replace(/\r\n/g, '\n');
    const palette = /^palette:\n((?: {2}.*\n)+)/m.exec(text)?.[1] ?? '';
    return {
      slug: f.replace(/\.mdx$/, ''),
      accent: /^ {2}accent: '(#[0-9a-fA-F]{6})'/m.exec(palette)?.[1],
    };
  });

test('a computed colour becomes a hex, and anything unreadable is left out', () => {
  assert.equal(rgbToHexString('rgb(18, 18, 17)'), '#121211');
  assert.equal(rgbToHexString('rgb(255 255 255)'), '#ffffff');
  assert.equal(rgbToHexString('rgba(47, 63, 230, 1)'), '#2f3fe6');
  assert.equal(rgbToHexString('rgb(47 63 230 / 100%)'), '#2f3fe6');
  assert.equal(rgbToHexString('rgba(0, 0, 0, 0.5)'), null);
  assert.equal(rgbToHexString('rgba(0, 0, 0, 0)'), null);
  assert.equal(rgbToHexString('color(srgb 0.1 0.2 0.3)'), null);
  assert.equal(rgbToHexString('transparent'), null);
});

test('a pair is measured with the same maths as the palette gate', () => {
  assert.deepEqual(pairSpec('rgb(18, 18, 17)', 'rgb(255, 255, 255)'), {
    fg: '#121211',
    bg: '#ffffff',
    ratio: contrastRatio('#121211', '#ffffff'),
    aa: true,
  });
  assert.equal(pairSpec('rgb(170, 170, 170)', 'rgb(255, 255, 255)')?.aa, false);
  assert.equal(pairSpec('rgba(0, 0, 0, 0.4)', 'rgb(255, 255, 255)'), null);
});

test('a ratio is never rounded up over the line', () => {
  assert.equal(ratioWords(4.49), '4.4:1');
  assert.equal(ratioWords(4.5), '4.5:1');
  assert.equal(ratioWords(9.31), '9.3:1');
  assert.equal(ratioWords(21), '21.0:1');
});

test('lengths and sizes', () => {
  assert.equal(pxWords('28px'), '28px');
  assert.equal(pxWords('27.52px'), '27.5px');
  assert.equal(pxWords('1.5rem'), null);
  assert.equal(pxWords('auto'), null);
  assert.equal(sizeWords([1000, 750]), '1000 × 750');
  assert.equal(sizeWords(PHONE_STILL), '584 × 1138');
  assert.equal(sizeWords(undefined), '');
  assert.equal(sizeWords([0, 0]), '');
});

// The spec on a decision reads the label's colour off the page. In the light theme that is the
// study's accent on the white card, so what it prints must be this pair, and it must pass.
for (const { slug, accent } of studies) {
  test(`${slug}: the decision label's pair is its accent on the card, and clears AA`, () => {
    assert.ok(accent);
    const { r, g, b } = {
      r: parseInt(accent.slice(1, 3), 16),
      g: parseInt(accent.slice(3, 5), 16),
      b: parseInt(accent.slice(5, 7), 16),
    };
    const spec = pairSpec(`rgb(${r}, ${g}, ${b})`, 'rgb(255, 255, 255)');
    assert.ok(spec);
    assert.equal(spec.fg, accent.toLowerCase());
    assert.equal(spec.ratio, contrastRatio(accent, '#ffffff'));
    assert.ok(spec.aa, `${slug}: ${accent} on the card is ${spec.ratio}:1`);
  });
}

// The sizing frame prints the pixel size of the two stills in the hero. The desktop one comes from
// capture-sizes.json (held to the files by work-figures.test.ts); the phone one is held here.
for (const { slug } of studies) {
  test(`${slug}: the phone still is the size the frame prints`, () => {
    const size = webpSize(
      readFileSync(new URL(`../../public/assets/${slug}-m.webp`, import.meta.url)),
    );
    assert.deepEqual(size, { ...PHONE_STILL });
  });
  test(`${slug}: there is a desktop still size on record`, () => {
    const s = (sizes as Record<string, { still: number[] } | undefined>)[slug];
    assert.ok(s && sizeWords(s.still), `${slug} has no still size in capture-sizes.json`);
  });
}
