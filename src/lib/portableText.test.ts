import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  blockHtml,
  headingsOf,
  isSafeLink,
  plainText,
  restrictPortableText,
  slugify,
  type PTNode,
} from './portableText.ts';

const para = (text: string, extra: Partial<PTNode> = {}): PTNode => ({
  _type: 'block',
  _key: text,
  style: 'normal',
  markDefs: [],
  children: [{ _type: 'span', text, marks: [] }],
  ...extra,
});

test('slugify matches the case-study heading rule', () => {
  assert.equal(slugify('The approach'), 'the-approach');
  assert.equal(slugify('  Contact form  '), 'contact-form');
  assert.equal(slugify('What we built!'), 'what-we-built');
});

test('isSafeLink allows http(s), mailto, tel, site-relative and fragments only', () => {
  for (const ok of [
    'https://a.example/x',
    'http://a.example',
    'mailto:a@b.co',
    'tel:+15135550123',
    '/about/',
    '#top',
  ])
    assert.equal(isSafeLink(ok), true, ok);
  for (const bad of [
    'javascript:alert(1)',
    'data:text/html,x',
    '//evil.example',
    'ftp://x',
    '',
    ' ',
    'about',
    null,
    3,
  ])
    assert.equal(isSafeLink(bad), false, String(bad));
});

test('non-block nodes render nothing', () => {
  const out = restrictPortableText([
    para('keep'),
    { _type: 'image', asset: { _ref: 'x' } },
    { _type: 'code', code: 'x' },
    null,
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0]._key, 'keep');
});

test('a missing or non-array value gives []', () => {
  assert.deepEqual(restrictPortableText(undefined), []);
  assert.deepEqual(restrictPortableText(null), []);
  assert.deepEqual(restrictPortableText('text'), []);
});

test('headings become paragraphs unless the caller lists them', () => {
  const blocks = [
    para('H1', { style: 'h1' }),
    para('H2', { style: 'h2' }),
    para('Q', { style: 'blockquote' }),
  ];
  assert.deepEqual(
    restrictPortableText(blocks).map((b) => b.style),
    ['normal', 'normal', 'normal'],
  );
  assert.deepEqual(
    restrictPortableText(blocks, { headings: ['h2', 'h3'] }).map((b) => b.style),
    ['normal', 'h2', 'normal'],
  );
});

test('only strong, em and safe links survive as marks', () => {
  const block: PTNode = {
    _type: 'block',
    style: 'normal',
    markDefs: [
      { _key: 'ok', _type: 'link', href: 'mailto:nathan@example.com' },
      { _key: 'bad', _type: 'link', href: 'javascript:alert(1)' },
      { _key: 'c', _type: 'comment', text: 'x' },
    ],
    children: [
      { _type: 'span', text: 'Write ', marks: ['strong', 'code', 'underline'] },
      { _type: 'span', text: 'me', marks: ['em', 'ok'] },
      { _type: 'span', text: ' now', marks: ['bad', 'c'] },
    ],
  };
  const [out] = restrictPortableText([block]);
  assert.deepEqual(out.markDefs, [
    { _key: 'ok', _type: 'link', href: 'mailto:nathan@example.com' },
  ]);
  assert.deepEqual(
    out.children?.map((c) => c.marks),
    [['strong'], ['em', 'ok'], []],
  );
  assert.equal(plainText([out]), 'Write me now', 'text is kept even when a mark is dropped');
});

test('lists are paragraphs unless the caller opts in', () => {
  const item = para('one', { listItem: 'bullet', level: 1 });
  const [plain] = restrictPortableText([item]);
  assert.equal(plain.listItem, undefined);
  assert.equal(plain.level, undefined);
  const [list] = restrictPortableText([item], { lists: true });
  assert.equal(list.listItem, 'bullet');
  assert.equal(list.level, 1);
});

test('blocks with no text are dropped', () => {
  assert.deepEqual(
    restrictPortableText([para(''), para('   '), { _type: 'block', children: [] }]),
    [],
  );
});

test('headingsOf lists h2 text and ids for a table of contents', () => {
  const blocks = [
    para('Intro'),
    para('Contact form', { style: 'h2' }),
    para('Sub', { style: 'h3' }),
    para('Analytics', { style: 'h2' }),
  ];
  assert.deepEqual(headingsOf(blocks), [
    { text: 'Contact form', slug: 'contact-form' },
    { text: 'Analytics', slug: 'analytics' },
  ]);
  assert.deepEqual(headingsOf(blocks, 'h3'), [{ text: 'Sub', slug: 'sub' }]);
  assert.deepEqual(headingsOf(null), []);
});

