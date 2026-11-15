import { test } from 'node:test';
import assert from 'node:assert/strict';
import { externalRel, isExternalHref } from './external.ts';

test('flags off-site links', () => {
  assert.equal(isExternalHref('https://www.irs.gov/a'), true);
  assert.equal(isExternalHref('http://example.org'), true);
  assert.equal(isExternalHref('//cdn.example.org/a'), true);
});

test('leaves own-site and non-web links alone', () => {
  for (const h of [
    '/services/',
    '#top',
    'mailto:a@b.co',
    'tel:+15555550100',
    'https://nixoncreativestudio.com/work/',
    'https://www.nixoncreativestudio.com/',
    undefined,
  ]) {
    assert.equal(isExternalHref(h), false, String(h));
  }
});

test('adds noopener noreferrer, keeping an existing rel', () => {
  assert.equal(externalRel(undefined), 'noopener noreferrer');
  assert.equal(externalRel('me noopener'), 'me noopener noreferrer');
});
