import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plainText, wordSpans } from './words.ts';

test('wordSpans numbers every word and keeps the tags', () => {
  assert.equal(
    wordSpans('Every price <b>is public.</b>'),
    '<span class="w" style="--n:0">Every</span> <span class="w" style="--n:1">price</span> <b><span class="w" style="--n:2">is</span> <span class="w" style="--n:3">public.</span></b>',
  );
});

test('plainText gives the sentence for aria-label', () => {
  assert.equal(plainText('Every  price <b>is public.</b>'), 'Every price is public.');
});
