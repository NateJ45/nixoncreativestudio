// Safe to edit. Site-owned (not PORTABLE): it checks this site's case studies.
// =============================================================================
// Case-study palette contrast gate
// =============================================================================
// Every case study carries the client's own colours in a `palette` frontmatter
// object (shape documented in src/content.config.ts). The redesigned study page
// uses them for the title card band, its accent rule, swatches and marks, so
// each pair has to clear WCAG AA in both of this site's themes:
//
//   Light mode (the title card is a band in palette.paper)
//     ink on paper          >= 4.5:1  (text)
//     accentInk on accent   >= 4.5:1  (text set on the accent)
//     accent on paper       >= 3:1    (marks: the 4px rule, swatch edges)
//
//   Dark mode (ruling 8: the title card sits on this site's ink, keeping only
//   the client's accent and swatches, and no client dark palette is invented)
//     the dark mark on INK  >= 3:1    where the dark mark is palette.markDark,
//                                     else palette.dark.accent, else accent
//   and, only where the client really ships a dark theme (palette.dark):
//     dark.ink on dark.paper        >= 4.5:1
//     dark.accent on dark.paper     >= 3:1
//     dark.accentInk on dark.accent >= 4.5:1 (when the client sets one)
//
// When a client's real accent fails on ink, the fix is NEVER to change the
// client's colour: set `markDark` to another colour from the client's own
// shipped palette (it must be one of its swatches, checked below).
//
// It reads the MDX frontmatter straight off disk, so it needs no Astro runtime.
// The parser below handles only the plain YAML these files use (scalars, one
// nested level of maps, and lists of scalars); a palette written in a fancier
// YAML form fails the "has a palette" test loudly rather than passing quietly.
// =============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { contrastRatio } from './contrast.ts';

/** This site's dark ink surface (`--color-primary` navy, the dark-mode card and
    band colour in globals.css). The dark title card sits on it. */
const INK = '#0a1628';

const dir = new URL('../content/case-studies/', import.meta.url);

type Yaml = string | Yaml[] | { [key: string]: Yaml };

