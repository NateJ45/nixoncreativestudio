import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const assets = new URL('../../public/assets/', import.meta.url);
const versions = JSON.parse(
  readFileSync(new URL('../data/footage-versions.json', import.meta.url), 'utf8'),
) as Record<string, string>;

test('every clip in public/assets has its current hash in footage-versions.json', () => {
  const clips = readdirSync(assets)
    .filter((n) => n.endsWith('.mp4'))
    .sort();
  assert.ok(clips.length > 0);
  assert.deepEqual(Object.keys(versions).sort(), clips, 'run npm run footage:stamp');
  for (const name of clips) {
    const hash = createHash('sha1')
      .update(readFileSync(new URL(name, assets)))
      .digest('hex');
    assert.equal(versions[name], hash.slice(0, 8), `${name} changed: run npm run footage:stamp`);
  }
});
