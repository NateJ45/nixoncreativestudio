// Safe to edit.
/* ============================================================================
   emdash-schema.mjs
   ============================================================================
   The generic schema applier for the CMS build (docs/CMS-DESIGN.md, PR 3).

   Every collection in cms/schema/<collection>.mjs exports the same three
   things, the shape scripts/lib/case-studies-schema.mjs already has:

     export const SLUG = 'pricing_tiers';
     export const COLLECTION = { label, supports, group, titleField, ... };
     export const FIELDS = [ { slug, type, label, required, validation, ... } ];
     // optional:
     export const OBSOLETE_FIELDS = ['old_field'];   // deleted if still present

   and scripts/cms/apply-schema.mjs hands that module to applyCollectionSchema().

   Like case-studies-schema.mjs this file imports NOTHING, so the same source runs
   in Node (through EmDashClient, scripts/lib/emdash-rest.mjs) or pasted into the
   admin console, where the signed-in browser session is the credential.
   `request(method, path, body)` takes paths relative to /_emdash/api and
   resolves to the `data` envelope.

   Why REST and not the CLI: the CLI cannot set select options, field flags
   (indexed / searchable), the sidebar group, titleField, or admin settings.

   What applyCollectionSchema guarantees:
   - Idempotent. A second run against an instance that already matches makes no
     write (it reports "unchanged"); a field whose type changed is dropped and
     re-added (rerun the content loader afterwards to refill it).
   - Order of operations matters and is handled here: the collection is created
     with the settings the CREATE endpoint accepts, the fields are added, and
     only THEN are the settings the create endpoint rejects applied (titleField
     must name an existing field; commentsEnabled is update-only).
   - `dryRun: true` reads the instance but writes nothing; it returns the plan.

   Verified against EmDash 1.1.0 (node_modules/emdash/src/api/schemas/schema.ts,
   2026-10-03). Two limits worth knowing, both enforced by validateDef():
   - Repeater SUB-fields only carry slug, type, label, required and options.
     A `maxLength` (or any other validation) on a sub-field is silently stripped
     by the server, so a per-row character limit cannot be enforced; the
     editing guide has to state it instead. Field-level minItems / maxItems on
     the repeater itself ARE enforced.
   - Collection `titleField` and `commentsEnabled` cannot be sent on create.
   ============================================================================ */

/** Field types the REST API accepts. */
export const FIELD_TYPES = [
  'string',
  'text',
  'url',
  'number',
  'integer',
  'boolean',
  'datetime',
  'select',
  'multiSelect',
  'portableText',
  'image',
  'file',
  'reference',
  'json',
  'slug',
  'repeater',
  'blocks',
];

/** Repeater sub-fields are flat: no nested repeater, no portableText. */
export const SUB_FIELD_TYPES = [
  'string',
  'text',
  'url',
  'number',
  'integer',
  'boolean',
  'datetime',
  'select',
  'image',
];

/** Keys the server keeps on a repeater sub-field; everything else is stripped. */
const SUB_FIELD_KEYS = ['slug', 'type', 'label', 'required', 'options'];

/** Slugs EmDash owns (system columns and runtime-hydrated fields). */
export const RESERVED_FIELD_SLUGS = [
  'id',
  'slug',
  'status',
  'author_id',
  'primary_byline_id',
  'created_at',
  'updated_at',
  'published_at',
  'scheduled_at',
  'deleted_at',
  'version',
  'live_revision_id',
  'draft_revision_id',
  'terms',
  'bylines',
  'byline',
];

const SLUG_PATTERN = /^[a-z][a-z0-9_]*$/;

/* ----------------------------------------------------------------------------
   Builders for the shapes every page collection shares (CMS-DESIGN 1.1)
   ---------------------------------------------------------------------------- */

/**
 * Collection settings for a singleton (one entry, read by a fixed slug).
 * `overrides` wins, so a collection can set its own label, group and titleField.
 * Drafts and revisions stay on (Save keeps a draft, Publish makes it live, and
 * History rolls back); `routable: false` and `quickCreate: false` keep it off
 * the public router and the dashboard's "new entry" shortcut.
 */
export function singletonSettings(overrides = {}) {
  return {
    supports: ['drafts', 'revisions'],
    routable: false,
    admin: { quickCreate: false },
    group: 'Pages',
    titleField: 'seo_title',
    commentsEnabled: false,
    ...overrides,
  };
}

