import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IMAGE_PATH, LOGO_PATH, buildOrganizationSchema } from './structuredData.ts';
import { SITE_URL, normalizeSite } from '../data/site.ts';

const settings = JSON.parse(
  readFileSync(join(process.cwd(), 'cms/content/site_settings.json'), 'utf8'),
).data;

test('the organization schema carries a real logo, image, price range and the Cincinnati geo', () => {
  const org = buildOrganizationSchema(normalizeSite(settings));
  assert.deepEqual(org['@type'], ['Organization', 'LocalBusiness']);
  assert.equal(org['@id'], `${SITE_URL}#organization`);
  assert.equal(org.logo, `${SITE_URL}/brand/logo-navy.png`);
  assert.equal(org.image, `${SITE_URL}/og-default.png`);
  assert.equal(org.priceRange, 'From $900');
  assert.deepEqual(org.geo, { '@type': 'GeoCoordinates', latitude: 39.1031, longitude: -84.512 });
  assert.equal((org.address as { addressLocality: string }).addressLocality, 'Cincinnati');
});

test('both images exist in public/, so the URLs never 404', () => {
  for (const p of [LOGO_PATH, IMAGE_PATH]) {
    assert.ok(existsSync(join(process.cwd(), 'public', p)), `public${p}`);
  }
});

test('an empty price range is left out rather than published blank (optional field)', () => {
  const org = buildOrganizationSchema(normalizeSite({ ...settings, price_range: '' }));
  assert.equal('priceRange' in org, false);
  const old = { ...settings };
  delete old.price_range; // an entry saved before the field existed
  assert.equal('priceRange' in buildOrganizationSchema(normalizeSite(old)), false);
});

test('the published price range agrees with the lowest published floor', () => {
  const read = (n: string) =>
    JSON.parse(readFileSync(join(process.cwd(), 'cms/content', `${n}.json`), 'utf8')) as {
      data: { price_from?: number };
    }[];
  const floors = [...read('service_offerings'), ...read('pricing_tiers')]
    .map((e) => e.data.price_from)
    .filter((n): n is number => typeof n === 'number' && n > 0);
  const lowest = Math.min(...floors);
  assert.equal(settings.price_range, `From $${lowest.toLocaleString('en-US')}`);
});
