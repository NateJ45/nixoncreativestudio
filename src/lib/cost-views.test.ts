import { test } from 'node:test';
import assert from 'node:assert/strict';
import { money } from './money.ts';
import { tierCosts } from './tier-costs.ts';
import {
  VIEW_YEARS,
  careKey,
  costView,
  costViews,
  hostingKey,
  viewSentence,
  viewSum,
} from './cost-views.ts';

test('each view of the cost bars totals what the cost table prints in that column', () => {
  for (const c of tierCosts()) {
    const [one, three, five] = costViews(c);
    const label = `${c.tier.name} with ${c.usual.plan.name}`;
    assert.equal(one.total, c.usual.yearOne, `${label}, first year`);
    assert.equal(three.total, c.usual.threeYears, `${label}, 3 years`);
    assert.equal(five.total, c.usual.fiveYears, `${label}, 5 years`);
    for (const v of [one, three, five]) {
      assert.equal(v.build + v.hosting + v.care, v.total, `${label}, parts add up`);
    }
    // The five-year view is the bar the page has always drawn.
    assert.deepEqual(
      { build: five.build, hosting: five.hosting, care: five.care },
      c.usual.parts,
      `${label}, five-year parts`,
    );
  }
});

test('the views are the cost table columns: 1, 3 and 5 years', () => {
  assert.deepEqual([...VIEW_YEARS], [1, 3, 5]);
});

test('worked by hand: Signature with Care', () => {
  const signature = tierCosts().find((c) => c.tier.name === 'Signature')!;
  // $6,500 build, $200 Hosting for each year after the first, $129 a month of care.
  assert.deepEqual(costView(signature, 1), {
    years: 1,
    build: 6500,
    hosting: 0,
    care: 1548,
    total: 8048,
  });
  assert.deepEqual(costView(signature, 3), {
    years: 3,
    build: 6500,
    hosting: 400,
    care: 4644,
    total: 11544,
  });
});

test('the words under a bar say every part, and year one Hosting is included', () => {
  const signature = tierCosts().find((c) => c.tier.name === 'Signature')!;
  const names = { hosting: 'Hosting', plan: 'Care' };
  assert.equal(
    viewSentence(costView(signature, 1), names, money),
    'Build $6,500, Hosting included in year one, Care $1,548. Total $8,048.',
  );
  assert.equal(
    viewSentence(costView(signature, 5), names, money),
    'Build $6,500, Hosting $800, Care $7,740. Total $15,040.',
  );
  assert.equal(viewSum(costView(signature, 1), money), '$8,048 over 1 year');
  assert.equal(viewSum(costView(signature, 3), money), '$11,544 over 3 years');
});

test('the key names the years each part is billed', () => {
  assert.equal(hostingKey('Hosting', 1), 'Hosting, included in year one');
  assert.equal(hostingKey('Hosting', 3), 'Hosting, years 2 and 3');
  assert.equal(hostingKey('Hosting', 5), 'Hosting, years 2 to 5');
  assert.equal(careKey(1), 'Care plan, 1 year');
  assert.equal(careKey(5), 'Care plan, 5 years');
});
