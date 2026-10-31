// Safe to edit. Site-owned (not PORTABLE): it checks this site's case studies.
// =============================================================================
// Case-study "What changed" gate (overhaul 2.4c)
// =============================================================================
// Each study's body ends on a <ResultsBlock items={[...]} /> ledger. A row is
// a plain sentence (a string) or a figure ({ figure, text, source }). Only a
// figure that names its source is set at display size, so a number can look
// like a headline only once someone can check it (CLAUDE.md never-break
// rule 9). ResultsBlock already falls back to a sentence when `source` is
// missing; this test makes the miss loud instead of silent:
//
//   1. every `figure:` object in a ResultsBlock carries a non-empty `source:`
//   2. a study has one ledger: a body ResultsBlock and a frontmatter
//      `results:` list together would print "What changed" twice, because
//      src/pages/work/[slug].astro still renders `results:` when it is set
//
// It reads the MDX straight off disk, so it needs no Astro runtime.
// =============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../content/case-studies/', import.meta.url));
const studies = readdirSync(dir)
  .filter((f) => f.endsWith('.mdx'))
  .map((f) => ({ file: f, text: readFileSync(dir + f, 'utf8').replace(/\r\n/g, '\n') }));

/** Every <ResultsBlock ... /> in a body, as raw source. */
function ledgers(text: string): string[] {
  return text.match(/<ResultsBlock\b[\s\S]*?\/>/g) ?? [];
}

test('there are case studies to check', () => {
  assert.ok(studies.length > 0);
});

for (const { file, text } of studies) {
  test(`${file}: every figure in "What changed" names its source`, () => {
    for (const block of ledgers(text)) {
      // A figure is a flat object literal, so it never holds braces itself.
      const figures = block.match(/\{[^{}]*\bfigure\s*:[^{}]*\}/g) ?? [];
      for (const fig of figures) {
        const source = fig.match(/\bsource\s*:\s*(['"`])([\s\S]*?)\1/);
        assert.ok(
          source && source[2].trim().length > 0,
          `${file}: this figure has no source, so it cannot sit at display size:\n${fig}`,
        );
      }
    }
  });

  test(`${file}: one "What changed" ledger, not two`, () => {
    const frontmatter = text.split('\n---\n')[0];
    const hasFrontmatterResults = /^results:/m.test(frontmatter);
    assert.ok(
      !(hasFrontmatterResults && ledgers(text).length > 0),
      `${file}: has both a frontmatter results: list and a body ResultsBlock`,
    );
  });
}
