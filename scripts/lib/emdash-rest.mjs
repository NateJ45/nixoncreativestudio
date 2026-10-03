// Safe to edit.
/* ============================================================================
   emdash-rest.mjs
   ============================================================================
   Builds the `request(method, path, body)` callback used by
   scripts/lib/case-studies-schema.mjs, for running from Node.

   Auth: the REST API needs a bearer token. Set EMDASH_TOKEN (or pass --token)
   to an API token created in the admin (Settings > API tokens). The `emdash`
   CLI keeps its own login separate, and it cannot create taxonomies or set
   select options, which is why these scripts need a token for the schema and
   term steps only. Content and media still go through the CLI login.

   No token? The scripts say so and print the alternative: run the same
   functions from the admin page's console, where the signed-in session is the
   credential (see docs/EMDASH-SCHEMA.md, "Re-creating the schema").
   ============================================================================ */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { EmDashClient } from 'emdash/client';

/**
 * The access token `npx emdash login --url <url>` stored for this origin, or ''.
 * Nathan chose this on 2026-10-03 (instead of a separate API token). Probed the
 * same day: it reaches the schema, menus, redirects and taxonomies endpoints. It
 * is read at run time and must never be printed or logged.
 */
export function storedLoginToken(url) {
  const dir = process.env.XDG_CONFIG_HOME
    ? join(process.env.XDG_CONFIG_HOME, 'emdash')
    : join(homedir(), '.config', 'emdash');
  try {
    const store = JSON.parse(readFileSync(join(dir, 'auth.json'), 'utf8'));
    return store[new URL(url).origin]?.accessToken || '';
  } catch {
    return '';
  }
}

/**
 * Returns request(method, path, body) bound to `url`, or null when there is no
 * credential. Order: the token passed in, EMDASH_TOKEN, then the stored CLI login.
 */
export function restRequest(url, token) {
  const t = token || process.env.EMDASH_TOKEN || storedLoginToken(url);
  if (!t) return null;
  const client = new EmDashClient({ baseUrl: url, token: t });
  return (method, path, body) => client.request(method, path, body);
}
