import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tidyAdmin } from '../../scripts/lib/tidy-admin.mjs';

// An in-memory EmDash: only the endpoints tidyAdmin touches, recording every write.
function fake({ taxonomies = ['service', 'topic', 'stack', 'category', 'tag'], terms = {} } = {}) {
  const writes: string[] = [];
  let names = [...taxonomies];
  const request = async (method: string, path: string): Promise<unknown> => {
    if (method !== 'GET') writes.push(`${method} ${path}`);
    if (method === 'GET' && path === '/taxonomies') {
      return { taxonomies: names.map((name) => ({ name })) };
    }
    const t = path.match(/^\/taxonomies\/(\w+)\/terms$/);
    if (method === 'GET' && t) return { terms: (terms as Record<string, string[]>)[t[1]] ?? [] };
    const d = path.match(/^\/taxonomies\/(\w+)$/);
    if (method === 'DELETE' && d) {
      names = names.filter((n) => n !== d[1]);
      return {};
    }
    if (method === 'GET' && path === '/widget-areas') return { items: [] };
    if (method === 'GET' && path === '/sections') return { items: [] };
    if (method === 'GET' && path === '/menus')
      return { items: [{ name: 'primary' }, { name: 'footer' }] };
    throw new Error(`unexpected ${method} ${path}`);
  };
  return { request, writes };
}

test('an empty category taxonomy is deleted, once; a rerun changes nothing', async () => {
  const s = fake();
  const first = await tidyAdmin(s.request);
  assert.deepEqual(s.writes, ['DELETE /taxonomies/category']);
  assert.ok(first.includes('deleted taxonomy category (empty, unused by the site)'));
  s.writes.length = 0;
  const again = await tidyAdmin(s.request);
  assert.deepEqual(s.writes, []);
  assert.ok(
    again.every((l: string) => l.startsWith('unchanged')),
    again.join(' | '),
  );
});

test('a dry run reads but never writes', async () => {
  const s = fake();
  const log = await tidyAdmin(s.request, { dryRun: true });
  assert.deepEqual(s.writes, []);
  assert.ok(log.some((l: string) => l.startsWith('would deleted taxonomy category')));
});

test('a category taxonomy that still has terms is kept, not deleted', async () => {
  const s = fake({ terms: { category: ['news'] } });
  const log = await tidyAdmin(s.request);
  assert.deepEqual(s.writes, []);
  assert.ok(log.some((l: string) => l.startsWith('skipped taxonomy category')));
});

test('the taxonomies the site reads are never touched', async () => {
  const s = fake({ taxonomies: ['service', 'topic', 'stack', 'tag'] });
  await tidyAdmin(s.request);
  assert.deepEqual(s.writes, []);
});
