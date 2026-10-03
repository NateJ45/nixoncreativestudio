import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import {
  applyCollectionSchema,
  commonPageFields,
  singletonSettings,
  validateDef,
} from '../../scripts/lib/emdash-schema.mjs';

// ── An in-memory stand-in for the EmDash schema REST API ────────────────────
// It enforces what the real create endpoint does (titleField and commentsEnabled
// are update-only) and records every write, so a test can assert "no writes".

interface Field {
  slug: string;
  type: string;
  label: string;
  required?: boolean;
  indexed?: boolean;
  searchable?: boolean;
  validation?: unknown;
  sortOrder: number;
}

function fakeServer() {
  const collections = new Map<string, Record<string, unknown>>();
  const fields = new Map<string, Field[]>();
  const writes: string[] = [];
  const request = async (method: string, path: string, body?: any): Promise<any> => {
    if (method !== 'GET') writes.push(`${method} ${path}`);
    if (method === 'GET' && path === '/schema/collections') {
      return { items: [...collections.values()] };
    }
    if (method === 'POST' && path === '/schema/collections') {
      if ('titleField' in body || 'commentsEnabled' in body) {
        throw new Error('create endpoint rejected an update-only setting');
      }
      collections.set(body.slug, { ...body });
      fields.set(body.slug, []);
      return body;
    }
    let m = path.match(/^\/schema\/collections\/([a-z_]+)$/);
    if (m && method === 'PUT') {
      const col = collections.get(m[1])!;
      if (body.titleField && !fields.get(m[1])!.some((f) => f.slug === body.titleField)) {
        throw new Error('titleField names a field that does not exist yet');
      }
      collections.set(m[1], { ...col, ...body });
      return col;
    }
    m = path.match(/^\/schema\/collections\/([a-z_]+)\/fields$/);
    if (m && method === 'GET') return { items: fields.get(m[1]) };
    if (m && method === 'POST') {
      fields.get(m[1])!.push({ ...body });
      return body;
    }
    m = path.match(/^\/schema\/collections\/([a-z_]+)\/fields\/reorder$/);
    if (m && method === 'POST') {
      const list = fields.get(m[1])!;
      body.fieldSlugs.forEach((slug: string, i: number) => {
        list.find((f) => f.slug === slug)!.sortOrder = i;
      });
      return {};
    }
    m = path.match(/^\/schema\/collections\/([a-z_]+)\/fields\/([a-z_]+)$/);
    if (m && method === 'PUT') {
      const f = fields.get(m[1])!.find((x) => x.slug === m![2])!;
      Object.assign(f, body);
      return f;
    }
    if (m && method === 'DELETE') {
      fields.set(
        m[1],
        fields.get(m[1])!.filter((x) => x.slug !== m![2]),
      );
      return {};
    }
    throw new Error(`unexpected ${method} ${path}`);
  };
  return { request, writes, collections, fields };
}

const def = () => ({
  SLUG: 'page_test',
  COLLECTION: singletonSettings({ label: 'Test page', titleField: 'seo_title' }),
  FIELDS: [
    ...commonPageFields({ cta: true }),
    {
      slug: 'steps',
      type: 'repeater',
      label: 'Steps',
      validation: {
        minItems: 2,
        maxItems: 4,
        subFields: [{ slug: 'title', type: 'string', label: 'Title', required: true }],
      },
    },
    {
      slug: 'tone',
      type: 'select',
      label: 'Tone',
      validation: { options: ['warm', 'plain'] },
    },
  ],
});

test('applyCollectionSchema creates a collection, its fields, then the update-only settings', async () => {
  const s = fakeServer();
  const log = await applyCollectionSchema(s.request, def());
  const col = s.collections.get('page_test')!;
  assert.equal(col.titleField, 'seo_title', 'titleField applied after the fields exist');
  assert.equal(col.commentsEnabled, false);
  assert.deepEqual(
    s.fields.get('page_test')!.map((f) => f.slug),
    ['seo_title', 'seo_description', 'cta_title', 'cta_sub', 'steps', 'tone'],
  );
  assert.ok(log.includes('created collection page_test'));
  // creation order: collection first, collection settings last
  assert.equal(s.writes[0], 'POST /schema/collections');
  assert.equal(s.writes.at(-1), 'PUT /schema/collections/page_test');
});

test('a second run against a matching instance makes no writes', async () => {
  const s = fakeServer();
  await applyCollectionSchema(s.request, def());
  s.writes.length = 0;
  const log = await applyCollectionSchema(s.request, def());
  assert.deepEqual(s.writes, [], `unexpected writes: ${s.writes.join(', ')}`);
  assert.ok(
    log.every((l) => l.startsWith('unchanged')),
    log.join('\n'),
  );
});

test('a changed label is updated in place; a changed type is dropped and re-added', async () => {
  const s = fakeServer();
  await applyCollectionSchema(s.request, def());
  const d = def();
  d.FIELDS[0].label = 'New title label';
  d.FIELDS[5] = {
    slug: 'tone',
    type: 'string',
    label: 'Tone',
    validation: { maxLength: 20 },
  } as any;
  s.writes.length = 0;
  const log = await applyCollectionSchema(s.request, d);
  assert.ok(log.includes('updated field seo_title'));
  assert.ok(log.some((l) => l.startsWith('dropped tone (select -> string)')));
  assert.ok(log.includes('added field tone (string)'));
  assert.equal(s.fields.get('page_test')!.find((f) => f.slug === 'tone')!.type, 'string');
});

