import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  LAUNCH_STATUSES,
  gateLinks,
  isLive,
  launchStatusLabel,
  launchStatusOf,
} from './launchStatus.ts';
import { FIELDS } from '../../scripts/lib/case-studies-schema.mjs';

test('an empty or unknown launch_status reads as live (old entries keep working, rule 13)', () => {
  for (const v of [undefined, null, '', 0, 'nonsense', 1]) assert.equal(launchStatusOf(v), 'live');
  for (const s of LAUNCH_STATUSES) assert.equal(launchStatusOf(s), s);
});

test('only a live study is live, and only the others carry a label', () => {
  assert.equal(isLive('live'), true);
  assert.equal(launchStatusLabel('live'), undefined);
  assert.equal(launchStatusLabel('built-not-launched'), 'Built, not launched');
  assert.equal(launchStatusLabel('in-progress'), 'In progress');
  assert.equal(launchStatusLabel('launching-soon'), 'Launching soon');
  for (const s of LAUNCH_STATUSES.filter((x) => x !== 'live')) assert.equal(isLive(s), false);
});

test('a study that is not live loses its live link, showcase link and hero place', () => {
  const links = {
    liveUrl: 'https://secondpreschicago.org/',
    showcaseHref: 'https://secondpreschicago.org/',
    inHero: true,
  };
  assert.deepEqual(gateLinks('live', links), links);
  for (const s of ['built-not-launched', 'in-progress', 'launching-soon'] as const) {
    assert.deepEqual(gateLinks(s, links), {
      liveUrl: undefined,
      showcaseHref: undefined,
      inHero: false,
    });
  }
});

test('the schema field is optional and offers exactly the reader values', () => {
  const field = FIELDS.find((f: { slug: string }) => f.slug === 'launch_status');
  assert.ok(field, 'case_studies has a launch_status field');
  assert.equal(field.type, 'select');
  assert.ok(!field.required, 'optional: existing entries have no value (rule 13)');
  assert.deepEqual(field.validation?.options, [...LAUNCH_STATUSES]);
});

test('the committed patches only use known statuses, and no study that is not live stays featured or in the hero', () => {
  const patches = JSON.parse(
    readFileSync(join(process.cwd(), 'cms/content/case_studies.json'), 'utf8'),
  ) as { slug: string; data: Record<string, unknown>; set?: Record<string, unknown> }[];
  for (const p of patches) {
    const status = p.data.launch_status;
    if (status === undefined) continue;
    assert.ok((LAUNCH_STATUSES as readonly string[]).includes(String(status)), p.slug);
    if (status === 'live') continue;
    assert.equal(p.set?.featured, false, `${p.slug} is not live, so it is not featured`);
    assert.notEqual(p.data.in_hero, true, `${p.slug} is not live, so it is not in the hero`);
  }
});
