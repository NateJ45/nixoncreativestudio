// The three-question rule, shared by the /services picker and the dock's corner card.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QUESTIONS, pickTiers, suggestTier, whyLine } from './tier-pick.ts';

test('no suggestion until all three are answered', () => {
  assert.equal(suggestTier([]), -1);
  assert.equal(suggestTier([0, 1]), -1);
  assert.equal(suggestTier([0, -1, 2]), -1);
});

test('the largest need sets the tier, and only custom tools reach Flagship', () => {
  assert.equal(suggestTier([0, 0, 0]), 0);
  assert.equal(suggestTier([0, 0, 1]), 1);
  assert.equal(suggestTier([1, 0, 0]), 1);
  // A large site that mostly informs people tops out at Signature.
  assert.equal(suggestTier([2, 2, 0]), 1);
  assert.equal(suggestTier([2, 2, 1]), 1);
  assert.equal(suggestTier([0, 0, 2]), 2);
});

test('the Why line names the answers that decided it', () => {
  assert.equal(whyLine([0, 0, 1], 1), 'Why: you said it connects to other services.');
  assert.equal(whyLine([0, 0, 2], 2), 'Why: you said it needs custom tools.');
  assert.equal(
    whyLine([0, 0, 0], 0),
    'Why: you said it holds the essential pages, your team keeps a few pages current and it mostly informs people.',
  );
  assert.match(
    whyLine([2, 2, 0], 1),
    /Flagship is for custom tools, so Signature is the place to start\.$/,
  );
});

test('three questions, three answers each, and a Why phrase for every answer', () => {
  assert.equal(QUESTIONS.length, 3);
  for (const q of QUESTIONS) {
    assert.equal(q.options.length, 3);
    assert.equal(q.said.length, 3);
  }
  assert.deepEqual(
    QUESTIONS.map((q) => q.name),
    ['size', 'who', 'tools'],
  );
});

test('pickTiers carries the name, the starting price and the range, from the data it is given', () => {
  const out = pickTiers(
    [{ name: 'Launch', priceFrom: 3500, range: 'Usually $3,500 to $6,000' }],
    (n) => `$${n.toLocaleString('en-US')}`,
  );
  assert.deepEqual(out, [{ name: 'Launch', from: '$3,500', range: 'Usually $3,500 to $6,000.' }]);
});
