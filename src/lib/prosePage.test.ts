import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CmsDeps, CmsReader, Raw } from './cms.ts';
import { fallbackFromFiles } from './cmsFallback.ts';
import type { PTNode } from './portableText.ts';
import {
  CODE_CLASS,
  LINK_CLASS,
  anchorFor,
  buildSections,
  getProsePage,
  lastUpdatedLabel,
  normalizeProsePage,
  proseTitle,
} from './prosePage.ts';

// ── Fixtures ─────────────────────────────────────────────────────────────────
// The committed fallback, read the way the Worker bundles it.

const fallback = fallbackFromFiles({
  pages: JSON.parse(readFileSync(join(process.cwd(), 'cms/content/pages.json'), 'utf8')),
});
const raw = (slug: string) => (fallback.entry('pages', slug) ?? {}) as Raw;

/** A reader that serves the given entry, or fails the way D1 would. */
function reader(opts: { entry?: Raw | null; throws?: boolean }): CmsReader {
  return {
    async getEntry() {
      if (opts.throws) throw new Error('D1 is down');
      return { data: opts.entry ?? null };
    },
    async getList() {
      return { entries: [] };
    },
    async getMenu() {
      return { items: null };
    },
  };
}

function deps(r: CmsReader) {
  const logs: string[] = [];
  const d: CmsDeps = { reader: r, fallback, log: (m) => logs.push(m) };
  return { d, logs };
}

const para = (text: string, extra: Partial<PTNode> = {}): PTNode => ({
  _type: 'block',
  _key: text,
  style: 'normal',
  markDefs: [],
  children: [{ _type: 'span', text, marks: [] }],
  ...extra,
});
const h2 = (text: string) => para(text, { style: 'h2' });

// ── The fallback IS the prose the pages carried before ───────────────────────
// These literals were copied from privacy.astro, accessibility.astro and
// colophon.astro on main before this PR (the render-parity run in the PR proves
// the markup too). If one changes, the production page changes with it, so it
// should be a deliberate edit of cms/content/pages.json.

test('Privacy: the committed fallback reproduces the page', async () => {
  const { d, logs } = deps(reader({ entry: null }));
  const page = await getProsePage('privacy', {}, { deps: d });
  assert.equal(page.title, 'Privacy');
  assert.equal(proseTitle(page.title, 'Nixon Creative Studio'), 'Privacy | Nixon Creative Studio');
  assert.equal(page.heading, 'What this site collects.');
  assert.equal(page.eyebrow, 'Privacy notice');
  assert.equal(page.summary, 'What this site collects, and what it does with it.');
  assert.equal(page.showToc, true);
  assert.equal(lastUpdatedLabel(page.lastUpdated ?? ''), 'September 4, 2026');
  assert.deepEqual(
    page.sections.map((s) => [s.id, s.heading]),
    [
      ['contact-form', 'Contact form'],
      ['analytics', 'Analytics'],
      ['server-logs', 'Server logs'],
      ['cookies', 'Cookies'],
      ['your-data', 'Your data'],
      ['changes', 'Changes'],
    ],
  );
  assert.equal(page.intro.length, 1);
  assert.match(page.intro[0], /^Short version: a contact form, two analytics tools/);
  assert.equal(
    page.intro[0].endsWith(
      `email <a class="${LINK_CLASS}" href="mailto:nathan@nixoncreativestudio.com">nathan@nixoncreativestudio.com</a>.`,
    ),
    true,
    'the email link has the prose link class and no new-tab attributes',
  );
  assert.ok(logs.length > 0, 'the fallback is logged');
});

test('Privacy: external links open in a new tab, the code mark keeps its class, quotes stay literal', async () => {
  const page = await getProsePage('privacy', {}, { deps: deps(reader({ entry: null })).d });
  const contactForm = page.sections[0].blocks;
  assert.equal(contactForm.length, 2);
  const first = contactForm[0];
  assert.equal(first.kind, 'p');
  if (first.kind === 'p') {
    assert.ok(
      first.html.includes(
        `<a class="${LINK_CLASS}" href="https://web3forms.com/" target="_blank" rel="noopener noreferrer">Web3Forms</a>`,
      ),
    );
    assert.ok(first.html.includes("I'd keep any project inquiry."), 'apostrophes are literal');
  }
  const second = contactForm[1];
  if (second.kind === 'p') assert.ok(second.html.includes('a hidden "honeypot" field'));
  const cookies = page.sections[3].blocks[0];
  if (cookies.kind === 'p') {
    assert.ok(cookies.html.includes(`<code class="${CODE_CLASS}">_ga</code> family`));
  }
});

test('Accessibility: the fallback keeps the three hand-picked anchors', async () => {
  const page = await getProsePage('accessibility', {}, { deps: deps(reader({ entry: null })).d });
  assert.equal(page.title, 'Accessibility');
  assert.equal(page.heading, 'Built to be used by everyone.');
  assert.equal(page.eyebrow, 'Accessibility');
  assert.equal(lastUpdatedLabel(page.lastUpdated ?? ''), 'June 27, 2026');
  assert.deepEqual(
    page.sections.map((s) => [s.id, s.heading]),
    [
      ['the-standard', 'The standard'],
      ['in-practice', 'In practice'],
      ['how-its-checked', 'How it is checked'],
      ['where-it-stops', 'Where it stops short'],
      ['report', 'Found a problem?'],
    ],
  );
});

