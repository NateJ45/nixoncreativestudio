// Foundation, edit with care.
// Worker entry for EmDash on Cloudflare. Re-exports the plugin bridge, wires the
// scheduled handler (publishing scheduled posts, plugin cron), and adds long-lived
// caching for CMS images in front of everything else.
//
// Why the cache lives here and not in Astro middleware (tried first, 2026-10-02):
// EmDash's own "pre" middleware answers /_image and the media-file route itself,
// so a middleware in src/ never sees those responses. This wrapper is outermost.
//
// The problem it fixes: EmDash serves media files, and Astro's /_image resizer
// serves the resized WebP copies, both with `Cache-Control: max-age=0,
// must-revalidate`. Every page view re-ran the image transform (about 0.22s each).
// These URLs are safe to cache for a long time: a media file's URL contains its
// unique id, and the resizer URL contains that URL plus the width, so a changed
// image is a new URL. 30 days (not "immutable for a year") leaves room for an
// editor replacing an asset in place.
//
// Two layers: the Cache-Control header (browser + CDN) and Cloudflare's edge cache
// (caches.default) so the transform runs once per image-and-width, not once per
// visitor. Measured on the trial: a fresh width took 1.36s, then 0.12s once cached.
//
// Testing note: use GET, not `curl -I`. A HEAD request skips this wrapper on
// purpose (method check), which sent the first debugging pass the wrong way.
import type { ExportedHandler } from '@cloudflare/workers-types';
import handler, { createScheduledHandler, PluginBridge } from '@emdash-cms/cloudflare/worker';

export { PluginBridge };

const CACHEABLE_PREFIXES = ['/_image', '/_emdash/api/media/file/'];
const CACHE_CONTROL = 'public, max-age=2592000, stale-while-revalidate=86400';

export default {
  ...handler,
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    const cacheable =
      request.method === 'GET' && CACHEABLE_PREFIXES.some((p) => pathname.startsWith(p));
    if (!cacheable || !handler.fetch) return handler.fetch?.(request, env, ctx);

    const edge = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
    const hit = await edge?.match(request as unknown as Request);
    if (hit) return hit as unknown as Response;

    const res = await handler.fetch(request, env, ctx);
    // Only cache clean successes; leave errors, redirects and partial content alone.
    if (res.status !== 200) return res;

    const headers = new Headers(res.headers as unknown as HeadersInit);
    headers.set('Cache-Control', CACHE_CONTROL);
    const out = new Response(res.body as unknown as BodyInit, { status: 200, headers });
    if (edge) ctx.waitUntil(edge.put(request as unknown as Request, out.clone()));
    return out as unknown as typeof res;
  },
  scheduled: createScheduledHandler(),
} satisfies ExportedHandler;
