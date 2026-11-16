import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  eventLabel,
  MAX_EVENTS,
  nextVisit,
  pushEvent,
  scrollPercent,
  shouldRun,
  VISIT_GAP_MS,
} from './trail.ts';

const ID = '11111111-2222-4333-8444-555555555555';
const OTHER = '99999999-2222-4333-8444-555555555555';
const base = {
  host: 'nixoncreativestudio.com',
  siteHost: 'nixoncreativestudio.com',
  webdriver: false,
  userAgent: 'Mozilla/5.0 (iPhone) Safari/605',
  optedOut: false,
  forced: false,
};

test('shouldRun: production hosts only, never automated or opted out', () => {
  assert.equal(shouldRun(base), true);
  assert.equal(shouldRun({ ...base, host: 'www.nixoncreativestudio.com' }), true);
  assert.equal(shouldRun({ ...base, host: 'localhost' }), false);
  assert.equal(shouldRun({ ...base, webdriver: true }), false);
  assert.equal(shouldRun({ ...base, userAgent: 'HeadlessChrome/130' }), false);
  assert.equal(shouldRun({ ...base, optedOut: true }), false);
  assert.equal(shouldRun({ ...base, siteHost: '' }), false);
  assert.equal(shouldRun({ ...base, host: 'localhost', webdriver: true, forced: true }), true);
});

test('nextVisit continues within 30 minutes and starts fresh after', () => {
  const kept = nextVisit({ id: ID, n: 2, last: 1000 }, 1000 + VISIT_GAP_MS - 1, () => OTHER);
  assert.deepEqual(kept, { visit: { id: ID, n: 3, last: 1000 + VISIT_GAP_MS - 1 }, fresh: false });
  const fresh = nextVisit({ id: ID, n: 2, last: 1000 }, 1000 + VISIT_GAP_MS, () => OTHER);
  assert.equal(fresh.fresh, true);
  assert.equal(fresh.visit.id, OTHER);
  assert.equal(nextVisit(null, 5, () => OTHER).visit.n, 1);
  assert.equal(nextVisit({ id: 'junk', n: 4, last: 5 }, 6, () => OTHER).fresh, true);
});

test('scrollPercent clamps and treats a short page as fully seen', () => {
  assert.equal(scrollPercent(0, 800, 600), 100);
  assert.equal(scrollPercent(0, 800, 3200), 25);
  assert.equal(scrollPercent(2400, 800, 3200), 100);
  assert.equal(scrollPercent(9999, 800, 3200), 100);
});

test('eventLabel turns GA4 events into short trail labels', () => {
  assert.equal(eventLabel('tool_use', { tool_name: 'tier_picker' }), 'tool:tier_picker');
  assert.equal(eventLabel('inquiry_step', { step_name: 'budget' }), 'form:budget');
  assert.equal(eventLabel('pricing_view', {}), 'prices_seen:block');
  assert.equal(eventLabel('generate_lead'), 'form:sent');
  assert.equal(eventLabel('something_new'), 'something_new');
});

test('pushEvent skips repeats, blanks and a full page', () => {
  const list: string[] = [];
  pushEvent(list, 'click:  Open   FAQ ');
  pushEvent(list, 'click: Open FAQ');
  pushEvent(list, '   ');
  assert.deepEqual(list, ['click: Open FAQ']);
  for (let i = 0; i < MAX_EVENTS + 5; i++) pushEvent(list, `e${i}`);
  assert.equal(list.length, MAX_EVENTS);
});
