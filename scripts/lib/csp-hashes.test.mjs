import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fillPolicy, hashSource, inlineHashes } from './csp-hashes.mjs';

const sha = (text) => `'sha256-${createHash('sha256').update(text).digest('base64')}'`;

test('hashes inline scripts, including module ones, and inline styles', () => {
  const { scripts, styles } = inlineHashes(
    '<script>a()</script><script type="module">b()</script><style>p{color:red}</style>',
  );
  assert.deepEqual(scripts, [sha('a()'), sha('b()')]);
  assert.deepEqual(styles, [sha('p{color:red}')]);
});

test('skips scripts with a src and data blocks, which CSP does not hash', () => {
  const { scripts } = inlineHashes(
    '<script src="/a.js"></script>' +
      '<script type="application/ld+json">{}</script>' +
      '<script id="x" type="application/json">[]</script>',
  );
  assert.deepEqual(scripts, []);
});

test('hashes what the browser hashes: CRLF counts as LF', () => {
  assert.equal(hashSource('a\r\nb\rc'), sha('a\nb\nc'));
});

test('fillPolicy fills both markers and removes duplicates', () => {
  const out = fillPolicy(
    'script-src __CSP_SCRIPT_HASHES__; style-src __CSP_STYLE_HASHES__',
    ['b', 'a', 'b'],
    ['c'],
  );
  assert.equal(out, 'script-src a b; style-src c');
});

test('fillPolicy refuses a missing marker and an over-long line', () => {
  assert.throws(() => fillPolicy('nothing here', [], []), /marker/);
  const many = Array.from({ length: 60 }, (_, i) => hashSource(String(i)));
  assert.throws(() => fillPolicy('__CSP_SCRIPT_HASHES__ __CSP_STYLE_HASHES__', many, []), /2,000/);
});
