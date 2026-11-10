import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carePlans } from '../data/pricing.ts';
import { replyOrder, replyPromise } from './reply-order.ts';

test('every care add-on promises a reply time the page can read, and Hosting promises none', () => {
  for (const plan of carePlans) {
    const p = replyPromise(plan);
    if (plan.addOn) {
      assert.notEqual(p.days, null, `${plan.name}: no reply time found in "${plan.support}"`);
      // The sentence shown is the plan's own, word for word.
      assert.ok(plan.support.startsWith(p.says) && p.says.length > 0, plan.name);
    } else {
      assert.deepEqual(p, { days: null, says: '' }, plan.name);
    }
  }
});

test('the order is soonest reply first, with the plan that promises no time last', () => {
  const rows = replyOrder(carePlans);
  assert.deepEqual(
    rows.map((r) => r.plan.name),
    ['Care+', 'Care', 'Light Care', 'Hosting'],
  );
  assert.deepEqual(
    rows.map((r) => r.says),
    [
      'Same business day replies.',
      'Next business day replies.',
      'Email replies within 2 business days.',
      '',
    ],
  );
});

test('a reworded line with no time in it is not guessed at', () => {
  assert.deepEqual(replyPromise({ support: 'I reply as soon as I can. Fixes are free.' }), {
    days: null,
    says: '',
  });
  assert.deepEqual(replyPromise({ support: 'Replies within 1 business day.' }), {
    days: 1,
    says: 'Replies within 1 business day.',
  });
});
