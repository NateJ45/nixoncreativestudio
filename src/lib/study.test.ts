import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cmsShotProblem, nextInLoop } from './study.ts';

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
