/* ============================================================================
   Cloudflare Pages Function | Coming-soon gate with preview bypass
   ============================================================================
   Foundation, edit with care.

   Runs at Cloudflare's edge on every request before any static file is
   served. When the coming-soon gate is active (PUBLIC_COMING_SOON=true),
   redirects every visitor to /coming-soon/ unless they're carrying a
   preview cookie or visiting with the bypass query string.

   Setup (Cloudflare Pages > Settings > Variables and Secrets):
     - PUBLIC_COMING_SOON   set to "true" to enable the gate
     - PREVIEW_TOKEN        a random secret string (the bypass token)

   Bypass flow:
     1. Visit any URL with ?preview=<PREVIEW_TOKEN>
     2. Function sets a ncs-preview cookie (HttpOnly, Secure, 30 days),
        302 redirects to the same URL without the query param
     3. Every subsequent request from that browser is allowed through

   Browsers without the cookie:
     - Allowed paths (/coming-soon/, static assets, well-known files)
       pass through normally
     - Everything else is 302 redirected to /coming-soon/

   When PUBLIC_COMING_SOON is unset or anything other than "true", the
   function is a no-op and every request passes through.

   To rotate the bypass token: change PREVIEW_TOKEN in the Cloudflare
   dashboard. Existing cookies stop matching, so anyone who had the
   old token needs to visit the bypass URL again with the new one.

   To revoke your own bypass: clear cookies for the site in your browser.
   ============================================================================ */

const COOKIE_NAME    = 'ncs-preview';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;   // 30 days
const GATE_TARGET    = '/coming-soon/';

// Paths the function never redirects, regardless of cookie state. The
// coming-soon page itself, plus the conventional /_ prefixed assets
// Cloudflare uses internally (Astro emits /_astro/ for hashed bundles).
const ALLOWED_PATHS = [
  '/coming-soon',
  '/coming-soon/',
];

const ALLOWED_PREFIXES = [
  '/_',           // /_astro/, etc.
  '/coming-soon/',
];

// Static-asset extension allowlist. Cloudflare Pages usually serves these
// before middleware runs, but this is a belt-and-suspenders so things like
// /og-default.png and /rss.xml stay reachable even when gated.
const STATIC_EXT_RE = /\.(?:png|jpe?g|webp|gif|svg|ico|woff2?|css|js|mjs|xml|txt|json|map|pdf)$/i;

function isAllowed(pathname) {
  if (ALLOWED_PATHS.includes(pathname)) return true;
  if (ALLOWED_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (STATIC_EXT_RE.test(pathname)) return true;
  return false;
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const raw of header.split(';')) {
    const eq = raw.indexOf('=');
    if (eq < 0) continue;
    const key = raw.slice(0, eq).trim();
    const val = raw.slice(eq + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}

export async function onRequest(context) {

  const { request, next, env } = context;
  const url = new URL(request.url);

  // Gate disabled at the env-var level: function is a no-op.
  if (env.PUBLIC_COMING_SOON !== 'true') {
    return next();
  }

  // Path is always allowed (coming-soon page itself, static assets).
  if (isAllowed(url.pathname)) {
    return next();
  }

  const previewToken = env.PREVIEW_TOKEN || '';

  // Query-string bypass: ?preview=TOKEN sets the cookie and 302s to the
  // same URL with the param stripped, so the magic link can't be
  // accidentally shared via the address bar after redirect.
  if (previewToken && url.searchParams.get('preview') === previewToken) {
    const cleanUrl = new URL(url);
    cleanUrl.searchParams.delete('preview');
    const headers = new Headers({ Location: cleanUrl.toString() });
    headers.append(
      'Set-Cookie',
      `${COOKIE_NAME}=${encodeURIComponent(previewToken)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
    );
    return new Response(null, { status: 302, headers });
  }

  // Cookie bypass: visitor has a matching preview cookie, pass through.
  const cookies = parseCookies(request.headers.get('Cookie'));
  if (previewToken && cookies[COOKIE_NAME] === previewToken) {
    return next();
  }

  // Default: redirect to the coming-soon page. 302 (not 301) so the
  // redirect lifts cleanly when the gate is disabled later.
  const target = new URL(GATE_TARGET, url.origin);
  return Response.redirect(target.toString(), 302);
}
