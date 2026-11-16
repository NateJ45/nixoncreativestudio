// What a lead did before they wrote: their visitor trail (migrations/0003, src/lib/trail.ts)
// summarised for the inquiry email (src/lib/inquiry-email.ts, "Before they wrote").
//
// Pure: takes the rows, returns plain facts. The Worker does the one query
// (src/contact-endpoint.ts, loadTrail). Unit-tested in visitor-profile.test.ts.

export interface TrailPageRow {
  visit_id: string;
  page_index: number;
  started_at: string;
  path: string;
  title: string | null;
  visit_source: string | null;
  engaged_ms: number;
  scroll_pct: number;
  events: string | null;
  city: string | null;
  region: string | null;
  device: string | null;
}

export interface ProfileVisit {
  start: Date;
  source: string;
  pages: Array<{ path: string; seconds: number; scroll: number; events: string[] }>;
  seconds: number;
}

export interface VisitorProfile {
  visitorId: string;
  firstSeen: Date;
  visits: ProfileVisit[];
  pageViews: number;
  totalSeconds: number;
  /** Pages by time spent across every visit, most first. */
  topPages: Array<{
    path: string;
    title: string | null;
    seconds: number;
    views: number;
    scroll: number;
  }>;
  /** Searches typed into the site search, in order. */
  searches: string[];
  /** Tools used, buttons and questions opened, prices seen: labels, deduplicated. */
  actions: string[];
  devices: string[];
  places: string[];
}

function parseEvents(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as unknown;
    return Array.isArray(list) ? list.filter((e): e is string => typeof e === 'string') : [];
  } catch {
    return [];
  }
}

const unique = (list: string[]) => [...new Set(list.filter(Boolean))];

/** Build the profile, or null when there is no trail (storage blocked, a new device, ?me=1). */
export function buildProfile(visitorId: string, rows: TrailPageRow[]): VisitorProfile | null {
  if (!rows.length) return null;
  const sorted = [...rows].sort(
    (a, b) => a.started_at.localeCompare(b.started_at) || a.page_index - b.page_index,
  );
  const byVisit = new Map<string, TrailPageRow[]>();
  for (const r of sorted) {
    const list = byVisit.get(r.visit_id) ?? [];
    list.push(r);
    byVisit.set(r.visit_id, list);
  }
  const visits: ProfileVisit[] = [...byVisit.values()].map((pages) => {
    pages.sort((a, b) => a.page_index - b.page_index);
    const mapped = pages.map((p) => ({
      path: p.path,
      seconds: Math.round(p.engaged_ms / 1000),
      scroll: p.scroll_pct,
      events: parseEvents(p.events),
    }));
    return {
      start: new Date(pages[0].started_at),
      source: pages.find((p) => p.visit_source)?.visit_source ?? 'direct',
      pages: mapped,
      seconds: mapped.reduce((n, p) => n + p.seconds, 0),
    };
  });
  visits.sort((a, b) => a.start.getTime() - b.start.getTime());

  const pageTotals = new Map<
    string,
    { path: string; title: string | null; seconds: number; views: number; scroll: number }
  >();
  for (const r of sorted) {
    const t = pageTotals.get(r.path) ?? {
      path: r.path,
      title: r.title,
      seconds: 0,
      views: 0,
      scroll: 0,
    };
    t.seconds += Math.round(r.engaged_ms / 1000);
    t.views += 1;
    t.scroll = Math.max(t.scroll, r.scroll_pct);
    pageTotals.set(r.path, t);
  }

  const allEvents = sorted.flatMap((r) => parseEvents(r.events));
  return {
    visitorId,
    firstSeen: visits[0].start,
    visits,
    pageViews: sorted.length,
    totalSeconds: visits.reduce((n, v) => n + v.seconds, 0),
    topPages: [...pageTotals.values()].sort((a, b) => b.seconds - a.seconds || b.views - a.views),
    searches: unique(allEvents.filter((e) => e.startsWith('search:')).map((e) => e.slice(7))),
    actions: unique(
      allEvents.filter((e) => !e.startsWith('search:') && !e.startsWith('form:')).map(actionWords),
    ),
    devices: unique(sorted.map((r) => r.device ?? '')),
    places: unique(sorted.map((r) => [r.city, r.region].filter(Boolean).join(', '))),
  };
}

