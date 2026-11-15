import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import {
  changesProblem,
  clusterChips,
  clusterLabel,
  newestFirst,
  railDays,
  splitHighlight,
  tocItems,
} from './journal.ts';

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

test('railDays shows a day once, with its posts in deck order', () => {
  const d = (n: number) => new Date(Date.UTC(2026, 10, n));
  const days = railDays([
    { id: 'a', day: '2026-11-12', date: d(12) },
    { id: 'b', day: '2026-11-10', date: d(10) },
    { id: 'c', day: '2026-11-10', date: d(10) },
  ]);
  assert.deepEqual(
    days.map((x) => [x.day, x.posts.map((p) => p.id)]),
    [
      ['2026-11-12', ['a']],
      ['2026-11-10', ['b', 'c']],
    ],
  );
});

test('splitHighlight cuts the short answer round its phrase, and names a phrase that is not there', () => {
  assert.deepEqual(splitHighlight('One. Two three. Four.', 'Two three.'), {
    before: 'One. ',
    mark: 'Two three.',
    after: ' Four.',
    problem: '',
  });
  assert.equal(splitHighlight('One.', undefined).mark, '');
  assert.match(splitHighlight('One.', 'Two').problem, /not in shortAnswer/);
});

test('every post that names a highlight copied it exactly from its short answer', () => {
  const dir = new URL('../content/journal/', import.meta.url);
  let seen = 0;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.mdx'))) {
    const src = readFileSync(new URL(f, dir), 'utf8');
    const field = (name: string) => {
      const m = new RegExp('^' + name + ': (.*)$', 'm').exec(src);
      if (!m) return undefined;
      const raw = m[1].trim();
      // YAML: a single-quoted scalar doubles its quotes, a double-quoted one reads like JSON.
      return raw.startsWith("'") ? raw.slice(1, -1).replace(/''/g, "'") : JSON.parse(raw);
    };
    const hl = field('highlight');
    if (!hl) continue;
    seen++;
    assert.equal(splitHighlight(field('shortAnswer'), hl).problem, '', f);
  }
  assert.ok(seen > 0, 'no post names a highlight');
});
