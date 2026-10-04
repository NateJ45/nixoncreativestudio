// Theme-token contrast gate. Ported from ncs-astro-sanity-starter (PORTS.md
// Card 9) and adapted to this site's palette, 2026-08-27. Rewritten for the
// 2026 redesign (one art-directed theme, DESIGN.md), 2026-10-04.
//
// NOT marked PORTABLE: the module it leans on (contrast.ts) is the canonical
// shared file; this test is the per-site APPLICATION of it, and its pair list
// encodes this site's tokens.
//
// WHY THIS EXISTS
// axe (via Lighthouse CI) audits the resting DOM of a built page and has no
// rule for a focus indicator or a custom border, and it cannot see text over a
// background image at all. The accessibility category can sit at 100 while a
// token pair is unreadable. This gate measures the pairs themselves.
//
// WHAT IT READS
// Three blocks of src/styles/globals.css, all plain hex:
//   :root                   the palette and the semantic tokens on paper
//   .on-ink                 the inverse scope every deep ground carries
//   .ground-paper-contours  the two tokens the contour ground re-scopes
// The worst-PIXEL check of each textured ground (a contour line under a word,
// the darkest wall in shade, the brightest raking-lit fibre) is a separate
// gate: `node scripts/brand/build-grounds.mjs --check`.
//
// SKIPPED, deliberately
//   - --border and --sidebar-border: rgb() at low alpha, decorative hairlines,
//     not control edges (the control edge is --input, which IS asserted).
//   - --river, --contour-ink, --ground-sun, --tertiary (= --marker-hot) on
//     paper: graphic only, never text there. --marker-hot on paper is 2.22:1;
//     it is a text colour only on ink, where it is asserted.
//   - --chart-* and --sidebar-*: no chart or sidebar on this site.
//
// Any token that becomes a FOCUS RING or a control EDGE must be added below
// with AA_NON_TEXT.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrastRatio, AA_BODY_TEXT, AA_NON_TEXT } from './contrast.ts';

const CSS = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'styles', 'globals.css');
const css = readFileSync(CSS, 'utf8');

/**
 * Pull the hex custom properties out of one top-level block, plus any
 * "= --other" mirror note in the trailing comment.
 *
 * Brace-matched rather than regex-to-the-next-`}` on purpose: these blocks
 * contain nested comment braces, and a lazy match would silently read half a
 * block and then "pass" for want of pairs. A missing selector throws.
 */
function readBlock(selector: string): {
  tokens: Record<string, string>;
  mirrors: Array<[string, string]>;
} {
  const open = css.indexOf(`\n${selector} {`);
  assert.ok(open !== -1, `globals.css has no top-level "${selector} {" block`);
  let depth = 0;
  let end = -1;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  assert.ok(end !== -1, `"${selector} {" block in globals.css is unbalanced`);
  const body = css.slice(open, end);
  const tokens: Record<string, string> = {};
  const mirrors: Array<[string, string]> = [];
  for (const m of body.matchAll(
    /--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;(?:[ \t]*\/\*\s*=\s*--([a-z0-9-]+))?/g,
  )) {
    tokens[m[1]] = m[2];
    if (m[3]) mirrors.push([m[1], m[3]]);
  }
  return { tokens, mirrors };
}

const ROOT = readBlock(':root');
const INK = readBlock('.on-ink');
const CONTOURS = readBlock('.ground-paper-contours');
const P = ROOT.tokens;

/** Read a token, failing loudly rather than silently skipping a pair. */
function tok(block: Record<string, string>, where: string, name: string): string {
  const value = block[name] ?? P[name];
  assert.ok(value, `globals.css ${where} has no hex --${name}`);
  return value;
}

// ---------------------------------------------------------------------------
// The math itself, pinned to the WCAG reference points.
// ---------------------------------------------------------------------------

test('contrast math matches the WCAG reference points', () => {
  assert.equal(contrastRatio('#000000', '#ffffff'), 21);
  assert.equal(contrastRatio('#ffffff', '#ffffff'), 1);
  assert.equal(contrastRatio('#fff', '#000'), 21);
  assert.equal(contrastRatio('#8e2b1b', '#f3eee4'), contrastRatio('#f3eee4', '#8e2b1b'));
});

// ---------------------------------------------------------------------------
// Mirrors. A semantic token whose comment says "= --paper" must still equal
// --paper. That note is how DESIGN.md and the comments stay true: if one side
// is edited without the other, this fails.
// ---------------------------------------------------------------------------

for (const [where, block] of [
  [':root', ROOT],
  ['.on-ink', INK],
  ['.ground-paper-contours', CONTOURS],
] as const) {
  for (const [token, source] of block.mirrors) {
    test(`${where} --${token} still mirrors :root --${source}`, () => {
      assert.equal(
        block.tokens[token].toLowerCase(),
        tok(P, ':root', source).toLowerCase(),
        `--${token} in ${where} says it equals --${source}, but they differ`,
      );
    });
  }
}

