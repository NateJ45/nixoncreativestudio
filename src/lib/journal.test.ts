import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changesProblem, clusterChips, clusterLabel, newestFirst, tocItems } from './journal.ts';

const post = (id: string, day: number, cluster?: string) => ({
  id,
  data: { published: new Date(Date.UTC(2026, 10, day)), cluster },
});

test('newestFirst sorts by date, then by slug on the same day', () => {
  const out = newestFirst([post('b', 10), post('a', 10), post('c', 12)]);
  assert.deepEqual(
    out.map((p) => p.id),
    ['c', 'a', 'b'],
  );
});

test('clusterChips lists All plus only the clusters that have posts', () => {
  const chips = clusterChips([post('a', 1, 'lab'), post('b', 2, 'lab'), post('c', 3, 'costs')]);
  assert.deepEqual(chips, [
    { key: 'all', label: 'All', n: 3 },
    { key: 'costs', label: 'Costs', n: 1 },
    { key: 'lab', label: 'Built in the lab', n: 2 },
  ]);
});

test('clusterLabel names a cluster and is empty for none', () => {
  assert.equal(clusterLabel('lab'), 'Built in the lab');
  assert.equal(clusterLabel(undefined), '');
});

test('tocItems keeps the ## headings only', () => {
  assert.deepEqual(
    tocItems([
      { depth: 2, slug: 'a', text: 'A' },
      { depth: 3, slug: 'b', text: 'B' },
      { depth: 2, slug: 'c', text: 'C' },
    ]),
    [
      { slug: 'a', text: 'A' },
      { slug: 'c', text: 'C' },
    ],
  );
});

test('changes and updated come as a pair', () => {
  assert.equal(changesProblem({}), '');
  assert.equal(changesProblem({ updated: new Date(), changes: 'New prices' }), '');
  assert.match(changesProblem({ changes: 'x' }), /updated is not/);
  assert.match(changesProblem({ updated: new Date() }), /changes is not/);
});
