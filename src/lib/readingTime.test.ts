import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readingTime } from './readingTime.ts';

// ── readingTime ───────────────────────────────────────────────────────────
// The function returns a number: minutes rounded up, minimum 1.
// WORDS_PER_MINUTE = 200 (from module source).

test('returns 1 for an empty string', () => {
  assert.equal(readingTime(''), 1);
});

test('returns 1 for a falsy-ish whitespace-only string', () => {
  // Whitespace splits to zero words, ceil(0/200) = 0, clamped to 1.
  assert.equal(readingTime('   '), 1);
});

test('returns 1 for a single word', () => {
  assert.equal(readingTime('hello'), 1);
});

test('returns 1 for exactly 200 words', () => {
  const body = Array(200).fill('word').join(' ');
  assert.equal(readingTime(body), 1);
});

test('returns 2 for 201 words (rounds up)', () => {
  const body = Array(201).fill('word').join(' ');
  assert.equal(readingTime(body), 2);
});

test('returns 2 for exactly 400 words', () => {
  const body = Array(400).fill('word').join(' ');
  assert.equal(readingTime(body), 2);
});

test('returns 5 for exactly 1000 words', () => {
  const body = Array(1000).fill('word').join(' ');
  assert.equal(readingTime(body), 5);
});

test('strips fenced code blocks before counting words', () => {
  // A code block containing 1000 words should not inflate the count.
  const codeBlock = '```\n' + Array(1000).fill('code').join(' ') + '\n```';
  const body = 'intro\n' + codeBlock + '\nconclusion';
  // Only "intro" and "conclusion" survive: 2 words -> 1 min.
  assert.equal(readingTime(body), 1);
});

test('strips inline code before counting words', () => {
  const body = Array(5).fill('`inlineCode`').join(' ');
  // All tokens are inline code; stripped to whitespace -> 0 words -> 1 min.
  assert.equal(readingTime(body), 1);
});

test('strips image markdown before counting words', () => {
  const body = '![alt text](https://example.com/img.png)';
  assert.equal(readingTime(body), 1);
});

test('reduces links to their display text only', () => {
  // "[foo bar](https://example.com)" -> "foo bar": 2 words.
  const body = '[foo bar](https://example.com)';
  assert.equal(readingTime(body), 1);
});

test('strips MDX/HTML tags before counting', () => {
  const body = '<CalloutBox>Some prose here</CalloutBox>';
  // After stripping tags: "Some prose here" = 3 words -> 1 min.
  assert.equal(readingTime(body), 1);
});

test('strips heading markers and other MDX punctuation', () => {
  // # ## ### * _ > ~ | = - are stripped to spaces, not counted as words.
  const body = '# Heading\n## Sub\n- item one\n- item two';
  // Real words: Heading Sub item one item two = 6 words -> 1 min.
  assert.equal(readingTime(body), 1);
});

test('handles mixed prose and markdown: only prose words count toward time', () => {
  // 400 plain prose words plus noise that should be stripped entirely.
  // Image tags, fenced code blocks, and link URLs are all removed.
  // Heading markers (#) are stripped to spaces, but the heading text
  // word "Title" does count. So total = 400 prose + 1 heading word = 401
  // words -> ceil(401/200) = 3 minutes.
  const prose = Array(400).fill('word').join(' ');
  const body = `# Title\n\n${prose}\n\n![cover](img.png)\n\n\`\`\`js\nconst x = 1;\n\`\`\``;
  assert.equal(readingTime(body), 3);
});

test('noise-only body with no prose words stays at minimum 1 minute', () => {
  // A body that is entirely images, code blocks, and link URLs with no
  // surviving text words should clamp to the minimum of 1.
  const body = '![a](b.png)\n```\ncode code code\n```\n[](https://example.com)';
  assert.equal(readingTime(body), 1);
});
