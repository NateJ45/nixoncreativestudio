import { test } from 'node:test';
import assert from 'node:assert/strict';
import { damerauLevenshtein, segmentsOf, slugForms, suggest } from './did-you-mean.ts';

// A slice of the real route list the 404 builds (nav pages plus studies).
const routes = [
  { href: '/', label: 'Home' },
  { href: '/work/', label: 'Work' },
  { href: '/services/', label: 'Services' },
  { href: '/about/', label: 'About' },
  { href: '/contact/', label: 'Contact' },
  { href: '/colophon/', label: 'Colophon' },
  { href: '/privacy/', label: 'Privacy' },
  { href: '/work/stone-steps-50k/', label: 'Stone Steps 50K' },
  { href: '/work/first-baptist-muncie/', label: 'First Baptist Church Muncie' },
  { href: '/work/theology-matters/', label: 'Theology Matters' },
  { href: '/work/mas-monograms/', label: 'MAS Monograms' },
];

test('damerauLevenshtein counts inserts, deletes, substitutions and swaps as 1', () => {
  assert.equal(damerauLevenshtein('services', 'services'), 0);
  assert.equal(damerauLevenshtein('servics', 'services'), 1);
  assert.equal(damerauLevenshtein('sevrices', 'services'), 1); // a swap, not two edits
  assert.equal(damerauLevenshtein('abuot', 'about'), 1);
  assert.equal(damerauLevenshtein('', 'abc'), 3);
  assert.equal(damerauLevenshtein('kitten', 'sitting'), 3);
});

test('segmentsOf lowercases, decodes and drops empty parts and .html', () => {
  assert.deepEqual(segmentsOf('/Work/StoneSteps/'), ['work', 'stonesteps']);
  assert.deepEqual(segmentsOf('/about.html?x=1'), ['about']);
  assert.deepEqual(segmentsOf('/%E0%A4%A/'), ['%e0%a4%a']);
});

test('slugForms tries the whole slug, each run of pieces and the initials', () => {
  const forms = slugForms('stone-steps-50k');
  for (const f of ['stonesteps50k', 'stone', 'stonesteps', 'steps', '50k', 'ss5']) {
    assert.ok(forms.includes(f), `missing ${f}`);
  }
});

test('/work/stonesteps/ suggests Stone Steps first', () => {
  const hits = suggest('/work/stonesteps/', routes);
  assert.ok(hits.length >= 1);
  assert.equal(hits[0].href, '/work/stone-steps-50k/');
  assert.equal(hits[0].label, 'Stone Steps 50K');
});

test('a typo in a top-level page finds that page', () => {
  assert.equal(suggest('/servics/', routes)[0]?.href, '/services/');
  assert.equal(suggest('/abuot', routes)[0]?.href, '/about/');
  assert.equal(suggest('/colophone/', routes)[0]?.href, '/colophon/');
});

test('part of a slug or its initials still lands', () => {
  assert.equal(suggest('/work/theology/', routes)[0]?.href, '/work/theology-matters/');
  assert.equal(suggest('/work/muncie/', routes)[0]?.href, '/work/first-baptist-muncie/');
  assert.equal(suggest('/work/fbcm/', routes)[0]?.href, '/work/first-baptist-muncie/');
});

test('nothing close returns an empty list, so the page keeps every study', () => {
  assert.deepEqual(suggest('/pricing-calculator-2024/', routes), []);
  // A short word in a long path is not a near miss ("was" is not "mas").
  assert.deepEqual(suggest('/a-page-that-was-never-here/', routes), []);
  assert.deepEqual(suggest('/', routes), []);
});

test('never more than three suggestions', () => {
  assert.ok(suggest('/work/s/', routes).length <= 3);
});