/**
 * The fields every `page_*` singleton starts with (CMS-DESIGN 1.1). Pass
 * `{ cta: true }` for pages that render CtaBanner so editors can override its
 * copy; empty means "use the site default".
 */
export function commonPageFields({ cta = false } = {}) {
  const fields = [
    {
      slug: 'seo_title',
      type: 'string',
      label: 'Search and tab title (max 60 characters)',
      required: true,
      validation: { maxLength: 60 },
    },
    {
      slug: 'seo_description',
      type: 'text',
      label: 'Search description (50 to 160 characters)',
      required: true,
      validation: { minLength: 50, maxLength: 160 },
    },
  ];
  if (cta) {
    fields.push(
      {
        slug: 'cta_title',
        type: 'string',
        label: 'Closing banner title (max 60; empty uses the site default)',
        validation: { maxLength: 60 },
      },
      {
        slug: 'cta_sub',
        type: 'text',
        label: 'Closing banner text (max 200; empty uses the site default)',
        validation: { maxLength: 200 },
      },
    );
  }
  return fields;
}

/* ----------------------------------------------------------------------------
   Validation of a definition (no network)
   ---------------------------------------------------------------------------- */

/**
 * Check a schema module before it is sent anywhere. Returns
 * { errors, warnings }; errors would be rejected (or silently mangled) by the
 * server, warnings are limits the design needs the editing guide to cover.
 */
export function validateDef(def) {
  const errors = [];
  const warnings = [];
  const where = def?.SLUG ?? '(no SLUG)';
  if (!def || typeof def.SLUG !== 'string' || !SLUG_PATTERN.test(def.SLUG)) {
    errors.push(`${where}: SLUG must match ${SLUG_PATTERN}`);
  }
  if (!def?.COLLECTION || typeof def.COLLECTION.label !== 'string' || !def.COLLECTION.label) {
    errors.push(`${where}: COLLECTION.label is required`);
  }
  if (!Array.isArray(def?.FIELDS) || def.FIELDS.length === 0) {
    errors.push(`${where}: FIELDS must be a non-empty array`);
    return { errors, warnings };
  }
  const seen = new Set();
  for (const f of def.FIELDS) {
    const at = `${where}.${f?.slug ?? '(no slug)'}`;
    if (typeof f?.slug !== 'string' || !SLUG_PATTERN.test(f.slug)) {
      errors.push(`${at}: slug must match ${SLUG_PATTERN}`);
      continue;
    }
    if (RESERVED_FIELD_SLUGS.includes(f.slug)) errors.push(`${at}: slug is reserved by EmDash`);
    if (seen.has(f.slug)) errors.push(`${at}: duplicate field slug`);
    seen.add(f.slug);
    if (!FIELD_TYPES.includes(f.type)) errors.push(`${at}: unknown type "${f.type}"`);
    if (!f.label) errors.push(`${at}: label is required`);
    const v = f.validation ?? {};
    if (f.type === 'select' || f.type === 'multiSelect') {
      if (!Array.isArray(v.options) || v.options.length === 0) {
        errors.push(`${at}: a ${f.type} needs validation.options`);
      }
    }
    if (f.type === 'repeater') {
      if (!Array.isArray(v.subFields) || v.subFields.length === 0) {
        errors.push(`${at}: a repeater needs validation.subFields`);
      } else {
        const subSeen = new Set();
        for (const s of v.subFields) {
          const sat = `${at}.${s?.slug ?? '(no slug)'}`;
          if (typeof s?.slug !== 'string' || !SLUG_PATTERN.test(s.slug)) {
            errors.push(`${sat}: sub-field slug must match ${SLUG_PATTERN}`);
          }
          if (subSeen.has(s?.slug)) errors.push(`${sat}: duplicate sub-field slug`);
          subSeen.add(s?.slug);
          if (!SUB_FIELD_TYPES.includes(s?.type)) {
            errors.push(`${sat}: sub-field type "${s?.type}" is not allowed (flat types only)`);
          }
          if (!s?.label) errors.push(`${sat}: sub-field label is required`);
          if (s?.type === 'select' && !(Array.isArray(s.options) && s.options.length)) {
            errors.push(`${sat}: a select sub-field needs options`);
          }
          const dropped = Object.keys(s ?? {}).filter((k) => !SUB_FIELD_KEYS.includes(k));
          if (dropped.length) {
            warnings.push(
              `${sat}: ${dropped.join(', ')} is not enforced (EmDash keeps only ${SUB_FIELD_KEYS.join(', ')} on a sub-field); state the limit in the editing guide`,
            );
          }
        }
      }
      if (v.maxItems !== undefined && v.maxItems < 1) {
        errors.push(`${at}: maxItems must be at least 1`);
      }
    }
    for (const [lo, hi] of [
      ['min', 'max'],
      ['minLength', 'maxLength'],
      ['minItems', 'maxItems'],
    ]) {
      if (v[lo] !== undefined && v[hi] !== undefined && v[lo] > v[hi]) {
        errors.push(`${at}: ${lo} is greater than ${hi}`);
      }
    }
    if (v.pattern !== undefined) {
      try {
        new RegExp(v.pattern);
      } catch {
        errors.push(`${at}: validation.pattern is not a valid regular expression`);
      }
    }
    // The design's rule: every free-text string field carries a maxLength, so a
    // layout cannot be broken by an over-long edit.
    if ((f.type === 'string' || f.type === 'text') && v.maxLength === undefined && !f.unbounded) {
      warnings.push(
        `${at}: no validation.maxLength (CMS-DESIGN section 0 item 2); set one or mark the field unbounded: true`,
      );
    }
  }
  const tf = def.COLLECTION?.titleField;
  if (tf && !seen.has(tf)) errors.push(`${where}: COLLECTION.titleField "${tf}" is not a field`);
  for (const col of def.COLLECTION?.admin?.listColumns ?? []) {
    if (!seen.has(col)) errors.push(`${where}: admin.listColumns "${col}" is not a field`);
  }
  for (const obs of def.OBSOLETE_FIELDS ?? []) {
    if (seen.has(obs)) errors.push(`${where}: "${obs}" is both a field and in OBSOLETE_FIELDS`);
  }
  return { errors, warnings };
}

