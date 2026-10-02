// Safe to edit.
/* ============================================================================
   migrate-case-studies.mjs
   ============================================================================
   Migrates the 9 MDX case studies in src/content/case-studies/ into the EmDash
   `case_studies` collection. Idempotent: images are de-duplicated by content
   hash, and an entry whose slug already exists is updated, not duplicated.

     node scripts/emdash-schema-case-studies.mjs --url https://<instance>   (once)
     node scripts/migrate-case-studies.mjs       --url https://<instance>
     node scripts/migrate-case-studies.mjs       --url ... --only second-presbyterian-chicago
     node scripts/migrate-case-studies.mjs       --url ... --dry-run
     node scripts/migrate-case-studies.mjs       --url ... --terms-out terms-plan.json

   Terms (services, tags, stack): these are taxonomies, not fields. They are
   assigned through the REST API, which needs EMDASH_TOKEN. With no token, pass
   --terms-out <file> to write the plan ({ slug: { service: [...], topic: [...],
   stack: [...] } }) instead, then apply it with applyTerms() from the
   admin console (docs/EMDASH-SCHEMA.md, "Re-creating the schema").

   Mapping (full detail in docs/EMDASH-SCHEMA.md):
     services / tags / stack -> terms in the `service`, `topic` and `stack`
                              taxonomies (labels are the MDX strings, verbatim)
     results               -> repeater rows [{ text }]
     frontmatter           -> same-named fields (liveUrl -> live_url,
                              designerNote -> designer_note, testimonial.* ->
                              testimonial_quote/name/title)
     cover                 -> cover (image)
     <SiteShowcase>        -> showcase_* fields. The desktop/mobile images are NOT
                              props in the MDX; the component resolves
                              shots/<slug>-home.png and shots/<slug>-mobile.png by
                              slug, so this script does the same lookup.
     <FeatureHighlight>    -> highlights[] ({image, alt, title, caption, side}),
                              in page order. MDX `body` prop becomes `caption`.
     <BeforeAfter>         -> before_* / after_* fields
     <Lightbox />, imports, JSX comments -> dropped (templates render the lightbox
                              whenever highlights exist)
     remaining Markdown    -> body (Portable Text via emdash's own
                              markdownToPortableText)

   Needs the `emdash` CLI login for the instance (see scripts/lib/emdash-cli.mjs).
   ============================================================================ */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { markdownToPortableText } from 'emdash/client';
import { emdash, withJsonFile } from './lib/emdash-cli.mjs';
import { applyTerms } from './lib/case-studies-schema.mjs';
import { restRequest } from './lib/emdash-rest.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CS_DIR = join(ROOT, 'src/content/case-studies');
const SHOTS_DIR = join(ROOT, 'src/assets/case-studies/shots');
const COLLECTION = 'case_studies';

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const flag = (name) => process.argv.includes(`--${name}`);
const url = (arg('url') || process.env.EMDASH_URL || '').replace(/\/$/, '');
const only = arg('only');
const dryRun = flag('dry-run');
const termsOut = arg('terms-out');
if (!url) {
  console.error(
    'Usage: node scripts/migrate-case-studies.mjs --url <instance> [--only <slug>] [--dry-run]',
  );
  process.exit(1);
}

/* ----------------------------------------------------------------------------
   Media: upload once per distinct file, reuse by sha1 content hash
   ---------------------------------------------------------------------------- */
const mediaByHash = new Map();
function loadExistingMedia() {
  let cursor;
  do {
    const args = ['media', 'list', '--limit', '100'];
    if (cursor) args.push('--cursor', cursor);
    const page = emdash(url, args);
    for (const m of page.items || []) if (m.contentHash) mediaByHash.set(m.contentHash, m);
    cursor = page.nextCursor || undefined;
  } while (cursor);
}

const sha1 = (file) => 'sha1:' + createHash('sha1').update(readFileSync(file)).digest('hex');

/** Upload `file` (or reuse an identical one) and return an EmDash image value. */
function imageValue(file, alt) {
  if (!existsSync(file)) throw new Error(`image not found: ${file}`);
  const hash = sha1(file);
  let m = mediaByHash.get(hash);
  if (!m) {
    if (dryRun) {
      console.log(`    [dry-run] would upload ${basename(file)}`);
      return { id: 'DRY', alt };
    }
    m = emdash(url, ['media', 'upload', file]);
    mediaByHash.set(m.contentHash || hash, m);
    console.log(`    uploaded ${basename(file)} (${(m.size / 1024).toFixed(0)} KB)`);
  }
  return {
    id: m.id,
    src: m.url,
    alt: alt ?? '',
    width: m.width,
    height: m.height,
    provider: 'local',
    meta: { storageKey: m.storageKey },
  };
}