test('blockHtml: plain text keeps apostrophes literal and escapes markup characters', () => {
  assert.equal(blockHtml(para("It's a studio's work")), "It's a studio's work");
  assert.equal(blockHtml(para('a < b & "c" > d')), 'a &lt; b &amp; &quot;c&quot; &gt; d');
});

test('blockHtml: strong, em and a safe link nest as link > strong > em', () => {
  const block: PTNode = {
    _type: 'block',
    style: 'normal',
    markDefs: [{ _key: 'l1', _type: 'link', href: 'https://a.example/x?a=1&b=2' }],
    children: [
      { _type: 'span', text: 'Plain, ', marks: [] },
      { _type: 'span', text: 'bold', marks: ['strong'] },
      { _type: 'span', text: ' ', marks: [] },
      { _type: 'span', text: 'both', marks: ['em', 'strong', 'l1'] },
    ],
  };
  assert.equal(
    blockHtml(block),
    'Plain, <strong>bold</strong> <a href="https://a.example/x?a=1&amp;b=2"><strong><em>both</em></strong></a>',
  );
});

test('blockHtml after restrictPortableText drops unsafe links but keeps their text', () => {
  const block: PTNode = {
    _type: 'block',
    style: 'normal',
    markDefs: [{ _key: 'bad', _type: 'link', href: 'javascript:alert(1)' }],
    children: [{ _type: 'span', text: 'click me', marks: ['bad'] }],
  };
  const [restricted] = restrictPortableText([block]);
  assert.equal(blockHtml(restricted), 'click me');
});

test('blockHtml: a link that opens in a new tab gets rel noopener, a fragment never does', () => {
  const mk = (href: string): PTNode => ({
    _type: 'block',
    style: 'normal',
    markDefs: [{ _key: 'l', _type: 'link', href, blank: true }],
    children: [{ _type: 'span', text: 'go', marks: ['l'] }],
  });
  assert.equal(
    blockHtml(mk('https://a.example')),
    '<a href="https://a.example" target="_blank" rel="noopener noreferrer">go</a>',
  );
  assert.equal(blockHtml(mk('#now')), '<a href="#now">go</a>');
});

test('restrictPortableText keeps the code mark only when the caller opts in', () => {
  const block: PTNode = {
    _type: 'block',
    style: 'normal',
    markDefs: [],
    children: [{ _type: 'span', text: '_ga', marks: ['code'] }],
  };
  assert.deepEqual(restrictPortableText([block])[0].children?.[0].marks, []);
  assert.deepEqual(restrictPortableText([block], { code: true })[0].children?.[0].marks, ['code']);
});

test('blockHtml options: link class, external links open a new tab, code class, literal quotes', () => {
  const block: PTNode = {
    _type: 'block',
    style: 'normal',
    markDefs: [
      { _key: 'a', _type: 'link', href: 'https://a.example/x' },
      { _key: 'b', _type: 'link', href: 'mailto:me@a.example' },
      { _key: 'c', _type: 'link', href: '/about/' },
    ],
    children: [
      { _type: 'span', text: 'say "hi" ', marks: [] },
      { _type: 'span', text: 'ext', marks: ['a'] },
      { _type: 'span', text: 'mail', marks: ['b'] },
      { _type: 'span', text: 'in', marks: ['c'] },
      { _type: 'span', text: '_ga', marks: ['code'] },
    ],
  };
  const html = blockHtml(block, {
    linkClass: 'lk',
    externalBlank: true,
    codeClass: 'cd',
    literalQuotes: true,
  });
  assert.equal(
    html,
    'say "hi" <a class="lk" href="https://a.example/x" target="_blank" rel="noopener noreferrer">ext</a>' +
      '<a class="lk" href="mailto:me@a.example">mail</a><a class="lk" href="/about/">in</a>' +
      '<code class="cd">_ga</code>',
  );
  // Without options nothing changes: no class, no new tab, quotes escaped.
  assert.equal(
    blockHtml(block),
    'say &quot;hi&quot; <a href="https://a.example/x">ext</a><a href="mailto:me@a.example">mail</a>' +
      '<a href="/about/">in</a><code>_ga</code>',
  );
});

test('restrictPortableText keeps the blockquote style only when asked (the journal body)', () => {
  const quote: PTNode = {
    _type: 'block',
    style: 'blockquote',
    markDefs: [],
    children: [{ _type: 'span', text: 'A quote', marks: [] }],
  };
  assert.equal(restrictPortableText([quote])[0].style, 'normal');
  assert.equal(restrictPortableText([quote], { blockquote: true })[0].style, 'blockquote');
  // Asking for quotes does not let other styles through.
  const h4: PTNode = { ...quote, style: 'h4' };
  assert.equal(restrictPortableText([h4], { blockquote: true })[0].style, 'normal');
});
