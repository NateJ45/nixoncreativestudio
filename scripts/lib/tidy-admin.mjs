// Safe to edit.
/* ============================================================================
   tidy-admin.mjs
   ============================================================================
   The one admin-tidy step that is data, not collection settings (CMS-DESIGN PR 14,
   section 4): retire the EmDash template's unused `category` taxonomy, so the
   sidebar shows only the taxonomies the site reads (Services, Stack, Topics, Tags).

   Sidebar order, groups, labels and the "live view" addresses are collection
   settings and travel through cms/schema/*.mjs and `npm run cms:production-load`
   like everything else. A taxonomy is not a collection, so the loader does not
   see it; this is the small script that does (scripts/cms/tidy-admin.mjs).

   Like the schema applier it imports nothing, takes `request(method, path, body)`
   (paths relative to /_emdash/api, resolving to the `data` envelope) and has a
   `dryRun` that reads and writes nothing. It refuses to delete a taxonomy that
   still has terms, because deleting it would drop them.

   It also REPORTS (never changes) the screens EmDash cannot hide: widget areas,
   sections and menus other than the two the site uses. An empty screen is what
   the editing guide promises, so a leftover shows up here.
   ============================================================================ */

/** Taxonomies the site reads. Anything else is reported; only RETIRE ones are deleted. */
export const KEEP_TAXONOMIES = ['service', 'topic', 'stack', 'tag'];
export const RETIRE_TAXONOMIES = ['category'];
export const KEEP_MENUS = ['primary', 'footer'];

const list = (d, ...keys) => {
  for (const k of keys) if (Array.isArray(d?.[k])) return d[k];
  return Array.isArray(d) ? d : [];
};

/**
 * Returns a log of what it did (or, with dryRun, would do). Throws only on a
 * request error; a taxonomy with terms is reported and skipped, not an error.
 */
export async function tidyAdmin(request, { dryRun = false } = {}) {
  const log = [];
  const say = (m) => log.push(dryRun ? `would ${m}` : m);

  const taxonomies = list(await request('GET', '/taxonomies'), 'taxonomies', 'items');
  const names = taxonomies.map((t) => t.name);

  for (const name of RETIRE_TAXONOMIES) {
    if (!names.includes(name)) {
      log.push(`unchanged taxonomy ${name} (already gone)`);
      continue;
    }
    const terms = list(await request('GET', `/taxonomies/${name}/terms`), 'terms', 'items');
    if (terms.length) {
      log.push(
        `skipped taxonomy ${name}: it still has ${terms.length} term(s), so deleting it would drop them`,
      );
      continue;
    }
    if (!dryRun) await request('DELETE', `/taxonomies/${name}`);
    say(`deleted taxonomy ${name} (empty, unused by the site)`);
  }

  const unexpected = names.filter(
    (n) => !KEEP_TAXONOMIES.includes(n) && !RETIRE_TAXONOMIES.includes(n),
  );
  if (unexpected.length)
    log.push(`report: unexpected taxonomies left alone: ${unexpected.join(', ')}`);

  const areas = list(await request('GET', '/widget-areas'), 'areas', 'items');
  log.push(
    areas.length
      ? `report: ${areas.length} widget area(s) exist (${areas.map((a) => a.name).join(', ')}); the site uses none`
      : 'unchanged widget areas (none)',
  );
  const sections = list(await request('GET', '/sections'), 'sections', 'items');
  log.push(
    sections.length
      ? `report: ${sections.length} section(s) exist; the site uses none`
      : 'unchanged sections (none)',
  );
  const menus = list(await request('GET', '/menus'), 'menus', 'items').map((m) => m.name);
  const extra = menus.filter((m) => !KEEP_MENUS.includes(m));
  log.push(
    extra.length
      ? `report: unexpected menus left alone: ${extra.join(', ')}`
      : 'unchanged menus (primary and footer only)',
  );
  return log;
}