test('Accessibility: the practices are one five-item tick list, quotes entity-escaped', async () => {
  const page = await getProsePage('accessibility', {}, { deps: deps(reader({ entry: null })).d });
  const practice = page.sections[1].blocks;
  assert.equal(practice[0].kind, 'p');
  const list = practice[1];
  assert.equal(list.kind, 'list');
  if (list.kind === 'list') {
    assert.equal(list.ordered, false);
    assert.equal(list.items.length, 5);
    assert.ok(list.items[0].includes('a &quot;Skip to main content&quot; link'));
  }
  assert.equal(practice.length, 2);
});

test('Colophon: the fallback is the ledger layout with the six rows', async () => {
  const page = await getProsePage('colophon', {}, { deps: deps(reader({ entry: null })).d });
  assert.equal(page.showToc, false);
  assert.equal(page.heading, 'Colophon');
  assert.equal(page.eyebrow, undefined);
  assert.equal(page.lastUpdated, undefined);
  assert.equal(page.sections.length, 0);
  assert.deepEqual(
    page.rows.map((r) => r.label),
    ['Built with', 'Typography', 'Accessibility', 'Performance', 'Photography', 'Privacy'],
  );
  // The "static HTML" line was rewritten in CMS-DESIGN PR 2; the copy must not claim it again.
  const performance = page.rows.find((r) => r.label === 'Performance');
  assert.match(performance?.detail ?? '', /^Pages are put together on the Cloudflare network/);
  assert.ok(!page.rows.some((r) => /static html/i.test(r.detail)));
  assert.match(page.intro[0], /^How this site is made, and the standards behind it\./);
});

// ── CMS path ─────────────────────────────────────────────────────────────────

test('the same data through the CMS path equals the fallback path', async () => {
  for (const slug of ['privacy', 'accessibility', 'colophon']) {
    const viaFallback = await getProsePage(slug, {}, { deps: deps(reader({ entry: null })).d });
    const { d, logs } = deps(reader({ entry: raw(slug) }));
    const viaCms = await getProsePage(slug, {}, { deps: d });
    assert.equal(logs.length, 0, `${slug}: no fallback line on the CMS path`);
    assert.deepEqual(viaCms, viaFallback, slug);
  }
});

test('a published edit reads through: new heading, new anchor, new list entry', async () => {
  const edited: Raw = { ...raw('privacy') };
  const body = (edited.content as PTNode[]).map((b) =>
    b.style === 'h2' && b.children?.[0]?.text === 'Server logs'
      ? { ...b, children: [{ ...b.children[0], text: 'Hosting logs' }] }
      : b,
  );
  edited.content = body;
  edited.last_updated = '2026-11-02T00:00:00.000Z';
  const page = await getProsePage('privacy', {}, { deps: deps(reader({ entry: edited })).d });
  assert.deepEqual(
    page.sections.map((s) => s.id),
    ['contact-form', 'analytics', 'hosting-logs', 'cookies', 'your-data', 'changes'],
  );
  assert.equal(lastUpdatedLabel(page.lastUpdated ?? ''), 'November 2, 2026');
});

test('rewording a heading with a legacy anchor gives it the new slug', () => {
  assert.equal(anchorFor('accessibility', 'Found a problem?'), 'report');
  assert.equal(anchorFor('accessibility', 'Found a bug?'), 'found-a-bug');
  assert.equal(anchorFor('privacy', 'Found a problem?'), 'found-a-problem');
});

// ── Fallback paths ───────────────────────────────────────────────────────────

test('a missing entry serves the fallback and logs it', async () => {
  const { d, logs } = deps(reader({ entry: null }));
  const page = await getProsePage('privacy', {}, { deps: d });
  assert.equal(page.heading, 'What this site collects.');
  assert.ok(logs.some((l) => /pages\/privacy is missing or unpublished/.test(l)));
});

test('a D1 error serves the committed copy', async () => {
  const { d, logs } = deps(reader({ throws: true }));
  const page = await getProsePage('accessibility', {}, { deps: d });
  assert.equal(page.sections.length, 5);
  assert.ok(logs.length >= 1);
});

test('the empty template entry production already has falls back whole', async () => {
  // The EmDash template's `pages` collection holds only Title and Content, so an
  // old stub with a slug of "privacy" must not render as a headline-less page.
  const stub: Raw = { title: 'Privacy', content: [para('Lorem ipsum')] };
  const { d, logs } = deps(reader({ entry: stub }));
  const page = await getProsePage('privacy', {}, { deps: d });
  assert.equal(page.heading, 'What this site collects.');
  assert.ok(logs.some((l) => /could not be read as the expected shape/.test(l)));
});

