import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  build,
  mediaSql,
  resolveImages,
  rowsSql,
  seedCollection,
  seedMenus,
  stableId,
} from '../../scripts/ci-dataset/cms-fixtures.mjs';
import * as siteSettings from '../../cms/schema/site_settings.mjs';

// The CI dataset must carry the same CMS data production will, so CI exercises
// the "read from the CMS" path (production starts empty and exercises the
// fallback; this is the other half). cms-rows.sql and the CMS part of seed.json
// are GENERATED from cms/schema and cms/content: a source edit with no
// regeneration would leave CI testing stale data, so this fails the PR.

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

test('seed/seed.json, cms-rows.sql and cms-media.json are current (run node scripts/ci-dataset/cms-fixtures.mjs)', async () => {
  const { seedText, sql, mediaText } = await build();
  assert.equal(read('seed/seed.json'), seedText, 'seed/seed.json is out of date');
  assert.equal(read('scripts/ci-dataset/cms-rows.sql'), sql, 'cms-rows.sql is out of date');
  assert.equal(
    read('scripts/ci-dataset/cms-media.json'),
    mediaText,
    'cms-media.json is out of date',
  );
});

test('repo images in an entry become media rows and EmDash image values', async () => {
  const entries = [
    {
      slug: 'about',
      data: {
        headshot: { $file: 'src/assets/brand/headshot.jpg', alt: 'Me' },
        photos: [{ image: { $file: 'src/assets/brand/headshot.jpg', alt: 'Again' }, caption: 'c' }],
      },
    },
  ];
  const { entries: out, media } = await resolveImages(entries);
  assert.equal(media.length, 1, 'a file used twice is one media row');
  const m = media[0];
  assert.match(m.storageKey, /^[0-9A-F]{26}\.jpg$/);
  assert.equal(m.mimeType, 'image/jpeg');
  assert.equal(m.width, 1200);
  assert.equal(m.height, 1200);
  const head = out[0].data.headshot;
  assert.equal(head.id, m.id);
  assert.equal(head.alt, 'Me');
  assert.equal(head.meta.storageKey, m.storageKey);
  assert.equal(out[0].data.photos[0].image.alt, 'Again', 'alt travels with each use');
  assert.equal(out[0].data.photos[0].image.id, m.id);
  assert.match(mediaSql(m), /^INSERT OR REPLACE INTO media .*'image\/jpeg'/);
  await assert.rejects(
    () => resolveImages([{ slug: 'x', data: { i: { $file: 'src/assets/nope.jpg' } } }]),
    /image not found/,
  );
});

test('every CMS image the CI dataset needs is listed in cms-media.json with a matching file', () => {
  const list = JSON.parse(read('scripts/ci-dataset/cms-media.json')) as {
    source: string;
    size: number;
    storageKey: string;
  }[];
  assert.ok(list.length >= 6, 'the headshot and five About photos');
  for (const f of list) {
    assert.equal(readFileSync(join(process.cwd(), f.source)).length, f.size, f.source);
    assert.ok(read('scripts/ci-dataset/cms-rows.sql').includes(f.storageKey), f.source);
  }
});

test('the generated seed carries the site_settings collection and both menus', () => {
  const seed = JSON.parse(read('seed/seed.json'));
  const col = seed.collections.find((c: { slug: string }) => c.slug === 'site_settings');
  assert.ok(col, 'site_settings is in the seed');
  assert.equal(col.titleField, 'studio_name');
  assert.equal(col.fields.length, siteSettings.FIELDS.length);
  const menus = Object.fromEntries(seed.menus.map((m: { name: string }) => [m.name, m]));
  assert.deepEqual(Object.keys(menus).sort(), ['footer', 'primary']);
  assert.equal(menus.primary.items[0].type, 'custom');
  assert.equal(menus.primary.items[0].titleAttr, 'Selected client projects');
});

test('seedCollection and seedMenus map the committed shapes', () => {
  const c = seedCollection(siteSettings);
  assert.equal(c.slug, 'site_settings');
  assert.equal(c.group, 'Site');
  assert.deepEqual(
    c.fields.find((f: { slug: string }) => f.slug === 'booking_url'),
    { slug: 'booking_url', label: siteSettings.FIELDS[8].label, type: 'url' },
  );
  const m = seedMenus({ x: { label: 'X', items: [{ label: 'A', url: '/a', target: '_blank' }] } });
  assert.deepEqual(m, [
    { name: 'x', label: 'X', items: [{ type: 'custom', label: 'A', url: '/a', target: '_blank' }] },
  ]);
});

test('rowsSql writes a published row with a stable id and refuses an unknown field', () => {
  const def = siteSettings;
  const lines = rowsSql(def, [{ slug: 'site', data: { studio_name: "O'Brien Studio" } }]);
  assert.match(lines[0], /^DELETE FROM ec_site_settings WHERE slug NOT IN \('site'\);$/);
  assert.match(lines[1], /'published'/);
  assert.match(lines[1], /'O''Brien Studio'/);
  assert.ok(lines[1].includes(stableId('site_settings', 'site')));
  assert.equal(stableId('site_settings', 'site'), stableId('site_settings', 'site'));
  assert.match(stableId('site_settings', 'site'), /^01CI[0-9A-F]{22}$/);
  assert.throws(() => rowsSql(def, [{ slug: 'site', data: { nope: 'x' } }]), /not a field/);
});
