// Safe to edit. Site-owned contrast and token gate for src/styles/kit.css.
//
// WHY THIS EXISTS
// axe (and so the Lighthouse accessibility category) audits the resting DOM and
// has no rule for a focus indicator or a token nobody has rendered yet, so a score
// can sit at 100 while a pair is unreadable. This measures the tokens themselves
// with src/lib/contrast.ts. A new rendered pair goes here.
//
// It also holds the promises the design makes: one typeface, self-hosted, a dark
// side as complete as the light one, and motion that stands down under reduced motion.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrastRatio, AA_BODY_TEXT, AA_NON_TEXT } from './contrast.ts';
import { NIGHT_SURFACES } from './night-mark.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const css = readFileSync(resolve(root, 'src/styles/kit.css'), 'utf8');

function token(name: string): string {
  const block = /:root\s*\{([\s\S]*?)\}/.exec(css)?.[1] ?? '';
  const value = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`).exec(block)?.[1];
  assert.ok(value, `kit.css :root has no hex --${name}`);
  return value;
}

const TEXT_PAIRS: [string, string, string][] = [
  ['body text on the page', token('ink'), token('ground')],
  ['body text on a card', token('ink'), token('card')],
  ['soft text on the page', token('soft'), token('ground')],
  ['soft text on a card', token('soft'), token('card')],
  ['blue on the page (headline emphasis, links)', token('accent'), token('ground')],
  ['blue on a card', token('accent'), token('card')],
  ['white on the blue (buttons, the closing)', '#ffffff', token('accent')],
  ['ink on the soft blue', token('ink'), token('accent-soft')],
];

for (const [what, fg, bg] of TEXT_PAIRS) {
  test(`AA text: ${what}`, () => {
    const ratio = contrastRatio(fg, bg);
    assert.ok(ratio >= AA_BODY_TEXT, `${what}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1`);
  });
}

// The dark side, measured the same way. Its --accent is lifted so it can be read as text, and the
// surface keeps the cobalt as --fill.
function night(name: string): string {
  const block = /:root\[data-theme='dark'\]\s*\{([\s\S]*?)\n {2}\}/.exec(css)?.[1] ?? '';
  const value = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`).exec(block)?.[1];
  assert.ok(value, `kit.css dark block has no hex --${name}`);
  return value;
}

const NIGHT_PAIRS: [string, string, string][] = [
  ['body text on the page', night('ink'), night('ground')],
  ['body text on a card', night('ink'), night('card')],
  ['body text on a raised chip', night('chip-ink'), night('chip')],
  ['body text on a well', night('ink'), night('well')],
  ['body text on a zebra row', night('ink'), night('zebra')],
  ['soft text on the page', night('soft'), night('ground')],
  ['soft text on a card', night('soft'), night('card')],
  ['soft text on a zebra row', night('soft'), night('zebra')],
  ['placeholder text on the page', night('soft-2'), night('ground')],
  ['placeholder text on a card', night('soft-2'), night('card')],
  ['the lifted blue on the page', night('accent'), night('ground')],
  ['the lifted blue on a card', night('accent'), night('card')],
  ['white on the cobalt (buttons, the closing)', '#ffffff', night('fill')],
  ['the soft blue on the cobalt', token('accent-soft'), night('fill')],
  ['text on the bone card', night('on-ink'), night('ink')],
  ['soft text on the bone card', night('on-ink-soft'), night('ink')],
];

for (const [what, fg, bg] of NIGHT_PAIRS) {
  test(`AA text, dark side: ${what}`, () => {
    const ratio = contrastRatio(fg, bg);
    assert.ok(ratio >= AA_BODY_TEXT, `${what}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1`);
  });
}

test('the dark side focus outline (currentColor on the page) clears 3:1', () => {
  assert.ok(contrastRatio(night('ink'), night('ground')) >= AA_NON_TEXT);
});

test('night-mark.ts measures against the real dark surfaces', () => {
  assert.deepEqual(NIGHT_SURFACES, [night('ground'), night('card')]);
});

test('the boot script and the flip write the real dark ground to theme-color', () => {
  for (const file of ['src/components/ThemeBoot.astro', 'src/scripts/theme.js']) {
    assert.ok(readFileSync(resolve(root, file), 'utf8').includes(night('ground')), file);
  }
});

test('print always takes the light tokens', () => {
  const at = css.indexOf(":root[data-theme='dark'] {");
  assert.ok(at > 0);
  assert.ok(css.lastIndexOf('@media screen {', at) > 0);
  assert.ok(!css.slice(css.lastIndexOf('@media screen {', at), at).includes('}'));
});

// A text field's edge (start.css `.f`) sits between the card outside it and the field's own fill.
for (const [side, pick] of [
  ['light', token],
  ['dark', night],
] as const) {
  test(`the text field edge clears 3:1 on the card and on its fill, ${side}`, () => {
    for (const bg of [pick('card'), pick('ground')]) {
      const ratio = contrastRatio(pick('field-edge'), bg);
      assert.ok(ratio >= AA_NON_TEXT, `${side}: field edge on ${bg} is ${ratio.toFixed(2)}:1`);
    }
  });
}

test('the focus outline (currentColor on the page) clears 3:1', () => {
  assert.ok(contrastRatio(token('ink'), token('ground')) >= AA_NON_TEXT);
});

test('one typeface, self-hosted', () => {
  assert.match(css, /font-family: 'Hanken Grotesk'/);
  assert.match(css, /url\(\/assets\/fonts\/hanken\.woff2\)/);
  assert.ok(existsSync(resolve(root, 'public/assets/fonts/hanken.woff2')));
  assert.doesNotMatch(css, /Bebas|Bricolage|Source Sans/);
  assert.doesNotMatch(css, /fonts\.googleapis/);
});

test('the entrances stand down under reduced motion', () => {
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test('a card keeps an edge under forced colors', () => {
  assert.match(css, /forced-colors: active/);
});
