// Safe to edit.
/* ============================================================================
   case-studies-schema.mjs
   ============================================================================
   The single definition of the EmDash `case_studies` schema: collection
   settings, fields, and the three taxonomies. Plus two small functions,
   applySchema() and applyTerms(), that make an instance match it.

   Both functions take a `request(method, path, body)` callback that talks to
   the EmDash REST API (paths relative to /_emdash/api, resolving to the `data`
   envelope). They import nothing, so the same source runs in Node (through
   EmDashClient, see scripts/lib/emdash-rest.mjs) or pasted into the admin
   page's console, where the signed-in browser session is the credential.

   Why REST and not the CLI: the CLI cannot create taxonomies, set select
   options, set field flags (indexed / searchable), turn on `seo`, set the
   sidebar group, or assign terms to an entry. The REST API can.

   Taxonomy naming: the template already owns a built-in `tag` taxonomy
   (label "Tags", attached to `posts`), so the case study tags taxonomy is
   named `topic` (label "Tags" would clash in the sidebar, so its label is
   "Topics"). The old MDX frontmatter key is still `tags`.
   ============================================================================ */

export const SLUG = 'case_studies';

/** Collection-level settings. */
export const COLLECTION = {
  label: 'Case Studies',
  labelSingular: 'Case Study',
  description: 'Portfolio case studies.',
  // Drafts and revisions stay on. `seo` adds the per-entry SEO panel and the
  // sitemap entry. `search` is needed for the `searchable` flags to take effect.
  supports: ['drafts', 'revisions', 'seo', 'search'],
  hasSeo: true,
  // Sidebar folder in the admin.
  group: 'Portfolio',
};

/** Flat taxonomies attached to case_studies. `terms` are seeded by the migration. */
export const TAXONOMIES = [
  { name: 'service', label: 'Services', labelSingular: 'Service', mdxKey: 'services' },
  { name: 'topic', label: 'Topics', labelSingular: 'Topic', mdxKey: 'tags' },
  { name: 'stack', label: 'Stack', labelSingular: 'Stack item', mdxKey: 'stack' },
];

/** Fields removed from the old json-array design. Deleted if still present. */
export const OBSOLETE_FIELDS = ['services', 'tags', 'stack'];

/** Field spec, in editor order. Flags: required, indexed, searchable, validation. */
export const FIELDS = [
  { slug: 'title', type: 'string', label: 'Title', required: true, searchable: true },
  { slug: 'client', type: 'string', label: 'Client', required: true },
  {
    slug: 'sector',
    type: 'select',
    label: 'Sector',
    required: true,
    indexed: true,
    validation: { options: ['church', 'school', 'nonprofit', 'small-business'] },
  },
  { slug: 'role', type: 'string', label: 'Role' },
  {
    slug: 'summary',
    type: 'text',
    label: 'Summary (max 200 chars)',
    required: true,
    searchable: true,
  },
  { slug: 'description', type: 'text', label: 'Description (max 500 chars)' },
  { slug: 'cover', type: 'image', label: 'Cover image', required: true },
  { slug: 'year', type: 'integer', label: 'Year', required: true, indexed: true },
  { slug: 'featured', type: 'boolean', label: 'Featured on the homepage', indexed: true },
  {
    slug: 'published',
    type: 'datetime',
    label: 'Published (case study date)',
    required: true,
    indexed: true,
  },
  { slug: 'updated', type: 'datetime', label: 'Updated' },
  { slug: 'live_url', type: 'url', label: 'Live site URL' },
  { slug: 'outcome', type: 'text', label: 'Outcome (one honest line, max 160)' },
  { slug: 'testimonial_quote', type: 'text', label: 'Testimonial quote' },
  { slug: 'testimonial_name', type: 'string', label: 'Testimonial name' },
  { slug: 'testimonial_title', type: 'string', label: 'Testimonial title' },
  {
    slug: 'results',
    type: 'repeater',
    label: 'Results',
    validation: {
      subFields: [{ slug: 'text', label: 'Result', type: 'string', required: true }],
    },
  },
  { slug: 'designer_note', type: 'text', label: 'Designer note' },
  { slug: 'body', type: 'portableText', label: 'Body', searchable: true },
  // SiteShowcase component
  { slug: 'showcase_desktop', type: 'image', label: 'Showcase: desktop full-page capture' },
  {
    slug: 'showcase_mobile',
    type: 'image',
    label: 'Showcase: mobile full-page capture (optional)',
  },
  { slug: 'showcase_alt', type: 'string', label: 'Showcase: alt text' },
  { slug: 'showcase_href', type: 'url', label: 'Showcase: live site link' },
  { slug: 'showcase_label', type: 'string', label: 'Showcase: address-bar label' },
  {
    slug: 'showcase_variant',
    type: 'select',
    label: 'Showcase: variant',
    validation: { options: ['scroll', 'zoom'] },
  },
  // FeatureHighlight components, in page order
  {
    slug: 'highlights',
    type: 'repeater',
    label: 'Feature highlights',
    validation: {
      subFields: [
        { slug: 'image', label: 'Screenshot', type: 'image', required: true },
        { slug: 'alt', label: 'Alt text', type: 'string', required: true },
        { slug: 'title', label: 'Title', type: 'string', required: true },
        { slug: 'caption', label: 'Caption', type: 'text', required: true },
        { slug: 'side', label: 'Image side', type: 'select', options: ['left', 'right'] },
      ],
    },
  },
  // BeforeAfter component
  { slug: 'before_image', type: 'image', label: 'Before/after: before image' },
  { slug: 'before_alt', type: 'string', label: 'Before/after: before alt' },
  { slug: 'before_label', type: 'string', label: 'Before/after: before label' },
  { slug: 'after_image', type: 'image', label: 'Before/after: after image' },
  { slug: 'after_alt', type: 'string', label: 'Before/after: after alt' },
  { slug: 'after_label', type: 'string', label: 'Before/after: after label' },
];