test('every :root semantic token that repeats a palette value says so', () => {
  // Guards the mirror list itself: a mirror note silently dropped would turn
  // the loop above into no test at all.
  assert.ok(ROOT.mirrors.length >= 15, `only ${ROOT.mirrors.length} mirror notes in :root`);
  assert.ok(INK.mirrors.length >= 5, `only ${INK.mirrors.length} mirror notes in .on-ink`);
});

// ---------------------------------------------------------------------------
// Pairs. [foreground token, background token, note]. Backgrounds can be
// palette tokens (the grounds) as well as semantic ones.
// ---------------------------------------------------------------------------

type Pair = [fg: string, bg: string, note: string];

const PAPER_GROUNDS = ['background', 'muted', 'card', 'ground-wall', 'ground-survey'];

/** Text that appears on any paper ground. */
const PAPER_TEXT: Pair[] = [];
for (const bg of PAPER_GROUNDS) {
  PAPER_TEXT.push(
    ['foreground', bg, 'body copy'],
    ['heading', bg, 'headings'],
    ['link', bg, 'brick links and accent text'],
    ['marker', bg, 'the italic second voice at body size'],
  );
}
for (const bg of ['background', 'muted', 'card', 'ground-wall']) {
  PAPER_TEXT.push(['muted-foreground', bg, 'meta copy']);
}
PAPER_TEXT.push(
  ['primary-foreground', 'primary', 'paper on the ink button'],
  ['accent-foreground', 'accent', 'paper on the marker button (hover)'],
  ['secondary-foreground', 'secondary', 'ink on the quiet secondary button'],
  ['destructive', 'background', 'form error text'],
  ['destructive', 'card', 'form error text in a card'],
  ['error-foreground', 'error', 'status error surface'],
  ['info-foreground', 'info', 'status info surface'],
  ['success-foreground', 'success', 'status success surface'],
  ['warning-foreground', 'warning', 'status warning surface'],
  ['popover-foreground', 'popover', 'menus and popovers'],
);

const PAPER_NON_TEXT: Pair[] = [];
for (const bg of PAPER_GROUNDS) PAPER_NON_TEXT.push(['ring', bg, 'focus ring']);
PAPER_NON_TEXT.push(
  ['outline', 'background', 'outline token, tracks --ring'],
  ['input', 'background', 'form field edge'],
  ['input', 'card', 'form field edge in a card'],
  ['input', 'muted', 'form field edge on sunk paper'],
  ['primary', 'background', 'ink button edge on paper'],
  ['primary', 'ground-wall', 'ink button edge on the wall'],
);

/** Inside .on-ink (every deep ground). Backgrounds: ink and ink-raised. */
const INK_TEXT: Pair[] = [];
for (const bg of ['background', 'card', 'muted']) {
  INK_TEXT.push(
    ['foreground', bg, 'paper text on ink'],
    ['heading', bg, 'headings on ink'],
    ['muted-foreground', bg, 'meta copy on ink'],
    ['link', bg, 'vermilion links on ink'],
    ['marker', bg, 'the voice on ink'],
  );
}
INK_TEXT.push(
  ['primary-foreground', 'primary', 'ink label on the paper button'],
  ['accent-foreground', 'accent', 'ink label on the vermilion hover'],
  ['secondary-foreground', 'secondary', 'paper on the raised ink button'],
);
const INK_NON_TEXT: Pair[] = [
  ['ring', 'background', 'focus ring on ink'],
  ['ring', 'card', 'focus ring on raised ink'],
  ['input', 'background', 'form field edge on ink'],
  ['primary', 'background', 'paper button edge on ink'],
];

/** The contour ground's re-scoped tokens, on survey paper. */
const CONTOUR_TEXT: Pair[] = [
  ['muted-foreground', 'ground-survey', 'meta copy on the contour ground'],
  ['marker', 'ground-survey', 'the voice on the contour ground (brick)'],
];

function run(
  where: string,
  block: Record<string, string>,
  pairs: Pair[],
  min: number,
  kind: string,
): void {
  for (const [fg, bg, note] of pairs) {
    test(`${where}: --${fg} on --${bg} meets AA ${kind} (${note})`, () => {
      const f = tok(block, where, fg);
      const b = tok(block, where, bg);
      const ratio = contrastRatio(f, b);
      assert.ok(
        ratio >= min,
        `${where} --${fg} (${f}) on --${bg} (${b}) is ${ratio}:1, needs ${min}:1 - ${note}`,
      );
    });
  }
}

run(':root', P, PAPER_TEXT, AA_BODY_TEXT, 'body text');
run(':root', P, PAPER_NON_TEXT, AA_NON_TEXT, 'non-text');
run('.on-ink', INK.tokens, INK_TEXT, AA_BODY_TEXT, 'body text');
run('.on-ink', INK.tokens, INK_NON_TEXT, AA_NON_TEXT, 'non-text');
run('.ground-paper-contours', CONTOURS.tokens, CONTOUR_TEXT, AA_BODY_TEXT, 'body text');
