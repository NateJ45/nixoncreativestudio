// The home reel's live clips (public/reel/home/, made by scripts/brand/capture-reels.mjs):
// the manifest must match the files on disk, every clip must stay under its byte cap, and
// the clips must keep the hero stills' aspect ratios so a clip sits over its still without
// a jump (desktop 16:10, phone 1170x1464).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { REEL } from './homeWork.ts';

const PUBLIC = join(import.meta.dirname, '..', '..', 'public');
const manifest = JSON.parse(readFileSync(join(PUBLIC, 'reel', 'home', 'manifest.json'), 'utf8'));
const CAPS = { d: 260 * 1024, m: 160 * 1024 } as const;
const ASPECT = { d: 1600 / 1000, m: 1170 / 1464 } as const;
const REEL_IDS = new Set(REEL.map((s) => s.id));
const EXTRA_IDS = new Set(['rd-home']); // Reid Design: for its case study, not on the reel

interface Cut {
  webm: string;
  poster: string;
  w: number;
  h: number;
  bytes: number;
  posterBytes: number;
  duration: number;
  fps: number;
}

const entries = Object.entries(manifest.clips) as [string, Record<string, unknown>][];

test('the manifest lists the six sites, keyed by reel slide id', () => {
  assert.equal(entries.length, 6);
  for (const [id] of entries) assert.ok(REEL_IDS.has(id) || EXTRA_IDS.has(id), id);
  assert.ok(manifest.clips['ss-home'], 'Stone Steps, the reel start, has a clip');
});

for (const [id, clip] of entries) {
  for (const cut of ['d', 'm'] as const) {
    test(`${id} ${cut}: files exist, bytes match and fit the cap`, () => {
      const c = clip[cut] as Cut;
      assert.ok(c, `${id} has a ${cut} clip`);
      assert.equal(c.webm, `/reel/home/${id}-${cut}.webm`);
      assert.equal(c.poster, `/reel/home/${id}-${cut}.webp`);
      const webm = join(PUBLIC, c.webm);
      const poster = join(PUBLIC, c.poster);
      assert.ok(existsSync(webm), webm);
      assert.ok(existsSync(poster), poster);
      assert.equal(statSync(webm).size, c.bytes, 'manifest bytes are the real file size');
      assert.equal(statSync(poster).size, c.posterBytes);
      assert.ok(c.bytes <= CAPS[cut], `${c.bytes} bytes is over the ${CAPS[cut]} cap`);
      // a WebM (EBML magic) and a WebP (RIFF....WEBP)
      const head = readFileSync(webm).subarray(0, 4).toString('hex');
      assert.equal(head, '1a45dfa3');
      const p = readFileSync(poster);
      assert.equal(p.subarray(0, 4).toString(), 'RIFF');
      assert.equal(p.subarray(8, 12).toString(), 'WEBP');
    });

    test(`${id} ${cut}: shape and length`, () => {
      const c = clip[cut] as Cut;
      assert.ok(
        Math.abs(c.w / c.h - ASPECT[cut]) < 0.005,
        `${c.w}x${c.h} keeps the still's aspect`,
      );
      assert.ok(c.duration >= 6 && c.duration <= 9, `${c.duration} s loop`);
      assert.ok(c.fps === 24 || c.fps === 30);
    });
  }

  test(`${id}: says what moves and states its facts`, () => {
    assert.equal(typeof clip.site, 'string');
    assert.equal(typeof clip.moves, 'string');
    assert.ok(Array.isArray(clip.facts) && (clip.facts as string[]).length > 0);
    for (const s of [clip.moves, clip.title, ...(clip.facts as string[])] as string[])
      assert.ok(!s.includes('—'), `no em-dash: ${s}`);
  });
}