/* ----------------------------------------------------------------------------
   Comparison helpers (so a rerun on a matching instance writes nothing)
   ---------------------------------------------------------------------------- */

/** JSON with sorted keys, dropping undefined, null and empty arrays/objects. */
export function stable(value) {
  const clean = (v) => {
    if (Array.isArray(v)) {
      const arr = v.map(clean);
      return arr.length ? arr : undefined;
    }
    if (v && typeof v === 'object') {
      const out = {};
      for (const k of Object.keys(v).sort()) {
        const c = clean(v[k]);
        if (c !== undefined) out[k] = c;
      }
      return Object.keys(out).length ? out : undefined;
    }
    return v === null || v === '' ? undefined : v;
  };
  return JSON.stringify(clean(value) ?? null);
}

/** Keep only the sub-field keys the server keeps, so a rerun compares cleanly. */
function normalizeValidation(validation) {
  if (!validation) return null;
  const v = { ...validation };
  if (Array.isArray(v.subFields)) {
    v.subFields = v.subFields.map((s) => {
      const out = {};
      for (const k of SUB_FIELD_KEYS) if (s[k] !== undefined) out[k] = s[k];
      return out;
    });
  }
  return v;
}

/** The body sent to POST/PUT for a field. */
function fieldBody(f) {
  return {
    label: f.label,
    required: Boolean(f.required),
    indexed: Boolean(f.indexed),
    searchable: Boolean(f.searchable),
    validation: normalizeValidation(f.validation),
  };
}

/** True when an existing field row already matches the wanted body. */
function fieldMatches(existing, body) {
  return (
    existing.label === body.label &&
    Boolean(existing.required) === body.required &&
    Boolean(existing.indexed) === body.indexed &&
    Boolean(existing.searchable) === body.searchable &&
    // The server may fold `required` into validation or reorder keys; compare
    // without the flags it echoes.
    stable({ ...existing.validation, required: undefined }) ===
      stable({ ...body.validation, required: undefined })
  );
}

/** Settings the CREATE endpoint rejects or ignores; applied by PUT afterwards. */
const UPDATE_ONLY = ['titleField', 'commentsEnabled'];

/** True when the existing collection already has every wanted setting. */
function collectionMatches(existing, wanted) {
  for (const [k, v] of Object.entries(wanted)) {
    const have = existing[k];
    if (stable(have) === stable(v)) continue;
    // supports is an unordered set.
    if (k === 'supports' && stable([...(have ?? [])].sort()) === stable([...v].sort())) continue;
    // A boolean flag that the server stores as 0/1 or omits when false.
    if (typeof v === 'boolean' && Boolean(have) === v) continue;
    return false;
  }
  return true;
}