/* ----------------------------------------------------------------------------
   MDX parsing
   ---------------------------------------------------------------------------- */
function splitMdx(text) {
  const m = text.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error('no frontmatter');
  return { fm: yaml.load(m[1]), rest: m[2] };
}

/** import foo from '../../assets/...png' lines -> { foo: absolute path } */
function parseImages(rest, mdxDir) {
  const map = {};
  for (const m of rest.matchAll(/^import\s+(\w+)\s+from\s+'([^']+\.(?:png|jpe?g|webp))';?\s*$/gm)) {
    map[m[1]] = resolve(mdxDir, m[2]);
  }
  return map;
}

/** Parse the attributes of one JSX tag: name="str" or name={ident}. */
function parseAttrs(src) {
  const attrs = {};
  for (const m of src.matchAll(/(\w+)=(?:"([^"]*)"|\{(\w+)\})/g)) {
    attrs[m[1]] = m[2] !== undefined ? { str: m[2] } : { ident: m[3] };
  }
  return attrs;
}
const str = (a, k) => (a[k] && a[k].str !== undefined ? a[k].str : undefined);

function extract(rest, imgs) {
  const comps = { showcase: null, highlights: [], beforeAfter: null };
  for (const m of rest.matchAll(/<(SiteShowcase|FeatureHighlight|BeforeAfter)\b([\s\S]*?)\/>/g)) {
    const a = parseAttrs(m[2]);
    const imgOf = (k) => {
      const id = a[k]?.ident;
      if (!id || !imgs[id]) throw new Error(`<${m[1]}> prop ${k}: unresolved import`);
      return imgs[id];
    };
    if (m[1] === 'SiteShowcase') {
      comps.showcase = {
        slug: str(a, 'slug'),
        alt: str(a, 'alt'),
        href: str(a, 'href'),
        label: str(a, 'label'),
        variant: str(a, 'variant') || 'scroll',
      };
    } else if (m[1] === 'FeatureHighlight') {
      comps.highlights.push({
        file: imgOf('src'),
        alt: str(a, 'alt'),
        title: str(a, 'title'),
        caption: str(a, 'body'),
        side: str(a, 'side') || 'left',
        eyebrow: str(a, 'eyebrow'),
      });
    } else {
      comps.beforeAfter = {
        beforeFile: imgOf('before'),
        afterFile: imgOf('after'),
        beforeAlt: str(a, 'beforeAlt'),
        afterAlt: str(a, 'afterAlt'),
        beforeLabel: str(a, 'beforeLabel') || 'Before',
        afterLabel: str(a, 'afterLabel') || 'After',
      };
    }
  }
  return comps;
}

