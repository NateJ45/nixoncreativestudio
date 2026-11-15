import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  actionWords,
  buildProfile,
  duration,
  profileFacts,
  sourceWords,
  type TrailPageRow,
} from './visitor-profile.ts';

const VID = '11111111-2222-4333-8444-555555555555';
const row = (over: Partial<TrailPageRow>): TrailPageRow => ({
  visit_id: 'a',
  page_index: 1,
  started_at: '2026-11-01T15:00:00Z',
  path: '/',
  title: 'Home',
  visit_source: null,
  engaged_ms: 10_000,
  scroll_pct: 50,
  events: null,
  city: 'Cincinnati',
  region: 'Ohio',
  device: 'iPhone, Safari',
  ...over,
});

const rows = [
  row({ visit_source: 'search-google' }),
  row({
    page_index: 2,
    started_at: '2026-11-01T15:01:00Z',
    path: '/services/',
    title: 'Prices',
    engaged_ms: 120_000,
    scroll_pct: 90,
    events: JSON.stringify(['tool:tier_picker', 'search:church cost', 'prices_seen:full']),
  }),
  row({
    visit_id: 'b',
    started_at: '2026-11-10T14:00:00Z',
    path: '/services/',
    title: 'Prices',
    visit_source: 'social-instagram',
    engaged_ms: 60_000,
    scroll_pct: 100,
    events: JSON.stringify(['search:church cost', 'click:How long does a site take?']),
    device: 'Windows, Chrome',
  }),
  row({
    visit_id: 'b',
    page_index: 2,
    started_at: '2026-11-10T14:02:00Z',
    path: '/contact/',
    engaged_ms: 200_000,
    events: JSON.stringify(['form:budget', 'form:sent']),
  }),
];

test('buildProfile groups visits and ranks pages by time', () => {
  const p = buildProfile(VID, rows);
  assert.ok(p);
  assert.equal(p.visits.length, 2);
  assert.equal(p.visits[0].source, 'search-google');
  assert.equal(p.visits[1].source, 'social-instagram');
  assert.equal(p.pageViews, 4);
  assert.equal(p.totalSeconds, 390);
  assert.equal(p.topPages[0].path, '/contact/');
  assert.deepEqual(p.topPages[1], {
    path: '/services/',
    title: 'Prices',
    seconds: 180,
    views: 2,
    scroll: 100,
  });
  assert.deepEqual(p.searches, ['church cost']);
  assert.deepEqual(p.actions, [
    'used the tier picker',
    'read the full prices',
    'opened "How long does a site take?"',
  ]);
  assert.deepEqual(p.devices, ['iPhone, Safari', 'Windows, Chrome']);
  assert.deepEqual(p.places, ['Cincinnati, Ohio']);
  assert.equal(buildProfile(VID, []), null);
});

test('profileFacts reads like a person wrote it', () => {
  const p = buildProfile(VID, rows)!;
  const facts = Object.fromEntries(
    profileFacts(p, new Date('2026-11-10T15:00:00Z'), 'America/New_York'),
  );
  assert.equal(facts['First seen'], 'Nov 1 (9 days ago), from Google search');
  assert.equal(facts['Visits'], '2 visits, 4 pages, 6 min 30 s reading');
  assert.equal(facts['Came back via'], 'Google search, Instagram');
  assert.equal(facts['Searched the site for'], '"church cost"');
});

test('words helpers', () => {
  assert.equal(duration(35), '35 s');
  assert.equal(duration(65), '1 min');
  assert.equal(duration(130), '2 min 10 s');
  assert.equal(duration(3720), '1 h 2 min');
  assert.equal(sourceWords('ai-chatgpt.com'), 'AI assistant (chatgpt.com)');
  assert.equal(sourceWords('referral-example.org'), 'a link on example.org');
  assert.equal(sourceWords('direct'), 'typed in or a bookmark');
  assert.equal(actionWords('contact:text'), 'tapped Text');
});
