import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carePlans, webTiers } from '../data/pricing.ts';
import { dollars } from './money.ts';
import { receipt, usd, yearsWord } from './receipt.ts';
import { carePerYear, costRows } from './tier-costs.ts';

const hosting = carePlans.find((p) => p.name === 'Hosting')!;
const hostingPerYear = carePerYear(hosting);
// The receipt takes a monthly care price; Hosting alone is 0.
const perMonth = (name: string) =>
  name === 'Hosting' ? 0 : dollars(carePlans.find((p) => p.name === name)!.price)[0];

test('the receipt agrees with every row of the cost table, at 1, 3 and 5 years', () => {
  for (const tier of webTiers) {
    for (const row of costRows(tier)) {
      const at = (years: number) =>
        receipt({
          build: tier.priceFrom,
          hostingPerYear,
          carePerMonth: perMonth(row.plan.name),
          years,
        });
      const label = `${tier.name} with ${row.plan.name}`;
      assert.equal(at(1).total, row.yearOne, `${label}, year one`);
      assert.equal(at(3).total, row.threeYears, `${label}, 3 years`);
      assert.equal(at(5).total, row.fiveYears, `${label}, 5 years`);
      // The five-year lines are the cost bar's three parts.
      assert.deepEqual(
        { build: at(5).build, hosting: at(5).hosting, care: at(5).care },
        row.parts,
        `${label}, parts`,
      );
    }
  }
});

test('year one Hosting is included, and care runs every month from launch (worked by hand)', () => {
  // $6,500 build, $200 Hosting from year two, $129 a month of care for two years.
  const r = receipt({ build: 6500, hostingPerYear: 200, carePerMonth: 129, years: 2 });
  assert.equal(r.hostingYears, 1);
  assert.equal(r.hosting, 200);
  assert.equal(r.careMonths, 24);
  assert.equal(r.care, 3096);
  assert.equal(r.total, 9796);
  // One year on Hosting alone is just the build.
  assert.equal(
    receipt({ build: 3500, hostingPerYear: 200, carePerMonth: 0, years: 1 }).total,
    3500,
  );
});

test('years are held to 1 to 5', () => {
  assert.equal(receipt({ build: 1, hostingPerYear: 1, carePerMonth: 0, years: 9 }).hostingYears, 4);
  assert.equal(receipt({ build: 1, hostingPerYear: 1, carePerMonth: 0, years: 0 }).hostingYears, 0);
});

test('money and years read the way the page prints them', () => {
  assert.equal(usd(15040), '$15,040');
  assert.equal(yearsWord(1), '1 year');
  assert.equal(yearsWord(4), '4 years');
});
