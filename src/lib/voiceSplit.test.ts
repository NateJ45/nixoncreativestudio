import { test } from 'node:test';
import assert from 'node:assert/strict';
import { voiceSplit } from './voiceSplit.ts';

const join = (s: { head: string; tail: string }) => (s.tail ? `${s.head} ${s.tail}` : s.head);

test('voiceSplit turns at the last comma', () => {
  const s = voiceSplit(
    'Strategy, web design and photography, built so your team can run the site for years.',
  );
  assert.equal(s.head, 'Strategy, web design and photography,');
  assert.equal(s.tail, 'built so your team can run the site for years.');
});

test('voiceSplit without a comma turns for the last half of the words', () => {
  assert.deepEqual(voiceSplit('What a website costs'), { head: 'What a', tail: 'website costs' });
  assert.deepEqual(voiceSplit('Why it costs what it costs'), {
    head: 'Why it costs',
    tail: 'what it costs',
  });
  assert.deepEqual(voiceSplit('Common questions'), { head: 'Common', tail: 'questions' });
});

test('voiceSplit leaves a single word in caps', () => {
  assert.deepEqual(voiceSplit('Strategy'), { head: 'Strategy', tail: '' });
});

test('voiceSplit parts always rejoin to the original words', () => {
  for (const t of [
    'Ready to scope a project?',
    'Yes, no',
    'How a project runs',
    '  spaced   out  words ',
    'A, b, c, d and the rest of it',
  ]) {
    assert.equal(join(voiceSplit(t)), t.trim().replace(/\s+/g, ' '));
  }
});
