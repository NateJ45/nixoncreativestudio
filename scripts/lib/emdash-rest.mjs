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
import { EmDashClient } from 'emdash/client';

/** Returns request(method, path, body) bound to `url`, or null when no token is set. */
export function restRequest(url, token) {
  const t = token || process.env.EMDASH_TOKEN;
  if (!t) return null;
  const client = new EmDashClient({ baseUrl: url, token: t });
  return (method, path, body) => client.request(method, path, body);
}
