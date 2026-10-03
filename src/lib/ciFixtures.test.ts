import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  build,
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

test('seed/seed.json and cms-rows.sql are current (run node scripts/ci-dataset/cms-fixtures.mjs)', async () => {
  const { seedText, sql } = await build();
  assert.equal(read('seed/seed.json'), seedText, 'seed/seed.json is out of date');
  assert.equal(read('scripts/ci-dataset/cms-rows.sql'), sql, 'cms-rows.sql is out of date');
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
