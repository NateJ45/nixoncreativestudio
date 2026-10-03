// Safe to edit.
/* ============================================================================
   emdash-media.mjs
   ============================================================================
   Uploads repo images to an EmDash instance once, de-duplicated by SHA-1, and
   returns the EmDash image value to store in an entry. Used by
   scripts/cms/load-content.mjs for every `{ "$file": "src/assets/...", "alt": "..." }`
   in cms/content/*.json.

   Same behaviour as the imageValue() helper inside
   scripts/migrate-case-studies.mjs (which predates this file and keeps its own
   copy): list the instance's media once, index it by contentHash, upload only
   what is missing, so a rerun uploads nothing and a file already used by another
   entry (the Second Presbyterian cover on /services, say) is reused rather than
   stored twice.

   Needs the `emdash` CLI login for the instance (scripts/lib/emdash-cli.mjs).
   `emdashFn` is injectable so the unit tests can run without a network.
   ============================================================================ */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const sha1 = (file) => 'sha1:' + createHash('sha1').update(readFileSync(file)).digest('hex');

/**
 * Build a resolver bound to one instance.
 *
 *   emdashFn(args) -> parsed JSON    (the CLI wrapper with the url already bound)
 *   root           repo root; a `$file` path is resolved against it
 *   dryRun         report uploads instead of making them
 *
 * Returns { imageValue(file, alt), loadExisting(), uploaded } where
 * imageValue() resolves a repo-relative path to the stored image value.
 */
export function createMediaResolver({ emdashFn, root, dryRun = false, log = console.log }) {
  const byHash = new Map();
  let loaded = false;
  const uploaded = [];

  function loadExisting() {
    if (loaded) return;
    loaded = true;
    let cursor;
    do {
      const args = ['media', 'list', '--limit', '100'];
      if (cursor) args.push('--cursor', cursor);
      const page = emdashFn(args);
      for (const m of page.items || []) if (m.contentHash) byHash.set(m.contentHash, m);
      cursor = page.nextCursor || undefined;
    } while (cursor);
  }

  function imageValue(file, alt) {
    const abs = resolve(root, file);
    if (!existsSync(abs)) throw new Error(`image not found: ${file}`);
    loadExisting();
    const hash = sha1(abs);
    let m = byHash.get(hash);
    if (!m) {
      if (dryRun) {
        log(`    [dry-run] would upload ${basename(abs)}`);
        return { id: 'DRY', alt: alt ?? '' };
      }
      m = emdashFn(['media', 'upload', abs]);
      byHash.set(m.contentHash || hash, m);
      uploaded.push(file);
      log(`    uploaded ${basename(abs)} (${(m.size / 1024).toFixed(0)} KB)`);
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

  return { imageValue, loadExisting, uploaded };
}
