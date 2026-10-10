// Theme-token contrast gate. Ported from ncs-astro-sanity-starter (PORTS.md
// Card 9) and adapted to this site's palette, 2026-08-27.
//
// NOT marked PORTABLE: the module it leans on (contrast.ts) is the canonical
// shared file; this test is the per-site APPLICATION of it, and its pair list
// encodes this site's tokens. The starter's own copy asserts a different
// palette entirely.
//
// WHY THIS EXISTS
// The bug class it guards is invisible to every other gate in this repo. axe
// (via Lighthouse CI) audits the resting DOM of a built page and has no rule
// for a focus-indicator or a custom border, and the accessibility category can
// sit at 100 while a token pair is unreadable. The lighthouse.yml gate holds
// accessibility at 100 today, which is exactly the situation in which a bad
// palette edit slips through: nothing fails.
//
// It is cheap here because this site's tokens are plain hex.
//
// SCOPE, and how it differs from the starter's copy
// The starter checks its light @theme block only, because its dark overrides
// are authored in oklch with alpha. This site authors BOTH the :root (light)
// and .dark blocks as plain hex, so both modes are checked. Three token
// families are still skipped, and the reason is the same in each case - they
// are not hex, so there is nothing to measure without a colour-space
// conversion this file deliberately does not attempt:
//   - --border / --input (rgba white-or-black at low alpha over an unfixed
//     backdrop; contrast.ts exports flatten() for whoever takes that on)
//   - --destructive and --chart-* (oklch)
//
// DELIBERATE NON-ASSERTIONS (each one is a decision, not an oversight)
//   - --secondary / --secondary-foreground as a SURFACE pair. In light mode
//     that is white on sky blue #40AAED = 2.56:1, which would fail. It is not
//     asserted because it is not rendered: `variant="secondary"` on the shadcn
//     Button and Badge is unused across the whole site (verified 2026-08-27).
//     See the gotcha in CLAUDE.md - the day someone reaches for that variant,
//     the pair becomes real and this list has to grow a row with it.
//     --secondary IS asserted in dark mode, where it is the rendered Footer /
//     MobileNav link colour on the navy field.
//   - --color-secondary and --color-tertiary against the light paper surfaces.
//     Sky blue and amber are decorative there (glows, small flourishes,
//     dividers), never body text. --tertiary IS asserted on the dark surfaces,
//     where it is the live Hero accent and the MobileNav active-item colour.
//   - --link on --primary (navy). 3.45:1, and the comment in globals.css
//     claiming AA on #0A1628 is wrong - but the pair is not rendered either:
//     in light mode the Footer is a light .band-themed surface, and the navy
//     footer is a dark-mode-only state where the link colour switches to
//     --secondary. Logged in docs/PENDING.md for a human decision on the
//     comment rather than silently edited, because globals.css is a
//     "foundation, edit with care" file.
//   - --sidebar-*. There is no sidebar in this site; the block is kept only so
//     a future one starts coherent.
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
 * Pull the hex custom properties out of one top-level block.
 *
 * Brace-matched rather than regex-to-the-next-`}` on purpose: these blocks run
 * to well over a hundred lines and contain nested comment braces, and a lazy
 * match would silently read half a block and then "pass" for want of pairs.
 * A missing selector throws; a token missing from a block that IS found is
 * caught by token() below. Neither can degrade into a quiet skip.
 */
function readBlock(selector: string): Record<string, string> {
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
  for (const m of body.matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    tokens[m[1]] = m[2];
  }
  return tokens;
}

const LIGHT = readBlock(':root');
const DARK = readBlock('.dark');
const THEME = readBlock('@theme');

/** Read a token, failing loudly rather than silently skipping a pair. */
function token(block: Record<string, string>, mode: string, name: string): string {
  const value = block[name];
  assert.ok(value, `globals.css ${mode} block is missing a hex --${name}`);
  return value;
}

// ---------------------------------------------------------------------------
// The math itself, pinned to the WCAG reference points.
// ---------------------------------------------------------------------------

test('contrast math matches the WCAG reference points', () => {
  assert.equal(contrastRatio('#000000', '#ffffff'), 21);
  assert.equal(contrastRatio('#ffffff', '#ffffff'), 1);
  assert.equal(contrastRatio('#fff', '#000'), 21);
  // Order must not matter: luminance is symmetric inside the ratio.
  assert.equal(contrastRatio('#2A6FB0', '#FFFFFF'), contrastRatio('#FFFFFF', '#2A6FB0'));
});

// ---------------------------------------------------------------------------
// The @theme literals are documented as the source-of-truth reference for the
// semantic tokens. If they drift apart, the comments in globals.css and
// CLAUDE.md start lying, which is how a palette edit gets made against the
// wrong number.
// ---------------------------------------------------------------------------

const THEME_MIRRORS: Array<[string, string]> = [
  ['color-primary', 'primary'],
  ['color-accent', 'accent'],
  ['color-secondary', 'secondary'],
  // --color-tertiary is deliberately absent: it has no :root twin (amber never
  // switches), so a row for it would compare the token with itself and pass
  // unconditionally. A tautological assertion is worse than none - it reads
  // like coverage.
  ['color-heading', 'heading'],
  ['color-text', 'foreground'],
  ['color-text-muted', 'muted-foreground'],
  ['color-bg', 'background'],
  ['color-bg-soft', 'muted'],
];

for (const [themeToken, rootToken] of THEME_MIRRORS) {
  test(`@theme --${themeToken} still mirrors :root --${rootToken}`, () => {
    const expected = token(LIGHT, ':root', rootToken);
    assert.equal(
      token(THEME, '@theme', themeToken).toUpperCase(),
      expected.toUpperCase(),
      `--${themeToken} (@theme) and --${rootToken} (:root) disagree. One of them ` +
        'was edited without the other, so the light-mode literal that globals.css ' +
        'and CLAUDE.md both cite as the reference is now wrong.',
    );
  });
}

