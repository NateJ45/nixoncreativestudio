import { test } from 'node:test';
import assert from 'node:assert/strict';
import { darkMark, hostOf, nextInLoop, paletteStyle, studyFacts } from './study.ts';

const palette = {
  paper: '#FBF6EA',
  ink: '#1A1712',
  accent: '#A83C26',
  accentInk: '#FFEBBB',
  typeface: 'Staatliches / Archivo',
  swatches: ['#FBF6EA', '#A83C26'],
};

test('nextInLoop follows order and wraps from the last study to the first', () => {
  const studies = [
    { id: 'c', order: 3 },
    { id: 'a', order: 1 },
    { id: 'b', order: 2 },
  ];
  assert.equal(nextInLoop(studies, 'a')?.id, 'b');
  assert.equal(nextInLoop(studies, 'b')?.id, 'c');
  assert.equal(nextInLoop(studies, 'c')?.id, 'a');
});

test('nextInLoop puts studies with no order last and returns nothing for one study', () => {
  const studies = [{ id: 'new' }, { id: 'a', order: 1 }];
  assert.equal(nextInLoop(studies, 'a')?.id, 'new');
  assert.equal(nextInLoop(studies, 'new')?.id, 'a');
  assert.equal(nextInLoop([{ id: 'solo', order: 1 }], 'solo'), undefined);
});

test('studyFacts reads the study fields and lets facts override them', () => {
  const base = {
    sector: 'small-business',
    year: 2026,
    role: 'Designer, Developer',
    stack: ['Astro', 'Sanity'],
    liveUrl: 'https://www.example.org/',
  };
  assert.deepEqual(studyFacts(base), [
    { label: 'Sector', value: 'Small business' },
    { label: 'Year', value: '2026' },
    { label: 'Role', value: 'Designer, Developer' },
    { label: 'Stack', value: 'Astro, Sanity' },
    { label: 'Host', value: 'example.org', url: 'https://www.example.org/' },
  ]);
  const overridden = studyFacts({ ...base, facts: { year: '2024, rebuilt 2026', host: 'x.org' } });
  assert.equal(overridden[1].value, '2024, rebuilt 2026');
  assert.equal(overridden[4].value, 'x.org');
});

test('studyFacts drops facts with no value', () => {
  const facts = studyFacts({ sector: 'church', year: 2023 });
  assert.deepEqual(
    facts.map((f) => f.label),
    ['Sector', 'Year'],
  );
});

test('hostOf strips the protocol and www', () => {
  assert.equal(hostOf('https://www.fbcmuncie.org'), 'fbcmuncie.org');
});

test('darkMark prefers markDark, then the dark accent, then the accent', () => {
  assert.equal(darkMark({ ...palette, markDark: '#D59B29' }), '#D59B29');
  assert.equal(
    darkMark({ ...palette, dark: { paper: '#000000', ink: '#ffffff', accent: '#B8462F' } }),
    '#B8462F',
  );
  assert.equal(darkMark(palette), '#A83C26');
});

test('paletteStyle writes scoped custom properties, or nothing without a palette', () => {
  const style = paletteStyle(palette) ?? '';
  assert.match(style, /--cs-paper: #FBF6EA/);
  assert.match(style, /--cs-mark-dark: #A83C26/);
  assert.equal(paletteStyle(undefined), undefined);
});
