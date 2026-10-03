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

// ── case_studies (CMS-DESIGN PR 13): an existing collection gains two optional fields ──

test('case_studies: in_hero and hero_order are added optional, and nothing existing changes', async () => {
  const cs = await import('../../cms/schema/case_studies.mjs');
  const { FIELDS: raw } = await import('../../scripts/lib/case-studies-schema.mjs');
  // One definition: the cms/schema module re-exports the migration script's fields.
  assert.equal(cs.FIELDS, raw);
  const inHero = cs.FIELDS.find((f: { slug: string }) => f.slug === 'in_hero');
  const order = cs.FIELDS.find((f: { slug: string }) => f.slug === 'hero_order');
  assert.equal(inHero?.type, 'boolean');
  assert.equal(order?.type, 'integer');
  assert.deepEqual(order?.validation, { min: 1, max: 99 });
  // EmDash cannot make an existing optional field required (FIELD_UPDATE_REQUIRES_MIGRATION),
  // and every existing entry has neither field, so both must stay optional.
  assert.ok(!inHero?.required && !order?.required);
  assert.deepEqual(validateDef(cs).errors, []);

  // Production holds the 32 fields it had before; applying the new definition adds exactly two.
  const s = fakeServer();
  const before = {
    ...cs,
    FIELDS: cs.FIELDS.filter(
      (f: { slug: string }) => f.slug !== 'in_hero' && f.slug !== 'hero_order',
    ),
  };
  await applyCollectionSchema(s.request, before);
  s.writes.length = 0;
  const log = await applyCollectionSchema(s.request, cs, { dryRun: true });
  assert.deepEqual(s.writes, [], 'a dry run writes nothing');
  assert.deepEqual(
    log.filter((l: string) => !l.startsWith('unchanged')),
    [
      'would added field in_hero (boolean)',
      'would added field hero_order (integer)',
      'would reorder fields',
    ],
  );
  await applyCollectionSchema(s.request, cs);
  s.writes.length = 0;
  const again = await applyCollectionSchema(s.request, cs);
  assert.deepEqual(s.writes, [], `a rerun writes nothing: ${s.writes.join(', ')}`);
  assert.ok(
    again.every((l: string) => l.startsWith('unchanged')),
    again.join('\n'),
  );
});

test('case_studies settings match what EmDash returns: no "seo" in supports, hasSeo instead', async () => {
  const cs = await import('../../cms/schema/case_studies.mjs');
  // EmDash stores the SEO panel as the hasSeo flag and returns supports without "seo". Listing it
  // here made the comparison never read "unchanged", so the loader's re-check would stop.
  assert.deepEqual([...cs.COLLECTION.supports].sort(), ['drafts', 'revisions', 'search']);
  assert.equal(cs.COLLECTION.hasSeo, true);
  assert.equal(cs.COLLECTION.urlPattern, '/work/{slug}/');
  // The CI seed puts "seo" back, so ncs-ci keeps the SEO panel and the sitemap entry.
  const { seedCollection } = await import('../../scripts/ci-dataset/cms-fixtures.mjs');
  const seeded = seedCollection(cs);
  assert.deepEqual(seeded.supports, ['drafts', 'revisions', 'seo', 'search']);
  assert.ok(!('hasSeo' in seeded));
  assert.equal(seeded.urlPattern, '/work/{slug}/');
});

// ── PR 14: the admin's "live view" button and the sidebar order ─────────────

/** What the admin's live-view link should open for each collection (CMS-DESIGN 4.3, PR 14). */
const LIVE_VIEW: Record<string, string> = {
  site_settings: '/',
  page_home: '/',
  page_about: '/about/',
  page_services: '/services/',
  page_contact: '/contact/',
  page_work: '/work/',
  page_photography: '/photography/',
  page_journal: '/journal/',
  page_not_found: '/404/',
  pricing_tiers: '/services/',
  pricing_addons: '/services/',
  service_offerings: '/services/',
  photos: '/photography/',
  pages: '/{slug}/',
  posts: '/journal/{slug}/',
  case_studies: '/work/{slug}/',
};

async function loadAllSchemas() {
  const dir = join(process.cwd(), 'cms/schema');
  const out = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.mjs'))) {
    out.push(await import(pathToFileURL(join(dir, f)).href));
  }
  return out;
}

test('every collection has the urlPattern its public page needs, and EmDash accepts the pattern', async () => {
  const defs = await loadAllSchemas();
  assert.deepEqual(defs.map((d) => d.SLUG).sort(), Object.keys(LIVE_VIEW).sort());
  for (const d of defs) {
    const want = LIVE_VIEW[d.SLUG];
    assert.equal(d.COLLECTION.urlPattern, want, `${d.SLUG} urlPattern`);
    // The server's own rule (emdash compileUrlPattern): braces only as {name}, one placeholder
    // per path segment. A fixed address with no placeholder is valid.
    const placeholders = want.match(/\{\w+\}/g) ?? [];
    assert.ok(want.startsWith('/'), `${d.SLUG}: starts with a slash`);
    assert.ok(
      placeholders.every((p) => p === '{slug}'),
      `${d.SLUG}: only {slug}`,
    );
    assert.ok(placeholders.length <= 1, `${d.SLUG}: at most one placeholder`);
    assert.equal(want.replace(/\{\w+\}/g, '').includes('{'), false);
  }
});

test('sidebar order follows the design: Site, Pages, Pricing, Portfolio, Journal, Photography', async () => {
  const defs = await loadAllSchemas();
  const order = (slug: string) => defs.find((d) => d.SLUG === slug)!.COLLECTION.sortOrder as number;
  const inGroup = (g: string) =>
    defs.filter((d) => d.COLLECTION.group === g).map((d) => d.COLLECTION.sortOrder as number);
  assert.ok(order('site_settings') < Math.min(...inGroup('Pages')));
  assert.ok(Math.max(...inGroup('Pages')) < Math.min(...inGroup('Pricing & services')));
  assert.ok(Math.max(...inGroup('Pricing & services')) < order('case_studies'));
  assert.ok(order('case_studies') < order('posts'));
  assert.ok(order('posts') < order('photos'));
  const all = defs.map((d) => d.COLLECTION.sortOrder as number);
  assert.equal(new Set(all).size, all.length, 'no two collections share a sortOrder');
});

test('adding urlPattern and sortOrder to an existing collection applies once, then reads unchanged', async () => {
  for (const d of await loadAllSchemas()) {
    if (d.SLUG === 'case_studies') continue; // its extra fields are covered by the PR 13 test
    const s = fakeServer();
    // Production as it stands before PR 14: the same collection without the two settings.
    const { urlPattern: _u, sortOrder: _o, ...old } = d.COLLECTION;
    await applyCollectionSchema(s.request, { ...d, COLLECTION: old });
    s.writes.length = 0;
    const first = await applyCollectionSchema(s.request, d, { dryRun: true });
    assert.deepEqual(
      first.filter((l: string) => !l.startsWith('unchanged')),
      [`would applied collection settings (group ${d.COLLECTION.group ?? 'none'})`],
      d.SLUG,
    );
    await applyCollectionSchema(s.request, d);
    s.writes.length = 0;
    const again = await applyCollectionSchema(s.request, d, { dryRun: true });
    assert.ok(
      again.every((l: string) => l.startsWith('unchanged')),
      `${d.SLUG} re-check: ${again.join(' | ')}`,
    );
    assert.deepEqual(s.writes, [], `${d.SLUG}: a dry run writes nothing`);
  }
});