test('obsolete fields are removed', async () => {
  const s = fakeServer();
  await applyCollectionSchema(s.request, def());
  const d = { ...def(), OBSOLETE_FIELDS: ['tone'], FIELDS: def().FIELDS.slice(0, 5) };
  const log = await applyCollectionSchema(s.request, d);
  assert.ok(log.includes('removed obsolete field tone'));
  assert.equal(
    s.fields.get('page_test')!.some((f) => f.slug === 'tone'),
    false,
  );
});

test('dry run reads but never writes, on a new and an existing collection', async () => {
  const fresh = fakeServer();
  const planned = await applyCollectionSchema(fresh.request, def(), { dryRun: true });
  assert.deepEqual(fresh.writes, []);
  assert.ok(
    planned.includes('would created collection page_test') ||
      planned.some((l) => l.includes('page_test')),
  );
  assert.ok(planned.some((l) => l.startsWith('would added field seo_title')));

  const live = fakeServer();
  await applyCollectionSchema(live.request, def());
  live.writes.length = 0;
  const d = def();
  d.FIELDS[0].label = 'Changed';
  await applyCollectionSchema(live.request, d, { dryRun: true });
  assert.deepEqual(live.writes, []);
});

test('field order is repaired when it drifts', async () => {
  const s = fakeServer();
  await applyCollectionSchema(s.request, def());
  const list = s.fields.get('page_test')!;
  [list[0].sortOrder, list[1].sortOrder] = [1, 0]; // swap the first two
  s.writes.length = 0;
  const log = await applyCollectionSchema(s.request, def());
  assert.ok(log.includes('reordered fields'));
  assert.deepEqual(s.writes, ['POST /schema/collections/page_test/fields/reorder']);
});

// ── validateDef ──────────────────────────────────────────────────────────────

test('validateDef accepts the singleton builders', () => {
  const { errors } = validateDef(def());
  assert.deepEqual(errors, []);
});

test('singletonSettings is the design convention and can be overridden', () => {
  const s = singletonSettings();
  assert.deepEqual(s.supports, ['drafts', 'revisions']);
  assert.equal(s.routable, false);
  assert.deepEqual(s.admin, { quickCreate: false });
  assert.equal(s.group, 'Pages');
  assert.equal(s.commentsEnabled, false);
  assert.equal(singletonSettings({ group: 'Site', titleField: 'studio_name' }).group, 'Site');
});

test('commonPageFields has seo fields, and the cta pair only on request', () => {
  assert.deepEqual(
    commonPageFields().map((f) => f.slug),
    ['seo_title', 'seo_description'],
  );
  assert.deepEqual(
    commonPageFields({ cta: true }).map((f) => f.slug),
    ['seo_title', 'seo_description', 'cta_title', 'cta_sub'],
  );
});

test('validateDef rejects what the server would reject', () => {
  const bad = {
    SLUG: 'Bad-Slug',
    COLLECTION: { label: '', titleField: 'nope', admin: { listColumns: ['ghost'] } },
    FIELDS: [
      { slug: 'id', type: 'string', label: 'x', validation: { maxLength: 5 } },
      { slug: 'dup', type: 'string', label: 'x', validation: { maxLength: 5 } },
      { slug: 'dup', type: 'string', label: 'x', validation: { maxLength: 5 } },
      { slug: 'kind', type: 'select', label: 'x' },
      { slug: 'weird', type: 'wysiwyg', label: 'x' },
      { slug: 'rep', type: 'repeater', label: 'x' },
      {
        slug: 'nested',
        type: 'repeater',
        label: 'x',
        validation: { subFields: [{ slug: 'inner', type: 'repeater', label: 'x' }] },
      },
      { slug: 'range', type: 'integer', label: 'x', validation: { min: 5, max: 1 } },
      { slug: 'rx', type: 'string', label: 'x', validation: { maxLength: 5, pattern: '(' } },
    ],
  };
  const { errors } = validateDef(bad);
  const text = errors.join('\n');
  for (const want of [
    'SLUG must match',
    'COLLECTION.label is required',
    'slug is reserved by EmDash',
    'duplicate field slug',
    'a select needs validation.options',
    'unknown type "wysiwyg"',
    'a repeater needs validation.subFields',
    'sub-field type "repeater" is not allowed',
    'min is greater than max',
    'validation.pattern is not a valid regular expression',
    'titleField "nope" is not a field',
    'listColumns "ghost" is not a field',
  ]) {
    assert.match(text, new RegExp(want.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `missing: ${want}`);
  }
});

test('validateDef warns that sub-field limits are not enforced, and about missing maxLength', () => {
  const { errors, warnings } = validateDef({
    SLUG: 'page_x',
    COLLECTION: { label: 'X' },
    FIELDS: [
      { slug: 'free', type: 'string', label: 'Free' },
      {
        slug: 'rows',
        type: 'repeater',
        label: 'Rows',
        validation: {
          maxItems: 3,
          subFields: [{ slug: 'text', type: 'string', label: 'Text', maxLength: 48 }],
        },
      },
    ],
  });
  assert.deepEqual(errors, []);
  assert.ok(warnings.some((w) => /page_x\.free: no validation\.maxLength/.test(w)));
  assert.ok(warnings.some((w) => /rows\.text: maxLength is not enforced/.test(w)));
});

// ── Every committed definition must be valid (a no-op until PR 4 adds the first) ─

test('every cms/schema/*.mjs is a valid definition whose SLUG matches its file name', async () => {
  const dir = join(process.cwd(), 'cms/schema');
  if (!existsSync(dir)) return;
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.mjs'))) {
    const mod = await import(pathToFileURL(join(dir, file)).href);
    assert.equal(mod.SLUG, file.replace(/\.mjs$/, ''), `${file}: SLUG must match the file name`);
    const { errors } = validateDef(mod);
    assert.deepEqual(errors, [], `${file}: ${errors.join('; ')}`);
  }
});
