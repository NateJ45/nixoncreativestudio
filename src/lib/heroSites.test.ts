import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hostOf,
  mediaUrl,
  resizedImage,
  resizedUrl,
  selectHeroStudies,
  type HeroCandidate,
} from './heroSites.ts';

// The hero device scene is built from case studies (CMS-DESIGN PR 13). These tests pin which
// entries qualify, their order, and the width-only resizer URLs (the 4096 px limit).

const img = (id: string, width = 1425, height = 6350, storageKey = `${id}.png`) =>
  ({ id, provider: 'local', width, height, meta: { storageKey } }) as never;

const study = (over: Partial<HeroCandidate> & { id: string }): HeroCandidate => ({
  published: new Date('2026-01-01'),
  liveUrl: `https://www.${over.id}.org/`,
  inHero: true,
  showcaseDesktop: img(`${over.id}-d`),
  showcaseMobile: img(`${over.id}-m`, 545, 4000),
  ...over,
});

test('hostOf: hostname without www, undefined for anything that is not a URL', () => {
  assert.equal(hostOf('https://www.secondpreschicago.org'), 'secondpreschicago.org');
  assert.equal(hostOf('https://theologymatters.com/path?x=1'), 'theologymatters.com');
  assert.equal(hostOf('https://mas-monograms.com'), 'mas-monograms.com');
  assert.equal(hostOf('not a url'), undefined);
  assert.equal(hostOf(''), undefined);
  assert.equal(hostOf(undefined), undefined);
});

test('only in_hero entries with BOTH captures and a live URL qualify', () => {
  const picked = selectHeroStudies([
    study({ id: 'yes', heroOrder: 1 }),
    study({ id: 'not-ticked', inHero: false, heroOrder: 2 }),
    study({ id: 'no-mobile', showcaseMobile: undefined, heroOrder: 3 }),
    study({ id: 'no-desktop', showcaseDesktop: undefined, heroOrder: 4 }),
    study({ id: 'no-url', liveUrl: undefined, heroOrder: 5 }),
    study({ id: 'bad-url', liveUrl: 'nope', heroOrder: 6 }),
  ]);
  assert.deepEqual(
    picked.map((s) => s.id),
    ['yes'],
  );
  assert.equal(picked[0].host, 'yes.org');
});

test('ordered by hero_order, unnumbered last, ties newest project first then by slug', () => {
  const picked = selectHeroStudies([
    study({ id: 'c', heroOrder: 3 }),
    study({ id: 'unnumbered-old', published: new Date('2020-01-01') }),
    study({ id: 'a', heroOrder: 1 }),
    study({ id: 'unnumbered-new', published: new Date('2026-06-01') }),
    study({ id: 'tie-b', heroOrder: 2, published: new Date('2025-01-01') }),
    study({ id: 'tie-a', heroOrder: 2, published: new Date('2025-01-01') }),
    study({ id: 'tie-newer', heroOrder: 2, published: new Date('2026-01-01') }),
  ]);
  assert.deepEqual(
    picked.map((s) => s.id),
    ['a', 'tie-newer', 'tie-a', 'tie-b', 'c', 'unnumbered-new', 'unnumbered-old'],
  );
});

test('nothing qualifying is an empty list: the caller falls back to the bundled scene', () => {
  assert.deepEqual(selectHeroStudies([]), []);
  // The state of production before the PR 13 load: no entry has the field.
  assert.deepEqual(
    selectHeroStudies([
      study({ id: 'old-1', inHero: false }),
      study({ id: 'old-2', inHero: false, heroOrder: undefined }),
    ]),
    [],
  );
});

test('the input list is not reordered or mutated', () => {
  const input = [study({ id: 'b', heroOrder: 2 }), study({ id: 'a', heroOrder: 1 })];
  selectHeroStudies(input);
  assert.deepEqual(
    input.map((s) => s.id),
    ['b', 'a'],
  );
});

test('mediaUrl uses the storage key, then the id, on the given origin', () => {
  assert.equal(
    mediaUrl(img('ID1', 10, 10, 'KEY1.png'), 'https://ncs-ci.example.dev'),
    'https://ncs-ci.example.dev/_emdash/api/media/file/KEY1.png',
  );
  assert.equal(
    mediaUrl({ id: 'ID2' } as never, 'https://x.test'),
    'https://x.test/_emdash/api/media/file/ID2',
  );
  assert.equal(mediaUrl({} as never, 'https://x.test'), '');
});

test('resizedUrl is width-only: never a height (the 4096 px resizer limit)', () => {
  const url = resizedUrl('https://x.test/_emdash/api/media/file/K.png', 900);
  assert.equal(
    url,
    '/_image?href=https%3A%2F%2Fx.test%2F_emdash%2Fapi%2Fmedia%2Ffile%2FK.png&w=900&f=webp',
  );
  assert.ok(!/[?&]h=/.test(url));
});

test('resizedImage builds a sorted srcset, the widest as src, and keeps the intrinsic size', () => {
  const out = resizedImage(img('D', 1425, 6350, 'D.png'), 'https://x.test', [1200, 600, 900, 1440]);
  assert.ok(out);
  assert.deepEqual(
    out.srcset.split(', ').map((c) => c.split(' ')[1]),
    ['600w', '900w', '1200w', '1440w'],
  );
  assert.match(out.src, /&w=1440&f=webp$/);
  assert.equal(out.width, 1425);
  assert.equal(out.height, 6350);
  assert.ok(!/[?&]h=/.test(out.srcset));
  assert.equal(resizedImage({} as never, 'https://x.test', [600]), undefined);
  assert.equal(resizedImage(img('D'), 'https://x.test', []), undefined);
});
