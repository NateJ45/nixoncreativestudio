import test from 'node:test';
import assert from 'node:assert/strict';
import { splitVoice } from './voice.ts';

test('splitVoice sets the last two words apart by default', () => {
  assert.deepEqual(splitVoice('That page wandered off.'), {
    lead: 'That page',
    voice: 'wandered off.',
  });
});

test('splitVoice honours a different word count and collapses stray spaces', () => {
  assert.deepEqual(splitVoice('  What this site   collects. ', 1), {
    lead: 'What this site',
    voice: 'collects.',
  });
});

test('splitVoice keeps a short headline whole, with no voice', () => {
  assert.deepEqual(splitVoice('Journal'), { lead: 'Journal', voice: '' });
  assert.deepEqual(splitVoice('Colophon page'), { lead: 'Colophon page', voice: '' });
});
