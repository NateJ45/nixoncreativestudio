import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arrangeWork, prettyDomain, sectorLabel, sectorLine, type WorkItem } from './workIndex.ts';

const d = (s: string) => new Date(s);
const items: WorkItem[] = [
  {
    id: 'mas',
    sector: 'small-business',
    launchStatus: 'live',
    heroOrder: 3,
    published: d('2026-05-01'),
  },
  {
    id: 'stone',
    sector: 'nonprofit',
    launchStatus: 'live',
    heroOrder: 1,
    published: d('2026-01-01'),
  },
  { id: 'frt', sector: 'nonprofit', launchStatus: 'live', published: d('2026-08-01') },
  { id: 'orb', sector: 'church', launchStatus: 'live', published: d('2023-01-01') },
  { id: 'spc', sector: 'church', launchStatus: 'built-not-launched', published: d('2026-02-01') },
  { id: 'pa', sector: 'school', launchStatus: 'in-progress', published: d('2026-03-01') },
  { id: 'fbcm', sector: 'church', launchStatus: 'launching-soon', published: d('2023-02-01') },
];

test('the lead is the live study with the lowest scene order', () => {
  const { lead, live, also } = arrangeWork(items);
  assert.equal(lead?.id, 'stone');
  // Scene order first, then the newest of the rest.
  assert.deepEqual(
    live.map((e) => e.id),
    ['mas', 'frt', 'orb'],
  );
  // Nothing that is not live is ever in the live groups.
  assert.deepEqual(
    also.map((e) => e.id),
    ['fbcm', 'pa', 'spc'],
  );
});

test('with no live study there is no lead and everything is in the strip', () => {
  const { lead, live, also } = arrangeWork(items.filter((e) => e.launchStatus !== 'live'));
  assert.equal(lead, undefined);
  assert.equal(live.length, 0);
  assert.equal(also.length, 3);
});

test('the sector line counts real entries and says nothing for a sector of one', () => {
  assert.equal(sectorLine(items, 'church'), 'This is one of three church sites I have built.');
  assert.equal(sectorLine(items, 'school'), undefined);
  assert.equal(sectorLine(items, 'unknown'), undefined);
});

test('labels and domains', () => {
  assert.equal(sectorLabel('small-business'), 'Small business');
  assert.equal(prettyDomain('https://www.reiddesignllc.com/'), 'reiddesignllc.com');
  assert.equal(
    prettyDomain('https://fbcm-site.nathanjnixon86.workers.dev/'),
    'fbcm-site.nathanjnixon86.workers.dev',
  );
});
