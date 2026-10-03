import { test } from 'node:test';
import assert from 'node:assert/strict';
import { codeBlockHtml, renderJournalBody } from './journalBody.ts';
import type { PTNode } from './portableText.ts';

// ── Builders ─────────────────────────────────────────────────────────────────

let key = 0;
const span = (text: string, marks: string[] = []): PTNode => ({
  _type: 'span',
  _key: `s${key++}`,
  text,
  marks,
});
const block = (style: string, children: PTNode[], extra: Partial<PTNode> = {}): PTNode => ({
  _type: 'block',
  _key: `b${key++}`,
  style,
  markDefs: [],
  children,
  ...extra,
});
const p = (text: string) => block('normal', [span(text)]);
const li = (text: string, listItem: 'bullet' | 'number', level = 1) =>
  block('normal', [span(text)], { listItem, level });

// ── Blocks ───────────────────────────────────────────────────────────────────

test('paragraphs and h2/h3 headings; headings carry an id from their text', () => {
  const html = renderJournalBody([
    p('Hello world.'),
    block('h2', [span("What's in a footer?")]),
    block('h3', [span('Sub heading')]),
  ]);
  assert.equal(
    html,
    '<p>Hello world.</p><h2 id="whats-in-a-footer">What\'s in a footer?</h2><h3 id="sub-heading">Sub heading</h3>',
  );
});

test('h4 to h6 render as plain paragraphs (the outline stays h2/h3)', () => {
  assert.equal(renderJournalBody([block('h4', [span('Small')])]), '<p>Small</p>');
});

test('marks: bold, italic, inline code and a safe link, nested and escaped', () => {
  const html = renderJournalBody([
    {
      ...block('normal', [
        span('a < b & ', []),
        span('bold', ['strong']),
        span(' ', []),
        span('both', ['strong', 'em']),
        span(' ', []),
        span('x = 1', ['code']),
        span(' ', []),
        span('site', ['l1']),
      ]),
      markDefs: [{ _key: 'l1', _type: 'link', href: '/about/' }],
    },
  ]);
  assert.equal(
    html,
    '<p>a &lt; b &amp; <strong>bold</strong> <strong><em>both</em></strong> <code>x = 1</code> <a href="/about/">site</a></p>',
  );
});

test('an unsafe link keeps its text and loses its href; unsupported marks are dropped', () => {
  const html = renderJournalBody([
    {
      ...block('normal', [span('click', ['l1', 'underline'])]),
      markDefs: [{ _key: 'l1', _type: 'link', href: 'javascript:alert(1)' }],
    },
  ]);
  assert.equal(html, '<p>click</p>');
});

test('consecutive quote blocks become one blockquote', () => {
  const html = renderJournalBody([
    block('blockquote', [span('First.')]),
    block('blockquote', [span('Second.')]),
    p('After.'),
    block('blockquote', [span('Another.')]),
  ]);
  assert.equal(
    html,
    '<blockquote><p>First.</p><p>Second.</p></blockquote><p>After.</p><blockquote><p>Another.</p></blockquote>',
  );
});

test('flat bullet and numbered lists', () => {
  assert.equal(
    renderJournalBody([li('One', 'bullet'), li('Two', 'bullet')]),
    '<ul><li>One</li><li>Two</li></ul>',
  );
  assert.equal(
    renderJournalBody([li('One', 'number'), li('Two', 'number'), p('Then text.')]),
    '<ol><li>One</li><li>Two</li></ol><p>Then text.</p>',
  );
});

test('nested lists sit inside the item they belong to', () => {
  assert.equal(
    renderJournalBody([
      li('A', 'bullet'),
      li('A1', 'bullet', 2),
      li('A2', 'number', 2),
      li('B', 'bullet'),
    ]),
    '<ul><li>A<ul><li>A1</li></ul><ol><li>A2</li></ol></li><li>B</li></ul>',
  );
});

test('a list cannot start deeper than level 1 or jump levels', () => {
  assert.equal(
    renderJournalBody([li('Deep start', 'bullet', 3), li('Jump', 'bullet', 5)]),
    '<ul><li>Deep start<ul><li>Jump</li></ul></li></ul>',
  );
});

// ── Code blocks ──────────────────────────────────────────────────────────────

test('a code block is a focusable <pre> with no whitespace inside it, and its text is escaped', () => {
  const html = renderJournalBody([
    { _type: 'code', _key: 'c1', language: 'html', code: '<p class="x">&</p>' },
  ]);
  assert.match(html, /<pre tabindex="0" class="[^"]*rounded-xl"><code class="language-html">/);
  assert.ok(
    html.includes('<code class="language-html">&lt;p class="x"&gt;&amp;&lt;/p&gt;</code></pre>'),
  );
});

test('a code block with a file name gets a caption and a square top edge', () => {
  const html = codeBlockHtml({ _type: 'code', code: 'x', filename: 'a<b>.ts' });
  assert.ok(html.includes('>a&lt;b&gt;.ts</p>'));
  assert.match(html, /rounded-b-xl/);
  assert.ok(!/rounded-xl/.test(html.replace('rounded-t-xl', '').replace('rounded-b-xl', '')));
});

test('a language that is not a plain word never becomes a class', () => {
  const html = codeBlockHtml({ _type: 'code', code: 'x', language: 'a" onload="alert(1)' });
  assert.ok(!html.includes('class="language-'));
  assert.ok(!html.includes('onload'));
});

test('an empty code block renders nothing', () => {
  assert.equal(codeBlockHtml({ _type: 'code', code: '   ' }), '');
  assert.equal(renderJournalBody([{ _type: 'code', code: '' }]), '');
});

// ── Everything else ──────────────────────────────────────────────────────────

test('images, tables and unknown nodes render nothing, and the rest of the body survives', () => {
  const html = renderJournalBody([
    p('Before.'),
    { _type: 'image', _key: 'i1', asset: { _ref: 'abc' }, alt: 'x' },
    { _type: 'table', _key: 't1' },
    null as unknown as PTNode,
    p('After.'),
  ]);
  assert.equal(html, '<p>Before.</p><p>After.</p>');
});

test('empty and non-array input give an empty string', () => {
  assert.equal(renderJournalBody([]), '');
  assert.equal(renderJournalBody(undefined), '');
  assert.equal(renderJournalBody(null), '');
  assert.equal(renderJournalBody('text'), '');
  assert.equal(renderJournalBody([block('normal', [span('   ')])]), '');
});

test('a list followed by a quote closes cleanly', () => {
  assert.equal(
    renderJournalBody([li('A', 'bullet'), block('blockquote', [span('Q')])]),
    '<ul><li>A</li></ul><blockquote><p>Q</p></blockquote>',
  );
});
