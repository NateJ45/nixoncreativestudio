// Safe to edit.
/* ============================================================================
   emdash-schema-case-studies.mjs
   ============================================================================
   Creates (or tops up) the `case_studies` collection on an EmDash instance.
   Idempotent: an existing collection or field is left alone, missing fields are
   added.

     node scripts/emdash-schema-case-studies.mjs --url https://<instance>

   Drives the `emdash` CLI (see scripts/lib/emdash-cli.mjs), which uses the
   stored login. The CLI's `schema add-field` only takes --type, --label and
   --required. It cannot set validation, so:
     - `sector` and `showcase_variant` are `select` fields WITHOUT an options
       list (any string is accepted; the allowed values are documented in
       docs/EMDASH-SCHEMA.md and enforced by the migration script).
     - `highlights` is a `repeater` WITHOUT subFields. The data is stored and
       returned exactly as written (verified), but the admin editor has no
       sub-field form for it until the sub-fields are added in the admin's
       Content Types screen (Case Studies > highlights > Sub-fields: image
       (image), alt (string), title (string), caption (text), side (select)).
     - String lists (services, tags, stack, results) are `json` arrays, because
       the CLI rejects `multiSelect`.
   Everything the CLI cannot express is listed in `validation` below so a future
   REST-based run (or the admin UI) can apply it. Nothing here is silently lost.
   ============================================================================ */
import { emdash } from './lib/emdash-cli.mjs';

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const url = (arg('url') || process.env.EMDASH_URL || '').replace(/\/$/, '');
if (!url) {
  console.error('Usage: node scripts/emdash-schema-case-studies.mjs --url <instance>');
  process.exit(1);
}

export const SLUG = 'case_studies';

/** Field spec. `validation` is documentation of intent (see header). */
export const FIELDS = [
  { slug: 'title', type: 'string', label: 'Title', required: true },
  { slug: 'client', type: 'string', label: 'Client', required: true },
  {
    slug: 'sector',
    type: 'select',
    label: 'Sector',
    required: true,
    validation: { options: ['church', 'school', 'nonprofit', 'small-business'] },
  },
  { slug: 'services', type: 'json', label: 'Services (list of strings)' },
  { slug: 'role', type: 'string', label: 'Role' },
  { slug: 'tags', type: 'json', label: 'Tags (list of strings)' },
  { slug: 'stack', type: 'json', label: 'Stack (list of strings)' },
  { slug: 'summary', type: 'text', label: 'Summary (max 200 chars)', required: true },
  { slug: 'description', type: 'text', label: 'Description (max 500 chars)' },
  { slug: 'cover', type: 'image', label: 'Cover image', required: true },
  { slug: 'year', type: 'integer', label: 'Year', required: true },
  { slug: 'featured', type: 'boolean', label: 'Featured on the homepage' },
  { slug: 'published', type: 'datetime', label: 'Published (case study date)', required: true },
  { slug: 'updated', type: 'datetime', label: 'Updated' },
  { slug: 'live_url', type: 'url', label: 'Live site URL' },
  { slug: 'outcome', type: 'text', label: 'Outcome (one honest line, max 160)' },
  { slug: 'testimonial_quote', type: 'text', label: 'Testimonial quote' },
  { slug: 'testimonial_name', type: 'string', label: 'Testimonial name' },
  { slug: 'testimonial_title', type: 'string', label: 'Testimonial title' },
  { slug: 'results', type: 'json', label: 'Results (list of strings)' },
  { slug: 'designer_note', type: 'text', label: 'Designer note' },
  { slug: 'body', type: 'portableText', label: 'Body' },
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
        { slug: 'side', label: 'Image side', type: 'select' },
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

function main() {
  const existing = emdash(url, ['schema', 'list']);
  const list = Array.isArray(existing) ? existing : existing.items || [];
  if (!list.some((c) => c.slug === SLUG)) {
    emdash(url, [
      'schema',
      'create',
      SLUG,
      '--label',
      'Case Studies',
      '--label-singular',
      'Case Study',
      '--description',
      'Portfolio case studies (migrated from MDX).',
    ]);
    console.log(`created collection ${SLUG}`);
  }
  const have = new Set((emdash(url, ['schema', 'get', SLUG]).fields || []).map((f) => f.slug));
  for (const f of FIELDS) {
    if (have.has(f.slug)) continue;
    const args = ['schema', 'add-field', SLUG, f.slug, '--type', f.type, '--label', f.label];
    if (f.required) args.push('--required');
    emdash(url, args);
    console.log(`added field ${f.slug} (${f.type})`);
  }
  console.log('schema ok');
}

main();