// ---------------------------------------------------------------------------
// Rendered text pairs, per mode.
// ---------------------------------------------------------------------------

type Pair = [fg: string, bg: string, note: string];

const LIGHT_TEXT: Pair[] = [
  ['foreground', 'background', 'body copy on paper'],
  ['foreground', 'muted', 'body copy on the alternating soft surface'],
  ['foreground', 'card', 'body copy inside a card'],
  ['heading', 'background', 'headings on paper'],
  ['heading', 'muted', 'headings on the soft surface'],
  ['heading', 'card', 'headings inside a card'],
  ['muted-foreground', 'background', 'meta copy on paper'],
  ['muted-foreground', 'muted', 'meta copy on the soft surface'],
  ['muted-foreground', 'card', 'meta copy inside a card'],
  ['link', 'background', 'accent-toned body links on paper'],
  ['link', 'muted', 'accent-toned body links on the soft surface'],
  ['link', 'card', 'accent-toned body links inside a card'],
  ['primary-foreground', 'primary', 'white reversed out of brand navy'],
  ['accent-foreground', 'accent', 'white on the NCS-blue button'],
];

const DARK_TEXT: Pair[] = [
  ['foreground', 'background', 'body copy on the deep navy field'],
  ['foreground', 'card', 'body copy inside a dark card'],
  ['foreground', 'muted', 'body copy on the elevated dark surface'],
  ['heading', 'background', 'headings on the deep navy field'],
  ['heading', 'card', 'headings inside a dark card'],
  ['muted-foreground', 'background', 'meta copy on the deep navy field'],
  ['muted-foreground', 'card', 'meta copy inside a dark card'],
  ['muted-foreground', 'muted', 'meta copy on the elevated dark surface'],
  ['link', 'background', 'accent-toned body links on dark'],
  ['link', 'card', 'accent-toned body links inside a dark card'],
  ['secondary', 'background', 'Footer / MobileNav links on dark'],
  ['secondary', 'card', 'Footer / MobileNav links inside a dark card'],
  ['secondary', 'muted', 'Footer / MobileNav links on the elevated surface'],
  ['tertiary', 'background', 'Hero statement accent and the active nav item'],
  ['tertiary', 'card', 'the same accent inside a dark card'],
  ['primary-foreground', 'primary', 'white reversed out of brand navy'],
  ['accent-foreground', 'accent', 'navy on the brightened dark-mode accent'],
];

// --tertiary lives only in @theme (it never switches), so dark-mode lookups
// fall back to that literal. Same for anything else a mode does not override.
const tokenOf = (block: Record<string, string>, name: string): string | undefined =>
  block[name] ?? THEME[`color-${name}`];

function runTextPairs(mode: string, block: Record<string, string>, pairs: Pair[]): void {
  for (const [fg, bg, note] of pairs) {
    test(`${mode}: --${fg} on --${bg} meets AA body text (${note})`, () => {
      const f = tokenOf(block, fg);
      const b = tokenOf(block, bg);
      assert.ok(f, `${mode} has no hex --${fg}`);
      assert.ok(b, `${mode} has no hex --${bg}`);
      const ratio = contrastRatio(f, b);
      assert.ok(
        ratio >= AA_BODY_TEXT,
        `${mode} --${fg} (${f}) on --${bg} (${b}) is ${ratio}:1, needs ${AA_BODY_TEXT}:1 - ${note}`,
      );
    });
  }
}

runTextPairs('light', LIGHT, LIGHT_TEXT);
runTextPairs('dark', DARK, DARK_TEXT);

// ---------------------------------------------------------------------------
// Non-text pairs: SC 1.4.11, 3:1. The focus ring is the one that matters most,
// because an invisible focus ring is a keyboard-only failure that nothing else
// in this repo's gate chain can see.
// ---------------------------------------------------------------------------

const LIGHT_NON_TEXT: Pair[] = [
  ['ring', 'background', 'focus ring on paper'],
  ['ring', 'muted', 'focus ring on the soft surface'],
  ['ring', 'card', 'focus ring inside a card'],
  ['outline', 'background', 'Starwind outline token, tracks --ring'],
  ['accent', 'background', 'button edge on paper'],
  ['accent', 'muted', 'button edge on the soft surface'],
];

const DARK_NON_TEXT: Pair[] = [
  ['ring', 'background', 'focus ring on the deep navy field'],
  ['ring', 'card', 'focus ring inside a dark card'],
  ['outline', 'background', 'Starwind outline token, tracks --ring'],
  ['accent', 'background', 'button edge on dark'],
];

function runNonTextPairs(mode: string, block: Record<string, string>, pairs: Pair[]): void {
  for (const [fg, bg, note] of pairs) {
    test(`${mode}: --${fg} on --${bg} meets AA non-text (${note})`, () => {
      const f = tokenOf(block, fg);
      const b = tokenOf(block, bg);
      assert.ok(f, `${mode} has no hex --${fg}`);
      assert.ok(b, `${mode} has no hex --${bg}`);
      const ratio = contrastRatio(f, b);
      assert.ok(
        ratio >= AA_NON_TEXT,
        `${mode} --${fg} (${f}) on --${bg} (${b}) is ${ratio}:1, needs ${AA_NON_TEXT}:1 - ${note}`,
      );
    });
  }
}

runNonTextPairs('light', LIGHT, LIGHT_NON_TEXT);
runNonTextPairs('dark', DARK, DARK_NON_TEXT);
