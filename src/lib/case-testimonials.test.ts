// Safe to edit. Site-owned (not PORTABLE): it checks this site's case studies.
// =============================================================================
// Case-study testimonials gate (testimonials package)
// =============================================================================
// A study's `testimonials` frontmatter holds real client quotes, copied
// verbatim from the clients' own emails (the vault note
// projects/ncs-testimonials.md, which lives outside this repo, so CI cannot
// compare the words themselves). This test checks what it can:
//
//   1. every quote has a non-empty quote, name and title, and an ISO date
//      (YYYY-MM-DD, a real calendar day, not in the future)
//   2. no quote carries its own quote marks (the component sets the quote as
//      a <blockquote>, so wrapping marks would be added text)
//   3. ONLY the studies with a real, received quote carry one. Adding a quote
//      to another study means a client sent one: record it in the vault note
//      first, then add the slug below (CLAUDE.md never-break rule 9).
//
// It reads the MDX frontmatter straight off disk, so it needs no Astro
// runtime. The parser handles only the shape these files use: a
// `testimonials:` key followed by `  - key: value` list items with
// `    key: value` continuation lines, each value a plain or quoted scalar.
// =============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** The studies with a real quote on file (vault note, 2026-10-30). */
const WITH_QUOTES: Record<string, number> = {
  'theology-matters': 3, // plus Richard's Google review (2026-11-16) and the TM half of Clark's (2026-11-20)
  'foundation-for-reformed-theology': 1,
  'stone-steps-50k': 1, // now with David's Google review link (2026-11-19)
  'first-baptist-muncie': 2,
  'first-presbyterian-orangeburg': 2, // plus the Orangeburg half of Clark Remsburg's Google review (2026-11-19, split 2026-11-20)
  // Public Google reviews (2026-11-15), each with its link and photo.
  'reid-design': 1,
  'west-chester-preschool': 2, // plus Lisa Cortez's Google review (2026-11-20)
};

const dir = fileURLToPath(new URL('../content/case-studies/', import.meta.url));
const studies = readdirSync(dir)
  .filter((f) => f.endsWith('.mdx'))
  .map((f) => ({
    slug: f.replace(/\.mdx$/, ''),
    text: readFileSync(dir + f, 'utf8').replace(/\r\n/g, '\n'),
  }));

/** Undo YAML scalar quoting: 'it''s' and "plain". The one escape used is backslash-n, a
 *  paragraph break inside a long review. */
function scalar(raw: string): string {
  const v = raw.trim();
  if (v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1).replace(/''/g, "'");
  if (v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1).replace(/\\n/g, '\n');
  return v;
}

type Item = Record<string, string>;

/** The `testimonials:` list from a study's frontmatter, or undefined. */
function testimonials(text: string): Item[] | undefined {
  const frontmatter = text.split('\n---\n')[0];
  const lines = frontmatter.split('\n');
  const start = lines.findIndex((l) => /^testimonials:\s*$/.test(l));
  if (start < 0) return undefined;
  const items: Item[] = [];
  for (const line of lines.slice(start + 1)) {
    if (!line.startsWith('  ')) break;
    // A nested `source:` block (a public review): its keys are read as source.platform and so on.
    const nested = line.match(/^ {6}([A-Za-z]+):\s*(.*)$/);
    if (nested) {
      assert.ok(items.length > 0, 'testimonials: a nested field before the first item');
      items[items.length - 1][`source.${nested[1]}`] = scalar(nested[2]);
      continue;
    }
    const m = line.match(/^ {2}(- | {2})([A-Za-z]+):\s*(.*)$/);
    assert.ok(m, `testimonials: cannot read this line:\n${line}`);
    if (m[1] === '- ') items.push({});
    assert.ok(items.length > 0, 'testimonials: a field before the first "- " item');
    items[items.length - 1][m[2]] = scalar(m[3]);
  }
  return items;
}

test('there are case studies to check', () => {
  assert.ok(studies.length > 0);
});

test('every study named as having quotes exists', () => {
  const slugs = new Set(studies.map((s) => s.slug));
  for (const slug of Object.keys(WITH_QUOTES)) assert.ok(slugs.has(slug), `no study ${slug}`);
});

