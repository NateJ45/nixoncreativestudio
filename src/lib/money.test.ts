import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dollars, money } from './money.ts';

test('money prints whole dollars with a thousands comma', () => {
  assert.equal(money(4000), '$4,000');
  assert.equal(money(900), '$900');
  assert.equal(money(12000), '$12,000');
});

test('dollars reads every amount out of a display string, in order', () => {
  assert.deepEqual(dollars('from $900'), [900]);
  assert.deepEqual(dollars('$500 to $2,000'), [500, 2000]);
  assert.deepEqual(dollars('Most land between $7,000 and $11,000'), [7000, 11000]);
  assert.deepEqual(dollars('No edits included; changes at $85 an hour'), [85]);
  assert.deepEqual(dollars('Typically $12,000 and up'), [12000]);
});

test('dollars returns an empty list when there is no price', () => {
  assert.deepEqual(dollars('Year one hosting included'), []);
});
