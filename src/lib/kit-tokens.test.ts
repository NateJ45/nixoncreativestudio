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
  ['ink on the cobalt (the marker on a post, journal.css)', night('ink'), night('fill')],
  ['text on the bone card', night('on-ink'), night('ink')],
  ['soft text on the bone card', night('on-ink-soft'), night('ink')],
  ['white on the deep cobalt (the closing, the blue price cards)', '#ffffff', night('fill-deep')],
  ['the soft blue on the deep cobalt', token('accent-soft'), night('fill-deep')],
  ['text on the dimmed bone (the Yours card)', night('on-ink'), night('bone')],
  ['soft text on the dimmed bone', night('on-ink-soft'), night('bone')],
  ['text on a raised card (the cards that were bone)', night('ink'), night('raise')],
  ['soft text on a raised card', night('soft'), night('raise')],
  ['the lifted blue on a raised card', night('accent'), night('raise')],
  ['white on the night blue (the closing)', '#ffffff', night('end-night')],
  ['the soft blue on the night blue', token('accent-soft'), night('end-night')],
];

for (const [what, fg, bg] of NIGHT_PAIRS) {
  test(`AA text, dark side: ${what}`, () => {
    const ratio = contrastRatio(fg, bg);
    assert.ok(ratio >= AA_BODY_TEXT, `${what}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1`);
  });
}

// The Lab cards on /work keep the cobalt back on either side, so their pairs hold in both themes.
const BACK_TEXT: [string, string, string][] = [
  ['lab card text', token('back-ink'), token('back')],
  ['lab card text on its screen', token('back-ink'), token('back-raise')],
  ['lab card soft text', token('back-soft'), token('back')],
  ['lab card soft text on its screen', token('back-soft'), token('back-raise')],
  ['lab card blue (links)', token('back-accent'), token('back')],
  ['lab card blue on its screen', token('back-accent'), token('back-raise')],
  ['lab card button (cobalt on bone)', token('back'), token('back-ink')],
];

for (const [what, fg, bg] of BACK_TEXT) {
  test(`AA text, lab card: ${what}`, () => {
    const ratio = contrastRatio(fg, bg);
    assert.ok(ratio >= AA_BODY_TEXT, `${what}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1`);
  });
}

test('the lab status marks and focus ring clear 3:1 on the card and its screen', () => {
  for (const mark of ['back-up', 'back-warn', 'back-ink', 'back-soft']) {
    for (const bg of [token('back'), token('back-raise')]) {
      const ratio = contrastRatio(token(mark), bg);
      assert.ok(ratio >= AA_NON_TEXT, `--${mark} on ${bg} is ${ratio.toFixed(2)}:1`);
    }
  }
});

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

// Review stars (Stars.astro, added 2026-11-15). The gold itself is too light to stand on white, so
// the light side draws each star with an amber edge, and that edge carries the 3:1. On the dark
// side the gold stands on its own.
test('review stars: the amber edge clears 3:1 on a light card and the page', () => {
  for (const bg of [token('card'), token('ground')]) {
    const ratio = contrastRatio(token('star-edge'), bg);
    assert.ok(ratio >= AA_NON_TEXT, `star edge on ${bg} is ${ratio.toFixed(2)}:1`);
  }
});
test('review stars: the gold clears 3:1 on a dark card and the page', () => {
  for (const bg of [night('card'), night('ground')]) {
    const ratio = contrastRatio(night('star'), bg);
    assert.ok(ratio >= AA_NON_TEXT, `star on ${bg} is ${ratio.toFixed(2)}:1`);
  }
});
test('review stars: the gold clears 3:1 on the blue footer in both themes', () => {
  for (const bg of [token('fill'), night('fill')]) {
    const ratio = contrastRatio(token('star'), bg);
    assert.ok(ratio >= AA_NON_TEXT, `star on ${bg} is ${ratio.toFixed(2)}:1`);
  }
});

// The drawer's fixed paper (src/styles/ephemera/): the journal's press pass, sticky note and
// print look the same in both themes, so their own ink and paper are read from their stylesheets.
function fixed(file: string, name: string): string {
  const src = readFileSync(resolve(root, 'src/styles/ephemera', file), 'utf8');
  const value = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`).exec(src)?.[1];
  assert.ok(value, `${file} has no hex --${name}`);
  return value;
}
const FIXED_PAPER: [string, string, string][] = [
  ['press pass ink', fixed('press-pass.css', 'ink'), fixed('press-pass.css', 'paper')],
  ['press pass labels', fixed('press-pass.css', 'faint'), fixed('press-pass.css', 'paper')],
  [
    'press pass blue (the stamp)',
    fixed('press-pass.css', 'accent'),
    fixed('press-pass.css', 'paper'),
  ],
  ['white on the press pass band', '#ffffff', fixed('press-pass.css', 'accent')],
  [
    'sticky note ink and links',
    fixed('margin-note.css', 'note-ink'),
    fixed('margin-note.css', 'note'),
  ],
  ['ink on the print', fixed('paper-print.css', 'ink'), fixed('paper-print.css', 'print')],
  ['soft text on the print', fixed('paper-print.css', 'soft'), fixed('paper-print.css', 'print')],
];
for (const [what, fg, bg] of FIXED_PAPER) {
  test(`the drawer's fixed paper: ${what} clears AA`, () => {
    const ratio = contrastRatio(fg, bg);
    assert.ok(ratio >= AA_BODY_TEXT, `${what}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1`);
  });
}