/** Make the instance match this file. Idempotent. Returns a log of what it did. */
export async function applySchema(request) {
  const log = [];
  const cols = (await request('GET', '/schema/collections')).items || [];
  if (!cols.some((c) => c.slug === SLUG)) {
    await request('POST', '/schema/collections', { slug: SLUG, ...COLLECTION });
    log.push(`created collection ${SLUG}`);
  } else {
    await request('PUT', `/schema/collections/${SLUG}`, COLLECTION);
    log.push(
      `updated collection settings (${COLLECTION.supports.join(', ')}; group ${COLLECTION.group})`,
    );
  }

  // Fields. The list endpoint returns the full field rows.
  const rows = (await request('GET', `/schema/collections/${SLUG}/fields`)).items || [];
  const have = new Map(rows.map((f) => [f.slug, f]));
  const fieldPath = (slug) => `/schema/collections/${SLUG}/fields/${slug}`;

  for (const slug of OBSOLETE_FIELDS) {
    if (have.has(slug)) {
      await request('DELETE', fieldPath(slug));
      have.delete(slug);
      log.push(`removed obsolete field ${slug}`);
    }
  }
  for (const [i, f] of FIELDS.entries()) {
    const body = {
      label: f.label,
      required: Boolean(f.required),
      indexed: Boolean(f.indexed),
      searchable: Boolean(f.searchable),
      validation: f.validation ?? null,
    };
    const existing = have.get(f.slug);
    if (existing && existing.type !== f.type) {
      // A type change is not safe in place (json -> repeater): drop and re-add.
      // The migration script refills the data.
      await request('DELETE', fieldPath(f.slug));
      have.delete(f.slug);
      log.push(`dropped ${f.slug} (${existing.type} -> ${f.type}); rerun the migration`);
    }
    if (have.has(f.slug)) {
      await request('PUT', fieldPath(f.slug), body);
      log.push(`updated field ${f.slug}`);
    } else {
      await request('POST', `/schema/collections/${SLUG}/fields`, {
        slug: f.slug,
        type: f.type,
        sortOrder: i,
        ...body,
      });
      log.push(`added field ${f.slug} (${f.type})`);
    }
  }

  // Taxonomies.
  const defs = (await request('GET', '/taxonomies')).taxonomies || [];
  for (const t of TAXONOMIES) {
    const def = defs.find((d) => d.name === t.name);
    if (!def) {
      await request('POST', '/taxonomies', {
        name: t.name,
        label: t.label,
        labelSingular: t.labelSingular,
        hierarchical: false,
        collections: [SLUG],
      });
      log.push(`created taxonomy ${t.name}`);
    } else if (!(def.collections || []).includes(SLUG)) {
      await request('PUT', `/taxonomies/${t.name}`, {
        collections: [...(def.collections || []), SLUG],
      });
      log.push(`attached taxonomy ${t.name}`);
    }
  }
  return log;
}

/**
 * Merge several ordered lists into one list that keeps every list's own order
 * wherever the lists agree (a topological sort, ties broken by first
 * appearance). Needed because taxonomy terms are shared: an entry shows its
 * terms in the taxonomy's term order, so the terms are ordered once, globally,
 * so that each case study still lists its stack and tags in its MDX order.
 */
export function mergeOrders(lists) {
  const seen = [];
  for (const l of lists) for (const x of l) if (!seen.includes(x)) seen.push(x);
  const before = new Map(seen.map((x) => [x, new Set()]));
  for (const l of lists) for (let i = 1; i < l.length; i++) before.get(l[i]).add(l[i - 1]);
  const out = [];
  while (out.length < seen.length) {
    const next =
      seen.find((x) => !out.includes(x) && [...before.get(x)].every((p) => out.includes(p))) ??
      seen.find((x) => !out.includes(x)); // a genuine conflict: fall back to first seen
    out.push(next);
  }
  return out;
}

/**
 * Create the terms, order them, and assign them to every entry.
 * `plan` is { <entry slug>: { service: [labels], topic: [labels], stack: [labels] } }
 * where a label is the MDX string verbatim (the server derives the slug).
 * The three taxonomies' terms are wiped and recreated in a merged order (see mergeOrders), then assigned; assignments replace whatever an entry had.
 */
export async function applyTerms(request, plan) {
  const entries = Object.entries(plan);
  for (const t of TAXONOMIES) {
    const order = mergeOrders(entries.map(([, terms]) => terms[t.name] ?? []));
    // Entries list their terms in term-creation order (the reorder endpoint only
    // changes the admin list), so wipe and recreate the terms in the merged
    // order. Assignments are rewritten right after, so nothing is lost.
    const res = await request('GET', `/taxonomies/${t.name}/terms?includeCounts=false`);
    for (const old of res.terms || []) {
      await request('DELETE', `/taxonomies/${t.name}/terms/${old.slug}`);
    }
    const byLabel = new Map();
    for (const label of order) {
      const created = await request('POST', `/taxonomies/${t.name}/terms`, { label });
      byLabel.set(label, (created.term || created).id);
    }
    for (const [slug, terms] of entries) {
      const termIds = (terms[t.name] ?? []).map((label) => byLabel.get(label));
      await request('POST', `/content/${SLUG}/${slug}/terms/${t.name}`, { termIds });
    }
  }
}
