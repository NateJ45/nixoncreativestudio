// Safe to edit.
// storedLoginToken: the loaders fall back to the login `npx emdash login` stored
// when no EMDASH_TOKEN is set. Runs against a throwaway config dir, never the real one.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { restRequest, storedLoginToken } from '../../scripts/lib/emdash-rest.mjs';

const URL_A = 'https://www.example.test';

function withConfig(store: unknown, fn: () => void) {
  const dir = mkdtempSync(join(tmpdir(), 'emdash-cfg-'));
  mkdirSync(join(dir, 'emdash'));
  if (store !== undefined) writeFileSync(join(dir, 'emdash', 'auth.json'), JSON.stringify(store));
  const prevXdg = process.env.XDG_CONFIG_HOME;
  const prevTok = process.env.EMDASH_TOKEN;
  process.env.XDG_CONFIG_HOME = dir;
  delete process.env.EMDASH_TOKEN;
  try {
    fn();
  } finally {
    if (prevXdg === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = prevXdg;
    if (prevTok !== undefined) process.env.EMDASH_TOKEN = prevTok;
  }
}

test('storedLoginToken: returns the token stored for that origin only', () => {
  withConfig(
    { [URL_A]: { accessToken: 'tok-a' }, 'https://other.test': { accessToken: 'tok-b' } },
    () => {
      assert.equal(storedLoginToken(URL_A), 'tok-a');
      assert.equal(storedLoginToken(`${URL_A}/some/path`), 'tok-a');
      assert.equal(storedLoginToken('https://unknown.test'), '');
    },
  );
});

test('storedLoginToken: a missing or unreadable file is an empty string, not a throw', () => {
  withConfig(undefined, () => assert.equal(storedLoginToken(URL_A), ''));
});

test('restRequest: no credential anywhere returns null; the stored login makes it available', () => {
  withConfig({}, () => assert.equal(restRequest(URL_A), null));
  withConfig({ [URL_A]: { accessToken: 'tok-a' } }, () =>
    assert.equal(typeof restRequest(URL_A), 'function'),
  );
});

test('restRequest: an explicit token still wins and needs no stored login', () => {
  withConfig({}, () => assert.equal(typeof restRequest(URL_A, 'explicit'), 'function'));
});
