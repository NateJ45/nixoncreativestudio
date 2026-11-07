// Safe to edit. Site-owned contrast and token gate for src/styles/kit.css.
//
// WHY THIS EXISTS
// axe (and so the Lighthouse accessibility category) audits the resting DOM and
// has no rule for a focus indicator or a token nobody has rendered yet, so a score
// can sit at 100 while a pair is unreadable. This measures the tokens themselves
// with src/lib/contrast.ts. A new rendered pair goes here.
//
// It also holds the promises the design makes: one typeface, self-hosted, one
// light theme, and motion that stands down under reduced motion.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrastRatio, AA_BODY_TEXT, AA_NON_TEXT } from './contrast.ts';

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

test('one light theme', () => {
  assert.doesNotMatch(css, /prefers-color-scheme/);
  assert.doesNotMatch(css, /\.dark\b/);
});

test('the entrances stand down under reduced motion', () => {
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test('a card keeps an edge under forced colors', () => {
  assert.match(css, /forced-colors: active/);
});
