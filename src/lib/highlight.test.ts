// Safe to edit. Checks src/lib/highlight.ts picks words out and never changes them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { excerpt, markedQuote } from './highlight.ts';

const richard =
  "Nathan Nixon transformed our website from a slow, clunky station wagon to a fast, beautiful sports car. Without compromising the integrity of our message, he's made it more attractive.";

test('the key phrase is marked and the words are unchanged', () => {
  const html = markedQuote('We now have half the hassles.', 'half the hassles');
  assert.equal(html, 'We now have <mark class="hl">half the hassles</mark>.');
});

test('an excerpt is the sentence holding the phrase, word for word, cut with an ellipsis', () => {
  assert.equal(
    excerpt(richard, 'a fast, beautiful sports car'),
    'Nathan Nixon transformed our website from a slow, clunky station wagon to a fast, beautiful sports car. …',
  );
  assert.equal(
    excerpt(richard, 'more attractive'),
    "… Without compromising the integrity of our message, he's made it more attractive.",
  );
  assert.equal(excerpt('One. Two words here. Three.', 'words'), '… Two words here. …');
  // A quote already shortened with an ellipsis keeps one, not two.
  assert.equal(excerpt('One. … Two words here.', 'words'), '… Two words here.');
});

test('with no phrase, or one not in the quote, the quote comes back whole', () => {
  assert.equal(excerpt(richard), richard);
  assert.equal(excerpt(richard, 'not in it'), richard);
  assert.equal(excerpt('A single sentence.', 'single'), 'A single sentence.');
});
