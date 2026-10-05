import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  REEL,
  REEL_START_ID,
  SHEET,
  PLACEHOLDER_CLIPS,
  gateReel,
  reelClips,
  gateSheet,
  splitVoice,
  type StudyGate,
} from './homeWork.ts';

const study = (id: string, over: Partial<StudyGate> = {}): StudyGate => ({
  id,
  featured: true,
  launchStatus: 'live',
  ...over,
});

test('with no CMS rows, every curated slide and job stands, without case-study links', () => {
  assert.deepEqual(gateReel(REEL, []), REEL);
  const jobs = gateSheet(SHEET, []);
  assert.equal(jobs.length, SHEET.length);
  for (const j of jobs) assert.equal(j.caseStudyHref, undefined);
});

test('the reel opens on Stone Steps with FBCM second, then FRT, Theology Matters and MAS', () => {
  const start = REEL.findIndex((s) => s.id === REEL_START_ID);
  assert.equal(REEL[start].study, 'stone-steps-50k');
  const right = [...new Set(REEL.slice(start + 1).map((s) => s.study))];
  assert.deepEqual(right, [
    'first-baptist-muncie',
    'foundation-for-reformed-theology',
    'theology-matters',
    'mas-monograms',
  ]);
  assert.equal(REEL[start + 1].id, 'fbcm-home');
});

test('a study that is not live drops its slides and its job (the honesty rule)', () => {
  for (const status of ['in-progress', 'built-not-launched', 'launching-soon'] as const) {
    const studies = [study('theology-matters', { launchStatus: status })];
    assert.ok(gateReel(REEL, studies).every((s) => s.study !== 'theology-matters'));
    assert.ok(gateSheet(SHEET, studies).every((j) => j.study !== 'theology-matters'));
  }
});

test('a launching-soon slide needs its study to be launching soon, and is never linked', () => {
  const soon = REEL.filter((s) => s.soon);
  assert.ok(soon.length > 0);
  for (const s of soon) assert.equal(s.url, undefined);
  const fbcm = (launchStatus: StudyGate['launchStatus']) =>
    gateReel(REEL, [study('first-baptist-muncie', { launchStatus, featured: false })]).filter(
      (s) => s.study === 'first-baptist-muncie',
    ).length;
  assert.equal(fbcm('launching-soon'), soon.length);
  assert.equal(fbcm('live'), 0);
  assert.equal(fbcm('in-progress'), 0);
});

test('the proof sheet needs featured; a featured live study gets its case-study link', () => {
  const off = gateSheet(SHEET, [study('mas-monograms', { featured: false })]);
  assert.ok(off.every((j) => j.study !== 'mas-monograms'));
  const on = gateSheet(SHEET, [study('mas-monograms')]);
  assert.equal(on.find((j) => j.study === 'mas-monograms')?.caseStudyHref, '/work/mas-monograms/');
});

test('every curated picture exists in src/assets/home', () => {
  const dir = join(process.cwd(), 'src', 'assets', 'home');
  const reel = new Set(readdirSync(join(dir, 'reel')));
  for (const s of REEL) {
    assert.ok(reel.has(`${s.id}-d.webp`), `${s.id}-d.webp`);
    assert.ok(reel.has(`${s.id}-m.webp`), `${s.id}-m.webp`);
  }
  const sheet = new Set(readdirSync(join(dir, 'sheet')));
  for (const j of SHEET) for (const f of j.frames) assert.ok(sheet.has(`${f.img}.webp`), f.img);
});

test('the proof sheet adds to the reel instead of repeating it', () => {
  // The lead's first frame is the live one (the course map clip), and only the lead moves.
  const live = SHEET.flatMap((j, i) => j.frames.filter((f) => f.clip).map(() => i));
  assert.deepEqual(live, [0]);
  assert.match(SHEET[0].frames[0].clip ?? '', /^\/reel\/stone-steps-50k\/.+\.webm$/);
  // No sheet picture is a reel picture, and no sheet fact repeats a reel caption.
  const reelIds = new Set(REEL.map((s) => s.id));
  const reelFacts = new Set(REEL.map((s) => s.fact));
  for (const j of SHEET) {
    for (const f of j.frames) assert.ok(!reelIds.has(f.img), f.img);
    assert.ok(!reelFacts.has(j.fact), j.fact);
    assert.ok(!reelFacts.has(j.note), j.note);
  }
});

test('film edge print is short enough to read whole on a phone', () => {
  // About 20 characters fit the rebate of a 390 px strip at the edge-print size; the edge
  // wraps rather than clipping, but a single fact must never be wider than the strip.
  for (const j of SHEET) for (const e of j.edge) assert.ok(e.length <= 34, e);
});

test('no curated copy carries an em-dash', () => {
  const words = JSON.stringify([REEL, SHEET]);
  assert.ok(!words.includes('—'));
});

test('splitVoice turns a headline into caps and the italic voice', () => {
  assert.deepEqual(splitVoice('The proof sheet. Every one is live today.'), {
    lead: 'The proof sheet.',
    voice: 'Every one is live today.',
  });
  assert.deepEqual(splitVoice('What it costs, before you ask.'), {
    lead: 'What it costs,',
    voice: 'before you ask.',
  });
  assert.deepEqual(splitVoice("Let's build a site you won't have to redo."), {
    lead: "Let's build a site you",
    voice: "won't have to redo.",
  });
  assert.deepEqual(splitVoice('What it costs'), { lead: 'What it costs', voice: '' });
});

test('reelClips: no manifest means the placeholder; a manifest is read and checked', () => {
  assert.deepEqual(reelClips(undefined), PLACEHOLDER_CLIPS);
  assert.deepEqual(reelClips({}), {});
  assert.deepEqual(reelClips(null), {});
  const clips = reelClips({
    clips: {
      'ss-home': {
        d: {
          webm: '/reel/home/ss-home-d.webm',
          poster: '/reel/home/ss-home-d.webp',
          w: 1600,
          h: 1000,
        },
        m: { webm: 'https://elsewhere.example/x.webm' },
      },
      'tm-home': { d: { poster: '/reel/home/tm.webp' } },
      'frt-home': 'nonsense',
    },
  });
  // A clip must be a same-origin WebM under /reel/; anything else is dropped, so a bad
  // manifest only means stills.
  assert.deepEqual(Object.keys(clips), ['ss-home']);
  assert.equal(clips['ss-home'].d?.webm, '/reel/home/ss-home-d.webm');
  assert.equal(clips['ss-home'].m, undefined);
});

test('every placeholder clip names a real reel slide and a file on disk', () => {
  const ids = new Set(REEL.map((s) => s.id));
  for (const [id, pair] of Object.entries(PLACEHOLDER_CLIPS)) {
    assert.ok(ids.has(id), id);
    for (const c of [pair.d, pair.m])
      if (c) assert.ok(existsSync(join(process.cwd(), 'public', c.webm)), c.webm);
  }
});
