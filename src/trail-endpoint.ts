/* The visitor trail's endpoint: POST /api/trail/, run by src/worker.ts.

   The browser half (src/lib/trail.ts) sends one small JSON body per page view,
   again whenever the tab is hidden or left, so this upserts on (visit, page)
   and the last send wins. Table: migrations/0003_visitor_trail.sql.

   Defensive on purpose, because anyone can post here: same-origin only, a
   size cap, strict shapes (UUIDs, a path that starts with "/", numbers
   clamped, labels cut short), bots dropped by user agent, and a ceiling on
   pages per visit. A bad body gets a 204 like a good one: nothing to learn.

   Adds what only the server knows: the rough place Cloudflare saw (never the
   IP) and a coarse device ("iPhone, Safari"). */

import { whereabouts } from './contact-endpoint.ts';

interface D1Lite {
  prepare(sql: string): {
    bind(...values: unknown[]): { run(): Promise<unknown> };
  };
}

export interface TrailEnv {
  CONTACT_DB?: D1Lite;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const MAX_BODY = 8_000;
const MAX_PAGES_PER_VISIT = 300;
const BOTS =
  /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|gtmetrix|ptst|preview|facebookexternalhit|embedly|curl|wget|python|node-fetch|axios|go-http/i;

export interface TrailRow {
  visitorId: string;
  visitId: string;
  index: number;
  path: string;
  title: string | null;
  source: string | null;
  startedAt: string;
  engagedMs: number;
  scrollPct: number;
  events: string[];
}

const int = (v: unknown, min: number, max: number): number | null => {
  const n = typeof v === 'number' ? Math.round(v) : NaN;
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : null;
};
const text = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim() ? v.replace(/\s+/g, ' ').trim().slice(0, max) : null;

/** Check and shape a beacon body. null when it is not one of ours. Pure; unit-tested. */
export function parseTrail(body: unknown, now: number): TrailRow | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const vid = typeof b.vid === 'string' ? b.vid : '';
  const visit = typeof b.visit === 'string' ? b.visit : '';
  if (!UUID.test(vid) || !UUID.test(visit)) return null;
  const index = int(b.i, 1, MAX_PAGES_PER_VISIT);
  const path = typeof b.path === 'string' ? b.path.slice(0, 200) : '';
  if (index === null || !path.startsWith('/') || path.startsWith('//')) return null;
  // The start time comes from the browser; keep it within a day of now so a bad clock can't
  // file a page in another year.
  const t0 = int(b.t0, now - 86_400_000, now + 60_000) ?? now;
  const events = Array.isArray(b.ev)
    ? b.ev
        .map((e) => text(e, 80))
        .filter((e): e is string => e !== null)
        .slice(0, 60)
    : [];
  return {
    visitorId: vid,
    visitId: visit,
    index,
    path,
    title: text(b.title, 120),
    source: text(b.src, 60),
    startedAt: new Date(t0).toISOString(),
    // A page can't be in use for more than the time since it opened, or six hours.
    engagedMs: Math.min(int(b.ms, 0, 6 * 3_600_000) ?? 0, Math.max(0, now - t0 + 5_000)),
    scrollPct: int(b.sc, 0, 100) ?? 0,
    events,
  };
}

/** "iPhone, Safari", "Windows, Chrome", "Mac, Firefox": enough to picture them, no more. */
export function deviceOf(ua: string): string {
  const os = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua)
      ? 'iPad'
      : /Android/.test(ua)
        ? /Mobile/.test(ua)
          ? 'Android phone'
          : 'Android tablet'
        : /Windows/.test(ua)
          ? 'Windows'
          : /Mac OS X|Macintosh/.test(ua)
            ? 'Mac'
            : /CrOS/.test(ua)
              ? 'Chromebook'
              : /Linux/.test(ua)
                ? 'Linux'
                : 'Unknown';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/.test(ua)
      ? 'Opera'
      : /SamsungBrowser/.test(ua)
        ? 'Samsung Internet'
        : /Firefox\/|FxiOS/.test(ua)
          ? 'Firefox'
          : /CriOS|Chrome\//.test(ua)
            ? 'Chrome'
            : /Safari\//.test(ua)
              ? 'Safari'
              : 'another browser';
  return `${os}, ${browser}`;
}

function sameOrigin(request: Request): boolean {
  const site = request.headers.get('sec-fetch-site');
  if (site) return site === 'same-origin';
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

const done = () => new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });

export async function handleTrail(request: Request, e: TrailEnv): Promise<Response> {
  if (request.method !== 'POST') return new Response(null, { status: 405 });
  const ua = request.headers.get('user-agent') ?? '';
  if (!e.CONTACT_DB || !sameOrigin(request) || !ua || BOTS.test(ua)) return done();
  const raw = await request.text().catch(() => '');
  if (!raw || raw.length > MAX_BODY) return done();
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return done();
  }
  const now = Date.now();
  const row = parseTrail(body, now);
  if (!row) return done();
  const where = whereabouts(request);
  try {
    await e.CONTACT_DB.prepare(
      `INSERT INTO trail_pages
         (visit_id, page_index, visitor_id, started_at, updated_at, path, title, visit_source,
          engaged_ms, scroll_pct, events, country, region, city, device)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (visit_id, page_index) DO UPDATE SET
         updated_at = excluded.updated_at,
         engaged_ms = MAX(trail_pages.engaged_ms, excluded.engaged_ms),
         scroll_pct = MAX(trail_pages.scroll_pct, excluded.scroll_pct),
         events = excluded.events
       WHERE trail_pages.visitor_id = excluded.visitor_id`,
    )
      .bind(
        row.visitId,
        row.index,
        row.visitorId,
        row.startedAt,
        new Date(now).toISOString(),
        row.path,
        row.title,
        row.source,
        row.engagedMs,
        row.scrollPct,
        row.events.length ? JSON.stringify(row.events) : null,
        where.country,
        where.region,
        where.city,
        deviceOf(ua),
      )
      .run();
  } catch (err) {
    console.error('[trail] could not store page view:', err);
  }
  return done();
}

/** Daily: forget the trails of visitors who never wrote, 13 months on. */
export async function pruneTrails(e: TrailEnv, now = Date.now()): Promise<void> {
  if (!e.CONTACT_DB) return;
  const cutoff = new Date(now - 395 * 86_400_000).toISOString();
  try {
    await e.CONTACT_DB.prepare(
      `DELETE FROM trail_pages
       WHERE started_at < ?
         AND visitor_id NOT IN (SELECT visitor_id FROM contact_submissions WHERE visitor_id IS NOT NULL)`,
    )
      .bind(cutoff)
      .run();
  } catch (err) {
    console.error('[trail] prune failed:', err);
  }
}
