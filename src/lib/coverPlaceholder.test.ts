import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getCoverPlaceholder } from './coverPlaceholder.ts';

// ── getCoverPlaceholder contract tests ────────────────────────────────────
// coverPlaceholder.ts is a thin typed wrapper around coverPlaceholders.json
// (generated at build time by scripts/generate-placeholders.mjs). These tests
// exercise the real exported accessor.

test('returns a string for a known slug', () => {
  const result = getCoverPlaceholder('presbyterian-academy');
  assert.ok(typeof result === 'string', 'expected a string value');
});

test('returned value starts with a data URI prefix', () => {
  const result = getCoverPlaceholder('presbyterian-academy');
  assert.ok(result?.startsWith('data:image/'), `unexpected prefix: ${result?.slice(0, 20)}`);
});

test('returned value is a non-empty string', () => {
  const result = getCoverPlaceholder('presbyterian-academy');
  assert.ok(result && result.length > 0, 'expected a non-empty string');
});

test('returns undefined for an unknown slug', () => {
  assert.equal(getCoverPlaceholder('slug-that-does-not-exist'), undefined);
});

test('returns undefined for an empty string slug', () => {
  assert.equal(getCoverPlaceholder(''), undefined);
});

test('returns undefined for a slug with different casing', () => {
  // The lookup is case-sensitive (plain object key access).
  assert.equal(getCoverPlaceholder('Presbyterian-Academy'), undefined);
});

test('returns undefined for a slug with a trailing slash', () => {
  assert.equal(getCoverPlaceholder('presbyterian-academy/'), undefined);
});

test('returns undefined for a slug that is a partial prefix of a known key', () => {
  assert.equal(getCoverPlaceholder('presbyterian'), undefined);
});