/* ----------------------------------------------------------------------------
   The applier
   ---------------------------------------------------------------------------- */

/**
 * Make the instance match `def` (a cms/schema/<collection>.mjs module).
 * Idempotent. Returns a log of what it did (or, with dryRun, would do).
 *
 *   request  async (method, path, body) => data     (REST, see emdash-rest.mjs)
 *   opts.dryRun  read only; every write is logged as "would ..." and skipped
 */
export async function applyCollectionSchema(request, def, opts = {}) {
  const { errors } = validateDef(def);
  if (errors.length) throw new Error(`invalid schema definition:\n  ${errors.join('\n  ')}`);

  const dry = Boolean(opts.dryRun);
  const log = [];
  const say = (msg) => log.push(dry ? `would ${msg}` : msg);
  const write = async (method, path, body) => {
    if (!dry) return request(method, path, body);
    return undefined;
  };

  const { SLUG, COLLECTION, FIELDS } = def;
  const fieldPath = (slug) => `/schema/collections/${SLUG}/fields/${slug}`;

  // 1. Collection. Create with what the create endpoint takes, update the rest later.
  const cols = (await request('GET', '/schema/collections')).items || [];
  const existingCol = cols.find((c) => c.slug === SLUG);
  const createSettings = { ...COLLECTION };
  for (const k of UPDATE_ONLY) delete createSettings[k];
  if (!existingCol) {
    await write('POST', '/schema/collections', { slug: SLUG, ...createSettings });
    say(`created collection ${SLUG}`);
  }

  // 2. Fields. In a dry run on a collection that does not exist yet there is
  // nothing to read; treat it as empty.
  const rows =
    existingCol || !dry
      ? (await request('GET', `/schema/collections/${SLUG}/fields`)).items || []
      : [];
  const have = new Map(rows.map((f) => [f.slug, f]));

  for (const slug of def.OBSOLETE_FIELDS ?? []) {
    if (have.has(slug)) {
      await write('DELETE', fieldPath(slug));
      have.delete(slug);
      say(`removed obsolete field ${slug}`);
    }
  }

  for (const [i, f] of FIELDS.entries()) {
    const body = fieldBody(f);
    const existing = have.get(f.slug);
    if (existing && existing.type !== f.type) {
      // A type change is not safe in place: drop and re-add. The loader refills it.
      await write('DELETE', fieldPath(f.slug));
      have.delete(f.slug);
      say(`dropped ${f.slug} (${existing.type} -> ${f.type}); rerun the content loader`);
    }
    const current = have.get(f.slug);
    if (current) {
      if (fieldMatches(current, body)) {
        log.push(`unchanged field ${f.slug}`);
      } else {
        await write('PUT', fieldPath(f.slug), body);
        say(`updated field ${f.slug}`);
      }
    } else {
      await write('POST', `/schema/collections/${SLUG}/fields`, {
        slug: f.slug,
        type: f.type,
        sortOrder: i,
        ...body,
      });
      say(`added field ${f.slug} (${f.type})`);
    }
  }

  // 3. Field order. The editor shows fields in sortOrder; fix it only when it differs.
  if (!dry || existingCol) {
    const after = ((await request('GET', `/schema/collections/${SLUG}/fields`)).items || [])
      .slice()
      .sort((a, b) => (a.sortOrder ?? a.sort_order ?? 0) - (b.sortOrder ?? b.sort_order ?? 0))
      .map((f) => f.slug);
    const wanted = FIELDS.map((f) => f.slug);
    const extras = after.filter((s) => !wanted.includes(s));
    const desired = [...wanted, ...extras];
    if (!dry && stable(after) !== stable(desired)) {
      await request('POST', `/schema/collections/${SLUG}/fields/reorder`, {
        fieldSlugs: desired,
      });
      log.push('reordered fields');
    } else if (dry && existingCol && stable(after) !== stable(desired)) {
      say('reorder fields');
    }
  }

  // 4. Collection settings, including the update-only ones (titleField needs the fields above).
  const fresh = dry && !existingCol ? undefined : existingCol;
  if (!fresh || !collectionMatches(fresh, COLLECTION)) {
    await write('PUT', `/schema/collections/${SLUG}`, COLLECTION);
    say(`applied collection settings (group ${COLLECTION.group ?? 'none'})`);
  } else {
    log.push('unchanged collection settings');
  }
  return log;
}
