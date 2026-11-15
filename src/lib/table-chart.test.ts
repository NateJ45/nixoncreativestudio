import { test } from 'node:test';
import assert from 'node:assert/strict';
import { amount, cellText, tableChart } from './table-chart.ts';

const table = `<table><thead><tr><th>Option</th><th>Up front</th><th>5-year total</th></tr></thead>
<tbody><tr><td>Wix Light (yearly)</td><td>$0</td><td>$1,066</td></tr>
<tr><td>Launch + Hosting (me)</td><td>$3,500</td><td>$4,300</td></tr>
<tr><td>Signature &amp; Care</td><td>$6,500</td><td><strong>$15,040</strong></td></tr></tbody></table>`;

test('amount reads a plain price and nothing else', () => {
  assert.equal(amount('$1,066'), 1066);
  assert.equal(amount('$213.24'), 213.24);
  assert.equal(amount('0'), 0);
  assert.ok(Number.isNaN(amount('$200 from year two')));
  assert.ok(Number.isNaN(amount('$19 to $29')));
  assert.ok(Number.isNaN(amount('Not published')));
});

test('cellText strips tags and puts entities back', () => {
  assert.equal(cellText(' <strong>Signature &amp; Care</strong> '), 'Signature & Care');
});

test('tableChart reads the named column and scales to the largest', () => {
  const c = tableChart(table, '5-year total');
  assert.equal(c.labelHead, 'Option');
  assert.equal(c.valueHead, '5-year total');
  assert.deepEqual(
    c.rows.map((r) => [r.label, r.text, r.value]),
    [
      ['Wix Light (yearly)', '$1,066', 1066],
      ['Launch + Hosting (me)', '$4,300', 4300],
      ['Signature & Care', '$15,040', 15040],
    ],
  );
  assert.equal(c.rows[2].pct, 100);
  assert.equal(c.rows[0].pct, 7.09);
});

test('tableChart uses the last column when none is named', () => {
  assert.equal(tableChart(table).valueHead, '5-year total');
});

test('tableChart refuses a column it cannot chart honestly', () => {
  assert.throws(() => tableChart('<p>no table</p>'), /no table/);
  assert.throws(() => tableChart(table, 'Monthly'), /no column/);
  const mixed = table.replace('$4,300', '$4,300 or so');
  assert.throws(() => tableChart(mixed, '5-year total'), /not a plain amount/);
});