/** Strip a trailing comment and matching quotes from a YAML scalar. */
function scalar(raw: string): string {
  const v = raw.replace(/\s+#.*$/, '').trim();
  const q = v.match(/^(['"])(.*)\1$/);
  return q ? q[2] : v;
}

/** Parse the indented block that starts at `lines[start]` with `indent`. */
function block(lines: string[], start: number, indent: number): [Yaml, number] {
  const first = lines[start];
  if (first !== undefined && first.slice(indent).startsWith('- ')) {
    const list: Yaml[] = [];
    let i = start;
    while (i < lines.length && lines[i].startsWith(' '.repeat(indent) + '- ')) {
      list.push(scalar(lines[i].slice(indent + 2)));
      i++;
    }
    return [list, i];
  }
  const map: { [key: string]: Yaml } = {};
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    const lead = line.length - line.trimStart().length;
    if (lead < indent) break;
    const m = line.slice(indent).match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (lead > indent || !m) {
      i++;
      continue;
    }
    if (m[2] === '' || m[2].startsWith('#')) {
      const next = lines[i + 1] ?? '';
      const nextLead = next.length - next.trimStart().length;
      const childIndent = next.trimStart().startsWith('- ') ? Math.max(nextLead, indent) : nextLead;
      if (childIndent > indent || next.slice(indent).startsWith('- ')) {
        const [value, end] = block(lines, i + 1, childIndent);
        map[m[1]] = value;
        i = end;
        continue;
      }
      map[m[1]] = '';
    } else {
      map[m[1]] = scalar(m[2]);
    }
    i++;
  }
  return [map, i];
}

/** The frontmatter of one MDX file as a plain object. */
function frontmatter(source: string): Record<string, Yaml> {
  const m = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) throw new Error('No frontmatter block');
  const lines = m[1]
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '' && !l.trimStart().startsWith('#'));
  return block(lines, 0, 0)[0] as Record<string, Yaml>;
}

interface Palette {
  paper: string;
  ink: string;
  accent: string;
  accentInk: string;
  markDark?: string;
  dark?: { paper: string; ink: string; accent: string; accentInk?: string };
  typeface: string;
  swatches: string[];
}

const studies = readdirSync(dir)
  .filter((f) => f.endsWith('.mdx'))
  .map((file) => {
    const data = frontmatter(readFileSync(new URL(file, dir), 'utf8'));
    return {
      slug: file.replace(/\.mdx$/, ''),
      order: Number(data.order),
      palette: data.palette as unknown as Palette | undefined,
    };
  });

/** Assert a contrast ratio, naming the study and the pair when it fails. */
function atLeast(slug: string, label: string, fg: string, bg: string, min: number) {
  const ratio = contrastRatio(fg, bg);
  assert.ok(
    ratio >= min,
    `${slug}: ${label} ${fg} on ${bg} is ${ratio.toFixed(2)}:1, needs ${min}:1`,
  );
}

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

for (const { slug, palette } of studies) {
  test(`${slug}: has a palette`, () => {
    assert.ok(palette, `${slug}.mdx has no palette`);
    for (const key of ['paper', 'ink', 'accent', 'accentInk', 'typeface'] as const) {
      assert.ok(palette[key], `${slug}: palette.${key} is missing`);
    }
    assert.ok(Array.isArray(palette.swatches) && palette.swatches.length >= 2);
  });
  if (!palette) continue;

  test(`${slug}: light mode pairs`, () => {
    atLeast(slug, 'ink on paper', palette.ink, palette.paper, 4.5);
    atLeast(slug, 'accentInk on accent', palette.accentInk, palette.accent, 4.5);
    atLeast(slug, 'accent mark on paper', palette.accent, palette.paper, 3);
  });

  test(`${slug}: dark mode mark on this site's ink`, () => {
    const mark = palette.markDark ?? palette.dark?.accent ?? palette.accent;
    atLeast(slug, 'dark mark on ink', mark, INK, 3);
    if (palette.markDark) {
      const own = palette.swatches.map((s) => s.toLowerCase());
      assert.ok(
        own.includes(palette.markDark.toLowerCase()),
        `${slug}: markDark ${palette.markDark} must be one of the client's own swatches`,
      );
    }
  });

  if (palette.dark) {
    const dark = palette.dark;
    test(`${slug}: the client's own dark theme pairs`, () => {
      atLeast(slug, 'dark ink on dark paper', dark.ink, dark.paper, 4.5);
      atLeast(slug, 'dark accent mark on dark paper', dark.accent, dark.paper, 3);
      if (dark.accentInk) {
        atLeast(slug, 'dark accentInk on dark accent', dark.accentInk, dark.accent, 4.5);
      }
    });
  }
}

// -----------------------------------------------------------------------------
// The /work row tint (overhaul package 2.3)
// -----------------------------------------------------------------------------
// In light mode, hovering or focusing a /work row paints it in the client's
// palette.paper while the row's text keeps THIS site's colours: the heading
// (client name and "Case study"), the body (the hook), the muted meta (sector
// and year) and the link (the live host). Each must clear 4.5:1 on every
// client's paper. In dark mode the row sits on --ink, whose pairs
// ncs-tokens.test.ts already covers, with the dark mark checked above.

/** The light theme's hex tokens, read from the top-level `:root {` block. */
function lightTokens(): Record<string, string> {
  const css = readFileSync(new URL('../styles/globals.css', import.meta.url), 'utf8');
  const open = css.indexOf('\n:root {');
  assert.ok(open !== -1, 'globals.css has no top-level ":root {" block');
  let depth = 0;
  let end = open;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) {
      end = i;
      break;
    }
  }
  const tokens: Record<string, string> = {};
  for (const m of css.slice(open, end).matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    tokens[m[1]] = m[2];
  }
  return tokens;
}

const LIGHT = lightTokens();
const ROW_TEXT = ['heading', 'foreground', 'muted-foreground', 'link'] as const;

for (const { slug, palette } of studies) {
  if (!palette) continue;
  test(`${slug}: /work row text on the client's paper (light mode)`, () => {
    for (const role of ROW_TEXT) {
      assert.ok(LIGHT[role], `globals.css :root has no hex --${role}`);
      atLeast(slug, `--${role} on palette.paper`, LIGHT[role], palette.paper, 4.5);
    }
  });
}
