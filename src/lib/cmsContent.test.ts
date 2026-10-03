import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { entriesOfJson } from './cmsFallback.ts';

// The committed fallback JSON is what the site serves when the CMS has nothing
// (and what the loader pushes into EmDash), so it must satisfy the schema the
// server will enforce. EmDash validates a field's required flag, maxLength,
// minLength, min, max, pattern, select options and repeater item counts; this
// test applies the same rules offline so a bad literal fails a PR, not a load.

interface Field {
  slug: string;
  type: string;
  required?: boolean;
  validation?: {
    maxLength?: number;
    minLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[];
    minItems?: number;
    maxItems?: number;
  };
}

const schemaDir = join(process.cwd(), 'cms/schema');
const contentDir = join(process.cwd(), 'cms/content');

function problems(fields: Field[], data: Record<string, unknown>, where: string): string[] {
  const out: string[] = [];
  const known = new Set(fields.map((f) => f.slug));
  for (const key of Object.keys(data)) {
    if (!known.has(key)) out.push(`${where}: "${key}" is not a field in the schema`);
  }
  for (const f of fields) {
    const v = data[f.slug];
    const at = `${where}.${f.slug}`;
    const blank = v === undefined || v === null || v === '';
    if (blank) {
      if (f.required) out.push(`${at}: required but empty`);
      continue;
    }
    const rules = f.validation ?? {};
    if (typeof v === 'string') {
      if (rules.maxLength !== undefined && v.length > rules.maxLength)
        out.push(`${at}: ${v.length} characters, maxLength ${rules.maxLength}`);
      if (rules.minLength !== undefined && v.length < rules.minLength)
        out.push(`${at}: ${v.length} characters, minLength ${rules.minLength}`);
      if (rules.pattern && !new RegExp(rules.pattern).test(v))
        out.push(`${at}: does not match ${rules.pattern}`);
      if (f.type === 'select' && rules.options && !rules.options.includes(v))
        out.push(`${at}: "${v}" is not one of ${rules.options.join(', ')}`);
      if (f.type === 'url' && !/^https?:\/\//.test(v)) out.push(`${at}: not an http(s) URL`);
    }
    if (typeof v === 'number') {
      if (rules.min !== undefined && v < rules.min) out.push(`${at}: below min ${rules.min}`);
      if (rules.max !== undefined && v > rules.max) out.push(`${at}: above max ${rules.max}`);
    }
    if (f.type === 'repeater') {
      const n = Array.isArray(v) ? v.length : 0;
      if (rules.minItems !== undefined && n < rules.minItems)
        out.push(`${at}: ${n} rows, minItems ${rules.minItems}`);
      if (rules.maxItems !== undefined && n > rules.maxItems)
        out.push(`${at}: ${n} rows, maxItems ${rules.maxItems}`);
    }
  }
  return out;
}

test('every cms/content/<collection>.json satisfies its cms/schema definition', async () => {
  if (!existsSync(contentDir) || !existsSync(schemaDir)) return;
  let checked = 0;
  for (const file of readdirSync(contentDir).filter((f) => f.endsWith('.json'))) {
    const name = file.replace(/\.json$/, '');
    const schemaFile = join(schemaDir, `${name}.mjs`);
    // menus.json, redirects.json and content for a collection not defined yet have no schema here.
    if (!existsSync(schemaFile)) continue;
    const mod = await import(pathToFileURL(schemaFile).href);
    const json = JSON.parse(readFileSync(join(contentDir, file), 'utf8'));
    const entries = entriesOfJson(json);
    assert.ok(entries.length > 0, `${file}: no entries (each needs "slug" and "data")`);
    for (const e of entries) {
      const found = problems(mod.FIELDS as Field[], e.data, `${name}/${e.slug}`);
      assert.deepEqual(found, [], found.join('\n'));
    }
    checked += 1;
  }
  assert.ok(checked > 0, 'expected at least one content file with a schema');
});

test('menus.json has well-formed menus (label, internal or absolute url, no empty items)', () => {
  const file = join(contentDir, 'menus.json');
  if (!existsSync(file)) return;
  const menus = JSON.parse(readFileSync(file, 'utf8')) as Record<
    string,
    { label?: string; items?: { label?: string; url?: string }[] }
  >;
  for (const [name, menu] of Object.entries(menus)) {
    assert.ok(menu.label, `${name}: menu needs a label`);
    assert.ok(menu.items?.length, `${name}: menu needs items`);
    for (const item of menu.items ?? []) {
      assert.ok(item.label, `${name}: item without a label`);
      assert.match(item.url ?? '', /^(\/|https?:\/\/)/, `${name}/${item.label}: bad url`);
    }
  }
});
