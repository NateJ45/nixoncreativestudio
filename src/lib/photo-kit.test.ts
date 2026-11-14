import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { CAMERA, GIMBAL, LENSES, focalLabel, fovDeg } from '../data/photo-kit.ts';

const photo = (slug: string) => new URL(`../content/photos/${slug}.json`, import.meta.url);

test('every lens sample is a photo on the page, and not a film', () => {
  for (const l of LENSES) {
    if (!l.sample) continue;
    assert.ok(existsSync(photo(l.sample.slug)), `${l.name}: no photo ${l.sample.slug}`);
    const e = JSON.parse(readFileSync(photo(l.sample.slug), 'utf8'));
    assert.ok(!e.video, `${l.name}: ${l.sample.slug} is a film`);
    if (l.sample.at)
      assert.match(
        l.sample.at,
        /^\d+mm, f\/\d+(\.\d)?$/,
        `${l.name}: settings read like "144mm, f/3.2"`,
      );
  }
});

test('the films behind the camera and the gimbal are films on the page', () => {
  for (const slug of [CAMERA.film, GIMBAL.film]) {
    assert.ok(existsSync(photo(slug)), `no entry ${slug}`);
    assert.ok(JSON.parse(readFileSync(photo(slug), 'utf8')).video, `${slug} is not a film`);
  }
});

test('fovDeg follows the lens: wider for short focal lengths, about 40 degrees at 50mm', () => {
  assert.ok(Math.abs(fovDeg(50) - 39.6) < 0.1);
  assert.ok(Math.abs(fovDeg(16) - 96.7) < 0.1);
  assert.ok(fovDeg(200) < fovDeg(70));
});

test('focalLabel prints a zoom as a range and a prime as one number', () => {
  assert.equal(focalLabel([70, 200]), '70–200');
  assert.equal(focalLabel([35, 35]), '35');
});
