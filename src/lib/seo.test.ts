import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TITLE_MAX, fitTitle, studyTitle } from './seo.ts';

const studio = 'Nixon Creative Studio';

test('fitTitle picks the first candidate that fits', () => {
  assert.equal(fitTitle(['x'.repeat(61), 'short']), 'short');
  assert.equal(fitTitle(['fits']), 'fits');
});

test('fitTitle falls back to the last candidate when none fit', () => {
  assert.equal(fitTitle(['x'.repeat(70), 'y'.repeat(65)]), 'y'.repeat(65));
});

test('studyTitle uses the sector form when it fits', () => {
  assert.equal(
    studyTitle('Stone Steps 50K', 'nonprofit', studio),
    'Stone Steps 50K: nonprofit website | Nixon Creative Studio',
  );
});

test('studyTitle drops the sector for longer names, and keeps the studio name', () => {
  const t = studyTitle('First Baptist Church Muncie', 'church', studio);
  assert.equal(t, 'First Baptist Church Muncie website | Nixon Creative Studio');
  assert.ok(t.length <= TITLE_MAX);
});

test('studyTitle never drops the client or studio name, even over the limit', () => {
  const t = studyTitle('First Presbyterian Church of Orangeburg', 'church', studio);
  assert.equal(t, 'First Presbyterian Church of Orangeburg | Nixon Creative Studio');
});