test('a blank required field, an empty body or empty rows fall back whole', async () => {
  const cases: [string, Raw][] = [
    ['privacy', { ...raw('privacy'), heading: '   ' }],
    ['privacy', { ...raw('privacy'), summary: '' }],
    ['privacy', { ...raw('privacy'), title: '' }],
    ['privacy', { ...raw('privacy'), content: [] }],
    ['privacy', { ...raw('privacy'), content: [{ _type: 'image' }] }],
    ['colophon', { ...raw('colophon'), rows: [] }],
    ['colophon', { ...raw('colophon'), rows: [{ label: 'Only a label' }] }],
  ];
  for (const [slug, entry] of cases) {
    const { d, logs } = deps(reader({ entry }));
    const page = await getProsePage(slug, {}, { deps: d });
    const wanted = await getProsePage(slug, {}, { deps: deps(reader({ entry: null })).d });
    assert.deepEqual(page, wanted, `${slug} serves the fallback, not the half-edit`);
    assert.ok(logs.some((l) => /could not be read as the expected shape/.test(l)));
  }
});

test('a missing date just hides the badge and the closing line', () => {
  const page = normalizeProsePage('privacy', { ...raw('privacy'), last_updated: null });
  assert.equal(page.lastUpdated, undefined);
  const bad = normalizeProsePage('privacy', { ...raw('privacy'), last_updated: 'soon' });
  assert.equal(bad.lastUpdated, undefined);
});

// ── buildSections ────────────────────────────────────────────────────────────

test('text before the first Heading 2 is a heading-less section', () => {
  const sections = buildSections([para('Lead in'), h2('First'), para('Body')], 'privacy');
  assert.equal(sections.length, 2);
  assert.equal(sections[0].heading, '');
  assert.equal(sections[0].id, '');
  assert.equal(sections[1].id, 'first');
});

test('Heading 3 becomes a sub-heading with its own id; deeper styles become paragraphs', () => {
  const sections = buildSections(
    [h2('Section'), para('Sub', { style: 'h3' }), para('Deep', { style: 'h4' })],
    'privacy',
  );
  assert.deepEqual(sections[0].blocks[0], { kind: 'h3', id: 'sub', text: 'Sub' });
  assert.equal(sections[0].blocks[1].kind, 'p');
});

test('list items of one kind join into one list; a different kind starts another', () => {
  const li = (text: string, kind: 'bullet' | 'number') => para(text, { listItem: kind, level: 1 });
  const sections = buildSections(
    [h2('S'), li('a', 'bullet'), li('b', 'bullet'), li('c', 'number'), para('after')],
    'privacy',
  );
  const blocks = sections[0].blocks;
  assert.deepEqual(
    blocks.map((b) => b.kind),
    ['list', 'list', 'p'],
  );
  if (blocks[0].kind === 'list') assert.deepEqual(blocks[0].items, ['a', 'b']);
  if (blocks[1].kind === 'list') assert.equal(blocks[1].ordered, true);
});

test('repeated headings get -2, -3 so ids stay unique', () => {
  const sections = buildSections([h2('Same'), h2('Same'), h2('Same')], 'privacy');
  assert.deepEqual(
    sections.map((s) => s.id),
    ['same', 'same-2', 'same-3'],
  );
});

test('a heading with no letters or digits still gets a usable id', () => {
  const sections = buildSections([h2('!!!'), h2('???')], 'privacy');
  assert.deepEqual(
    sections.map((s) => s.id),
    ['section', 'section-2'],
  );
});

test('unsafe links lose the link but keep their text; images and embeds render nothing', () => {
  const bad: PTNode = {
    _type: 'block',
    style: 'normal',
    markDefs: [{ _key: 'x', _type: 'link', href: 'javascript:alert(1)' }],
    children: [{ _type: 'span', text: 'click me', marks: ['x'] }],
  };
  const sections = buildSections(
    [h2('S'), bad, { _type: 'image' } as PTNode, { _type: 'code', code: 'x' } as PTNode],
    'privacy',
  );
  assert.equal(sections[0].blocks.length, 1);
  const only = sections[0].blocks[0];
  assert.equal(only.kind === 'p' ? only.html : '', 'click me');
});

test('a site-relative link stays in the same tab', () => {
  const link: PTNode = {
    _type: 'block',
    style: 'normal',
    markDefs: [{ _key: 'l', _type: 'link', href: '/accessibility/' }],
    children: [{ _type: 'span', text: 'accessibility page', marks: ['l'] }],
  };
  const sections = buildSections([h2('S'), link], 'colophon');
  const only = sections[0].blocks[0];
  assert.equal(
    only.kind === 'p' ? only.html : '',
    `<a class="${LINK_CLASS}" href="/accessibility/">accessibility page</a>`,
  );
});

// ── Title ────────────────────────────────────────────────────────────────────

test('proseTitle adds the studio name once', () => {
  assert.equal(proseTitle('Colophon', 'Nixon Creative Studio'), 'Colophon | Nixon Creative Studio');
  assert.equal(
    proseTitle('Colophon | Nixon Creative Studio', 'Nixon Creative Studio'),
    'Colophon | Nixon Creative Studio',
  );
});