const TOOL_WORDS: Record<string, string> = {
  draw_card: 'drew a card',
  first_sunday: 'tried the first-Sunday tool',
  live_receipt: 'built a live receipt',
  reply_order: 'used the reply-order tool',
  before_after: 'dragged a before/after',
  theme_flip: 'flipped the theme',
  client_sheet: 'opened a client sheet',
  fit_quiz: 'took the fit quiz',
  tier_picker: 'used the tier picker',
  cost_compare: 'compared costs',
  faq: 'opened the FAQ',
  work_jobs: 'browsed the job index',
  work_filter: 'filtered the work',
  work_view: 'switched the work view',
};

/** One action label in plain words. */
export function actionWords(label: string): string {
  const [kind, ...rest] = label.split(':');
  const value = rest.join(':');
  switch (kind) {
    case 'tool':
      return TOOL_WORDS[value] ?? `used ${value.replace(/_/g, ' ')}`;
    case 'click':
      return `opened "${value}"`;
    case 'cta':
      return `clicked ${value.replace(/_/g, ' ')}`;
    case 'contact':
      return `tapped ${value === 'text' ? 'Text' : value === 'call' ? 'Call' : value === 'copy' ? 'Copy email' : 'Email'}`;
    case 'book_call':
      return 'opened the calendar';
    case 'client_site':
      return `visited ${value}`;
    case 'prices_seen':
      return value === 'full' ? 'read the full prices' : 'saw prices';
    default:
      return label.replace(/_/g, ' ');
  }
}

/** "4 min 10 s", "35 s", "1 h 2 min". */
export function duration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min${seconds % 60 >= 10 ? ` ${seconds % 60} s` : ''}`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

/** A source label in plain words: search-google becomes "Google search". */
export function sourceWords(src: string): string {
  if (src === 'direct') return 'typed in or a bookmark';
  if (src === 'unknown') return 'unknown';
  const [kind, ...rest] = src.split('-');
  const what = rest.join('-');
  if (kind === 'search') return `${what[0]?.toUpperCase() ?? ''}${what.slice(1)} search`;
  if (kind === 'ai') return `AI assistant (${what})`;
  if (kind === 'social') return `${what[0]?.toUpperCase() ?? ''}${what.slice(1)}`;
  if (kind === 'referral') return `a link on ${what}`;
  return src;
}

/** The summary rows the email shows, as [label, value]. */
export function profileFacts(
  p: VisitorProfile,
  now: Date,
  timeZone: string,
): Array<[string, string]> {
  const days = Math.max(0, Math.floor((now.getTime() - p.firstSeen.getTime()) / 86_400_000));
  const first = p.firstSeen.toLocaleDateString('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
  });
  const facts: Array<[string, string]> = [
    [
      'First seen',
      `${first}${days ? ` (${days} day${days === 1 ? '' : 's'} ago)` : ' (today)'}, from ${sourceWords(p.visits[0].source)}`,
    ],
    [
      'Visits',
      `${p.visits.length} visit${p.visits.length === 1 ? '' : 's'}, ${p.pageViews} page${p.pageViews === 1 ? '' : 's'}, ${duration(p.totalSeconds)} reading`,
    ],
  ];
  const sources = unique(p.visits.map((v) => sourceWords(v.source)));
  if (sources.length > 1) facts.push(['Came back via', sources.join(', ')]);
  if (p.searches.length)
    facts.push(['Searched the site for', p.searches.map((s) => `"${s}"`).join(', ')]);
  if (p.actions.length) facts.push(['What they did', p.actions.slice(0, 14).join('; ')]);
  if (p.devices.length) facts.push(['On', p.devices.join(' and ')]);
  if (p.places.length) facts.push(['From', p.places.slice(0, 3).join('; ')]);
  return facts;
}
