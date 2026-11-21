// Safe to edit. Checks the one-card-per-person grouping in src/lib/study-quotes.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { byPerson, monthYear, personId, samePerson } from './study-quotes.ts';

test('a person has one card id whatever the spelling', () => {
  assert.equal(personId('Richard E. Burnett, Ph.D.'), 'q-richard-burnett');
  assert.equal(personId('Richard Burnett'), 'q-richard-burnett');
  assert.equal(personId('Kendall Ellis, M.Div., MSW'), 'q-kendall-ellis');
  assert.equal(personId('Mary Ann Stone'), 'q-mary-stone');
});

test('the same person under two spellings is one person', () => {
  assert.ok(samePerson('Richard E. Burnett, Ph.D.', 'Richard Burnett'));
  assert.ok(!samePerson('Jonathan Balmer', 'Kendall Ellis'));
});

test('quotes group one card per person, oldest words first', () => {
  const q = (name: string, day: string) => ({ name, date: new Date(`${day}T00:00:00Z`) });
  const cards = byPerson([
    q('Jonathan Balmer', '2025-03-09'),
    q('Richard Burnett', '2026-11-16'),
    q('Kendall Ellis', '2025-03-12'),
    q('Richard E. Burnett, Ph.D.', '2025-02-28'),
  ]);
  assert.deepEqual(
    cards.map((c) => c.map((x) => x.date.toISOString().slice(0, 10))),
    [['2025-03-09'], ['2025-02-28', '2026-11-16'], ['2025-03-12']],
  );
});

test('the dated note reads month and year', () => {
  assert.equal(monthYear(new Date('2025-02-28T00:00:00Z')), 'February 2025');
});
