import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cn } from './utils.ts';

// ── cn (clsx + tailwind-merge) ────────────────────────────────────────────

test('returns an empty string when called with no arguments', () => {
  assert.equal(cn(), '');
});

test('returns a single class unchanged', () => {
  assert.equal(cn('p-4'), 'p-4');
});

test('merges multiple class strings separated by spaces', () => {
  const result = cn('flex', 'items-center', 'gap-2');
  assert.equal(result, 'flex items-center gap-2');
});

test('deduplicates identical classes', () => {
  // clsx handles identical strings; tailwind-merge keeps the last one.
  const result = cn('p-4', 'p-4');
  assert.equal(result, 'p-4');
});

test('resolves conflicting tailwind utilities by keeping the last one', () => {
  // tailwind-merge drops the earlier conflicting utility.
  const result = cn('p-2', 'p-4');
  assert.equal(result, 'p-4');
});

test('resolves conflicting text-color utilities', () => {
  const result = cn('text-red-500', 'text-blue-700');
  assert.equal(result, 'text-blue-700');
});

test('resolves conflicting padding utilities across sides', () => {
  // px-4 conflicts with px-8; the later value wins.
  const result = cn('px-4', 'px-8');
  assert.equal(result, 'px-8');
});

test('skips falsy values: undefined, null, false, and empty string', () => {
  const result = cn('flex', undefined, null, false, '', 'gap-2');
  assert.equal(result, 'flex gap-2');
});

test('handles object syntax from clsx (truthy keys included)', () => {
  const result = cn({ 'font-bold': true, 'font-thin': false });
  assert.equal(result, 'font-bold');
});

test('handles array syntax from clsx', () => {
  const result = cn(['flex', 'gap-4']);
  assert.equal(result, 'flex gap-4');
});

test('handles nested arrays and objects together', () => {
  const active = true;
  const result = cn('base', ['array-class'], { conditional: active });
  assert.equal(result, 'base array-class conditional');
});

test('non-conflicting utilities from different groups are both preserved', () => {
  // flex and text-lg are in separate tailwind groups; both should appear.
  const result = cn('flex', 'text-lg');
  assert.equal(result, 'flex text-lg');
});
