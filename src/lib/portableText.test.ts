import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
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
