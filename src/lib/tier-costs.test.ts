import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webTiers } from '../data/pricing.ts';
import { careOver, carePerYear, costOver, hostingOnlyFiveYears, tierCosts } from './tier-costs.ts';

test('a monthly plan is twelve months, a yearly plan is one year', () => {
  assert.equal(carePerYear({ price: '$69', period: '/mo' }), 828);
  assert.equal(carePerYear({ price: '$180', period: '/yr' }), 180);
});

test('year one Hosting is included, so Hosting starts in year two', () => {
  assert.equal(costOver(5000, 200, 1), 5000);
  assert.equal(costOver(5000, 200, 3), 5400);
  assert.equal(costOver(5000, 200, 5), 5800);
});

test('care is an add-on from the first month, with Hosting still paid from year two', () => {
  assert.equal(careOver(5000, 828, 200, 1), 5828);
  assert.equal(careOver(5000, 828, 200, 3), 7884);
  assert.equal(careOver(5000, 828, 200, 5), 9940);
});

test('the three published rows', () => {
  const rows = tierCosts().map((r) => [
    r.tier.name,
    r.plan.name,
    r.yearOne,
    r.threeYears,
    r.fiveYears,
  ]);
  assert.deepEqual(rows, [
    ['Launch', 'Light Care', 4208, 6024, 7840],
    ['Signature', 'Care', 8048, 11544, 15040],
    ['Flagship', 'Care+', 15608, 22224, 28840],
  ]);
});

test('Launch on Hosting alone for five years', () => {
  assert.equal(hostingOnlyFiveYears(webTiers[0]), 4300);
});

test('every tier also has its sums on Hosting alone', () => {
  const rows = tierCosts().map((r) => [
    r.tier.name,
    r.hostingPlan.name,
    r.hostingOnly.yearOne,
    r.hostingOnly.threeYears,
    r.hostingOnly.fiveYears,
  ]);
  assert.deepEqual(rows, [
    ['Launch', 'Hosting', 3500, 3900, 4300],
    ['Signature', 'Hosting', 6500, 6900, 7300],
    ['Flagship', 'Hosting', 12500, 12900, 13300],
  ]);
});
