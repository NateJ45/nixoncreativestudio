import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FALLBACK_REDIRECTS, fallbackRedirect } from './redirectFallback.ts';

// CMS-DESIGN PR 13: the two retired URLs live in EmDash Redirects; the code fallback keeps them
// answering 301 until production holds the rows.

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

test('/now and the retired case study redirect, with or without a trailing slash', () => {
  assert.deepEqual(fallbackRedirect('/now'), {
    source: '/now',
    destination: '/about/#now',
    type: 301,
  });
  assert.equal(fallbackRedirect('/now/')?.destination, '/about/#now');
  assert.equal(fallbackRedirect('/work/west-chester-preschool')?.destination, '/work/');
  assert.equal(fallbackRedirect('/work/west-chester-preschool/')?.destination, '/work/');
});

test('nothing else is caught: real pages, lookalikes and the root', () => {
  for (const path of [
    '/',
    '/about/',
    '/work/',
    '/work/second-presbyterian-chicago/',
    '/work/west-chester-preschool-2/',
    '/nowhere',
    '/now/more',
    '/NOW',
    '/unknown/',
  ]) {
    assert.equal(fallbackRedirect(path), undefined, path);
  }
});

test('the fallback list equals cms/content/redirects.json (the rows production will hold)', () => {
  const file = JSON.parse(read('cms/content/redirects.json')) as {
    source: string;
    destination: string;
    type?: number;
  }[];
  assert.deepEqual(
    file.map((r) => ({ source: r.source, destination: r.destination, type: r.type ?? 301 })),
    FALLBACK_REDIRECTS,
  );
});

test('astro.config.mjs holds no redirects any more, and the worker consults the fallback', () => {
  // A config redirect would shadow the EmDash row, so Nathan's admin edit would never show.
  assert.ok(
    !/^\s*redirects\s*:/m.test(read('astro.config.mjs')),
    'remove redirects from the config',
  );
  const worker = read('src/worker.ts');
  assert.match(worker, /fallbackRedirect\(pathname\)/);
  // Only a real 404 is looked at, so an EmDash redirect (answered earlier, in its middleware) wins.
  assert.match(worker, /res\.status === 404 && \(isGet \|\| request\.method === 'HEAD'\)/);
});