/** Strip imports, JSX components, the Lightbox, and JSX comments; keep Markdown. */
function proseOf(rest) {
  let t = rest
    .replace(/^import\s.+$/gm, '')
    .replace(/<(SiteShowcase|FeatureHighlight|BeforeAfter)\b[\s\S]*?\/>/g, '')
    .replace(/<Lightbox\s*\/>/g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  // emdash's converter reads _x_ as emphasis but not *x*; normalise single-star italics.
  t = t.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1_$2_');
  return t.replace(/\n{3,}/g, '\n\n').trim();
}

/* ----------------------------------------------------------------------------
   Build one entry
   ---------------------------------------------------------------------------- */
function buildEntry(file) {
  const slug = basename(file, '.mdx');
  const mdxDir = dirname(file);
  const { fm, rest } = splitMdx(readFileSync(file, 'utf8'));
  const imgs = parseImages(rest, mdxDir);
  const comps = extract(rest, imgs);

  const coverFile = resolve(mdxDir, fm.cover);
  const data = {
    title: fm.title,
    client: fm.client,
    sector: fm.sector,
    summary: fm.summary,
    cover: imageValue(coverFile, `The ${fm.client} homepage`),
    year: fm.year,
    featured: fm.featured ?? false,
    // js-yaml parses 2026-05-01 as a UTC Date, so this is exactly 2026-05-01T00:00:00.000Z
    published: new Date(fm.published).toISOString(),
  };
  for (const [from, to] of [
    ['role', 'role'],
    ['description', 'description'],
    ['liveUrl', 'live_url'],
    ['outcome', 'outcome'],
    ['designerNote', 'designer_note'],
  ]) {
    if (fm[from] !== undefined) data[to] = fm[from];
  }
  // results: array of strings in the MDX, repeater rows { text } in EmDash.
  if (fm.results) data.results = fm.results.map((text) => ({ text }));
  if (fm.updated) data.updated = new Date(fm.updated).toISOString();
  if (fm.testimonial) {
    data.testimonial_quote = fm.testimonial.quote;
    data.testimonial_name = fm.testimonial.name;
    if (fm.testimonial.title) data.testimonial_title = fm.testimonial.title;
  }

  if (comps.showcase) {
    const s = comps.showcase;
    data.showcase_desktop = imageValue(join(SHOTS_DIR, `${s.slug}-home.png`), s.alt);
    const mobile = join(SHOTS_DIR, `${s.slug}-mobile.png`);
    if (existsSync(mobile)) data.showcase_mobile = imageValue(mobile, '');
    data.showcase_alt = s.alt;
    data.showcase_href = s.href;
    data.showcase_label = s.label;
    data.showcase_variant = s.variant;
  }
  if (comps.highlights.length) {
    data.highlights = comps.highlights.map((h) => {
      const row = {
        image: imageValue(h.file, h.alt),
        alt: h.alt,
        title: h.title,
        caption: h.caption,
        side: h.side,
      };
      if (h.eyebrow) row.eyebrow = h.eyebrow;
      return row;
    });
  }
  if (comps.beforeAfter) {
    const b = comps.beforeAfter;
    data.before_image = imageValue(b.beforeFile, b.beforeAlt);
    data.before_alt = b.beforeAlt;
    data.before_label = b.beforeLabel;
    data.after_image = imageValue(b.afterFile, b.afterAlt);
    data.after_alt = b.afterAlt;
    data.after_label = b.afterLabel;
  }
  data.body = markdownToPortableText(proseOf(rest));
  // Taxonomy terms: label = the MDX string, verbatim.
  const terms = {
    service: fm.services ?? [],
    topic: fm.tags ?? [],
    stack: fm.stack ?? [],
  };
  return { slug, data, terms };
}

/* ----------------------------------------------------------------------------
   Create or update
   ---------------------------------------------------------------------------- */
function getExisting(slug) {
  try {
    return emdash(url, ['content', 'get', COLLECTION, slug, '--raw']);
  } catch (e) {
    if (/not found/i.test(e.message)) return null;
    throw e;
  }
}

function upsert({ slug, data }) {
  const existing = getExisting(slug);
  return withJsonFile(data, (f) => {
    if (!existing) {
      const r = emdash(url, ['content', 'create', COLLECTION, '--slug', slug, '--file', f]);
      return { action: 'created', id: r.id };
    }
    const rev = existing._rev || existing.item?._rev;
    if (!rev) throw new Error(`no _rev on existing ${slug}`);
    emdash(url, ['content', 'update', COLLECTION, existing.id || slug, '--rev', rev, '--file', f]);
    return { action: 'updated', id: existing.id };
  });
}

async function main() {
  const request = restRequest(url, arg('token'));
  if (!request && !termsOut && !dryRun) {
    throw new Error(
      'Set EMDASH_TOKEN to assign terms, or pass --terms-out <file> to write a plan.',
    );
  }
  const termPlan = {};
  const files = readdirSync(CS_DIR)
    .filter((f) => f.endsWith('.mdx'))
    .filter((f) => !only || basename(f, '.mdx') === only)
    .sort();
  if (!files.length) throw new Error('no case studies matched');
  if (!dryRun) loadExistingMedia();
  console.log(`${files.length} case studies -> ${url}`);
  for (const f of files) {
    const slug = basename(f, '.mdx');
    console.log(`- ${slug}`);
    const entry = buildEntry(join(CS_DIR, f));
    if (dryRun) {
      console.log(`    [dry-run] fields: ${Object.keys(entry.data).join(', ')}`);
      continue;
    }
    const r = upsert(entry);
    console.log(`    ${r.action} ${r.id}`);
    termPlan[slug] = entry.terms;
  }
  if (request && !dryRun) await applyTerms(request, termPlan);
  if (termsOut) writeFileSync(termsOut, JSON.stringify(termPlan, null, 2));
  console.log('done');
}

await main();
