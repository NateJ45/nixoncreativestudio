import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { cmsShotProblem, crewFor, nextInLoop } from './study.ts';

const shot = 'shots/x-cms.png';

test('nextInLoop follows order and wraps from the last study to the first', () => {
  const loop = [
    { id: 'c', order: 3 },
    { id: 'a', order: 1 },
    { id: 'b', order: 2 },
  ];
  assert.equal(nextInLoop(loop, 'a')?.id, 'b');
  assert.equal(nextInLoop(loop, 'b')?.id, 'c');
  assert.equal(nextInLoop(loop, 'c')?.id, 'a');
});

test('nextInLoop puts studies with no order last and returns nothing for one study', () => {
  assert.equal(nextInLoop([{ id: 'a', order: 1 }, { id: 'b' }], 'a')?.id, 'b');
  assert.equal(nextInLoop([{ id: 'a', order: 1 }], 'a'), undefined);
});

test('cmsShotProblem requires alt text whenever a cmsShot is set', () => {
  assert.equal(cmsShotProblem({}), undefined);
  assert.equal(cmsShotProblem({ cmsShot: shot, cmsShotAlt: 'The Home page form' }), undefined);
  assert.match(cmsShotProblem({ cmsShot: shot }) ?? '', /cmsShotAlt is required/);
  assert.match(cmsShotProblem({ cmsShot: shot, cmsShotAlt: '   ' }) ?? '', /cmsShotAlt/);
});

test('crewFor names the work, not the person, and says no job twice', () => {
  assert.deepEqual(crewFor(['Strategy', 'Web Design'], 'Designer, Developer'), [
    'Strategy',
    'Design',
    'The build',
  ]);
  assert.deepEqual(
    crewFor(
      ['Brand identity', 'Online store', 'Social media', 'Photography', 'Web Design'],
      'Publicity Chair (volunteer)',
    ),
    ['Brand identity', 'Online store', 'Social media', 'Photos', 'Design', 'Publicity (volunteer)'],
  );
  assert.deepEqual(crewFor(['Strategy', 'strategy'], undefined), ['Strategy']);
});

test('crewFor over every real case study is non-empty, has no person nouns and invents nothing', () => {
  const dir = 'src/content/case-studies';
  const files = readdirSync(dir).filter((f) => /\.mdx?$/.test(f));
  assert.ok(files.length > 0);
  for (const f of files) {
    const fm = readFileSync(`${dir}/${f}`, 'utf8').split(/^---\s*$/m)[1] ?? '';
    // No YAML dependency: the two fields are a `services:` list of `- item` lines and a `role:` line.
    const block = fm.match(/^services:\s*\n((?:[ \t]+-[ \t].*\n?)+)/m)?.[1] ?? '';
    const services = [...block.matchAll(/-[ \t]+(.+)/g)].map((m) => m[1].trim());
    const role = fm.match(/^role:[ \t]*(.+)$/m)?.[1].trim();
    assert.ok(services.length > 0, `${f}: no services read`);
    const said = [...services, ...(role ?? '').split(',')].join(' | ').toLowerCase();
    const crew = crewFor(services, role);
    assert.ok(crew.length > 0, `${f}: crew is empty`);
    for (const c of crew) {
      assert.doesNotMatch(c, /(designer|developer|photographer|chair)/i, `${f}: "${c}"`);
      const base = c.replace(/\s*\(volunteer\)$/i, '');
      // Each role is either one of the study's own words or the work noun for one of them.
      const derivable =
        said.includes(base.toLowerCase()) ||
        (base === 'Design' && /web design|designer/.test(said)) ||
        (base === 'The build' && /developer/.test(said)) ||
        (base === 'Photos' && /photograph/.test(said));
      assert.ok(derivable, `${f}: "${c}" is not in the study's services or role`);
    }
  }
});
