import { test } from 'node:test';
import assert from 'node:assert/strict';
import { START_MINUTES, coffeeFrom, formatTime, nudgedTime, parseTime } from './factDemo.ts';

test('formatTime prints a 12-hour time with AM or PM', () => {
  assert.equal(formatTime(START_MINUTES), '10:30 AM');
  assert.equal(formatTime(0), '12:00 AM');
  assert.equal(formatTime(9 * 60 + 5), '9:05 AM');
  assert.equal(formatTime(12 * 60), '12:00 PM');
  assert.equal(formatTime(18 * 60 + 45), '6:45 PM');
  assert.equal(formatTime(23 * 60 + 59), '11:59 PM');
});

test('formatTime wraps round midnight', () => {
  assert.equal(formatTime(-15), '11:45 PM');
  assert.equal(formatTime(24 * 60 + 30), '12:30 AM');
});

test('parseTime reads the ways people type a time', () => {
  const cases: [string, number][] = [
    ['9', 9 * 60],
    ['9:15', 9 * 60 + 15],
    ['9.15', 9 * 60 + 15],
    ['915', 9 * 60 + 15],
    ['1100', 11 * 60],
    ['9:15am', 9 * 60 + 15],
    ['9:15 AM', 9 * 60 + 15],
    ['9:15 a.m.', 9 * 60 + 15],
    ['  10:30 AM  ', 10 * 60 + 30],
    ['6 pm', 18 * 60],
    ['6pm', 18 * 60],
    ['6:30 p.m.', 18 * 60 + 30],
    ['12 pm', 12 * 60],
    ['12 am', 0],
    ['18:00', 18 * 60],
    ['0:30', 30],
    ['noon', 12 * 60],
    ['Noon', 12 * 60],
  ];
  for (const [typed, minutes] of cases) {
    assert.equal(parseTime(typed), minutes, `"${typed}"`);
  }
});

test('parseTime reads a bare 1 to 6 as afternoon or evening', () => {
  assert.equal(parseTime('1'), 13 * 60);
  assert.equal(parseTime('6'), 18 * 60);
  assert.equal(parseTime('5:30'), 17 * 60 + 30);
  assert.equal(parseTime('7'), 7 * 60);
  assert.equal(parseTime('6 am'), 6 * 60);
});

test('parseTime refuses anything that is not a time', () => {
  for (const typed of [
    '',
    '   ',
    'half ten',
    'ten thirty',
    '25:00',
    '9:75',
    '13 pm',
    '0 am',
    '10:3',
    '10:30 xm',
    '9:15 AM sharp',
    '-9',
  ]) {
    assert.equal(parseTime(typed), null, `"${typed}"`);
  }
});

test('formatTime(parseTime(x)) is the tidy form of what was typed', () => {
  assert.equal(formatTime(parseTime('915') ?? -1), '9:15 AM');
  assert.equal(formatTime(parseTime('6pm') ?? -1), '6:00 PM');
});

test('coffeeFrom is 15 minutes before the service, across the hour and midnight', () => {
  assert.equal(formatTime(coffeeFrom(START_MINUTES)), '10:15 AM');
  assert.equal(formatTime(coffeeFrom(9 * 60)), '8:45 AM');
  assert.equal(formatTime(coffeeFrom(11 * 60 + 15)), '11:00 AM');
  assert.equal(formatTime(coffeeFrom(12 * 60 + 10)), '11:55 AM');
  assert.equal(formatTime(coffeeFrom(5)), '11:50 PM');
});

test('nudgedTime moves half an hour, and back when that would run late', () => {
  assert.equal(nudgedTime(START_MINUTES), 11 * 60);
  assert.equal(nudgedTime(21 * 60 + 45), 21 * 60 + 15);
});
