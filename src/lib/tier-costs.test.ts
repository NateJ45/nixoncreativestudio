import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webTiers } from '../data/pricing.ts';
import { carePerYear, costOver, hostingOnlyFiveYears, tierCosts } from './tier-costs.ts';

test('a monthly plan is twelve months, a yearly plan is one year', () => {
  assert.equal(carePerYear({ price: '$69', period: '/mo' }), 828);
  assert.equal(carePerYear({ price: '$180', period: '/yr' }), 180);
});

test('year one care is included, so care starts in year two', () => {
  assert.equal(costOver(5000, 828, 1), 5000);
  assert.equal(costOver(5000, 828, 3), 6656);
  assert.equal(costOver(5000, 828, 5), 8312);
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
    ['Launch', 'Light Care', 3500, 4916, 6332],
    ['Signature', 'Care', 6500, 9596, 12692],
    ['Flagship', 'Care+', 12500, 18716, 24932],
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