for (const { slug, text } of studies) {
  const list = testimonials(text);
  const expected = WITH_QUOTES[slug];

  test(`${slug}: carries quotes only if a real one was received`, () => {
    if (expected === undefined) {
      assert.equal(
        list,
        undefined,
        `${slug} has testimonials, but no quote from this client is on file`,
      );
    } else {
      assert.ok(list, `${slug} should carry its client's quote`);
      assert.equal(list.length, expected, `${slug}: expected ${expected} quote(s)`);
    }
  });

  if (!list) continue;

  test(`${slug}: every quote has quote, name, title and an ISO date`, () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const t of list) {
      for (const key of ['quote', 'name', 'title', 'date']) {
        assert.ok(t[key] && t[key].trim().length > 0, `${slug}: a quote is missing ${key}`);
      }
      assert.match(t.date, /^\d{4}-\d{2}-\d{2}$/, `${slug}: date must be YYYY-MM-DD`);
      const d = new Date(`${t.date}T00:00:00Z`);
      assert.equal(d.toISOString().slice(0, 10), t.date, `${slug}: ${t.date} is not a real day`);
      assert.ok(t.date <= today, `${slug}: ${t.date} is in the future`);
      const known = new Set([
        'quote',
        'name',
        'title',
        'date',
        'context',
        'highlight',
        'photo',
        'alsoOn',
        'source',
        'source.platform',
        'source.rating',
        'source.url',
      ]);
      for (const key of Object.keys(t)) assert.ok(known.has(key), `${slug}: unknown key ${key}`);
      // The optional key phrase (the quote band's marker) picks words out of the quote. It can
      // never add or change any, so it has to be in the quote exactly as written.
      if (t.highlight !== undefined) {
        assert.ok(
          t.highlight.length > 0 && t.quote.includes(t.highlight),
          `${slug}: highlight must be copied exactly out of the quote`,
        );
      }
    }
  });

  test(`${slug}: a public review names its platform, its stars and a link to the original`, () => {
    for (const t of list) {
      if (t.source === undefined) continue;
      assert.equal(t['source.platform'], 'google', `${slug}: only Google reviews carry stars`);
      assert.match(t['source.rating'] ?? '', /^[1-5]$/, `${slug}: rating is a whole number 1 to 5`);
      assert.match(
        t['source.url'] ?? '',
        /^https:\/\/(www\.google\.com\/maps|maps\.app\.goo\.gl)\//,
        `${slug}: the link must open the review on Google Maps`,
      );
    }
  });

  test(`${slug}: a quote's photo exists at both sizes`, () => {
    for (const t of list) {
      if (t.photo === undefined) continue;
      for (const size of [96, 192]) {
        const file = fileURLToPath(new URL(`../../public${t.photo}-${size}.webp`, import.meta.url));
        assert.ok(existsSync(file), `${slug}: missing ${t.photo}-${size}.webp`);
      }
    }
  });

  test(`${slug}: quotes carry no wrapping quote marks`, () => {
    for (const t of list) {
      assert.doesNotMatch(t.quote, /^["'“‘]|["'”’]$/, `${slug}: drop the quote marks`);
    }
  });
}

// A quote about more than one site is written once and shared with `alsoOn` (src/lib/study-quotes.ts),
// never pasted into a second study, so the site-wide lists never show or count it twice.
test('every alsoOn names another real study', () => {
  const slugs = new Set(studies.map((s) => s.slug));
  for (const { slug, text } of studies) {
    for (const t of testimonials(text) ?? []) {
      if (t.alsoOn === undefined) continue;
      const m = t.alsoOn.match(/^\[(.*)\]$/);
      assert.ok(m, `${slug}: write alsoOn as [slug, slug]`);
      for (const other of m[1].split(',').map((x) => x.trim())) {
        assert.ok(slugs.has(other), `${slug}: alsoOn names no study ${other}`);
        assert.notEqual(other, slug, `${slug}: alsoOn names its own study`);
      }
    }
  }
});

test('no quote is pasted into two studies (share it with alsoOn instead)', () => {
  const seen = new Map<string, string>();
  for (const { slug, text } of studies) {
    for (const t of testimonials(text) ?? []) {
      const other = seen.get(t.quote);
      assert.equal(other, undefined, `${slug} repeats a quote from ${other}: use alsoOn`);
      seen.set(t.quote, slug);
    }
  }
});
