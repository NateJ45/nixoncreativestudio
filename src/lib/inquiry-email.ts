// The email Nathan gets for each project inquiry: built to be read in five
// seconds on a phone. Site-owned (the canonical buildNotification in
// contact-submission.ts stays the plain fallback for other sites).
//
// What it optimises for, in order:
//   1. The subject alone says who, what kind of org, budget and timing, so the
//      inbox list is already a triage view.
//   2. One tap to act: Reply (Reply-To is the visitor), Text, Call, their site.
//   3. The answers in the words the visitor saw (src/data/inquiry-options.ts),
//      then their message, then where they came from.
//
// Email-client rules followed: table layout, inline styles only, a hidden
// preheader, no images, no web fonts required (Hanken Grotesk if installed,
// Helvetica otherwise), `color-scheme: light` so clients do not half-invert it,
// and a plain-text part that carries the same facts.
//
// Pure: no bindings, no Astro. Unit-tested in inquiry-email.test.ts.

import { labelFor } from '../data/inquiry-options.ts';
import { textHandoffUrl } from './text-handoff.ts';
import { duration, profileFacts, sourceWords, type VisitorProfile } from './visitor-profile.ts';

export interface InquiryMeta {
  /** The D1 row id, when the row was stored. */
  id: number | null;
  /** When the Worker received it. */
  receivedAt: Date;
  /** Cloudflare's two-letter country, when known. */
  country: string | null;
  /** City and region from Cloudflare's IP lookup ("Cincinnati, Ohio"), when known. Rough, and a VPN moves it. */
  place?: string | null;
  /** The network the request came from ("Charter Communications"), when known. */
  network?: string | null;
  /** The spam score (src/lib/spam-score.ts). Shown only when it flagged the inquiry. */
  spam?: { score: number; reasons: string[]; verdict: 'ok' | 'flag' | 'hold' } | null;
  /** Site origin, for links back to pages: https://nixoncreativestudio.com */
  siteUrl: string;
  studioName: string;
  /** What they did on the site before writing (src/lib/visitor-profile.ts). null: no trail. */
  profile?: VisitorProfile | null;
  /** Clarity's recordings page for this project, when CLARITY_ID is set on the Worker. */
  clarityUrl?: string | null;
}

export interface InquiryEmail {
  subject: string;
  text: string;
  html: string;
}

const C = {
  ink: '#121211',
  muted: '#5c5c57',
  faint: '#8a8a84',
  line: '#e4e4e0',
  wash: '#f5f5f3',
  accent: '#2f3fe6',
  accentSoft: '#eef0ff',
  white: '#ffffff',
};
const FONT = "'Hanken Grotesk', Helvetica, Arial, sans-serif";
const TIME_ZONE = 'America/New_York'; // The studio is in Cincinnati.

const SHORT_TIMELINE: Record<string, string> = {
  asap: 'ASAP',
  '1-3-months': '1 to 3 months',
  '3-6-months': '3 to 6 months',
  '6-plus': '6+ months',
  flexible: 'flexible timing',
};

function str(v: unknown, max = 2000): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function esc(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** A visitor-typed website as a safe https link, or null. */
export function websiteHref(raw: string): string | null {
  if (!raw) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (!u.hostname.includes('.')) return null;
    return u.href;
  } catch {
    return null;
  }
}

/** Digits (and a leading +) for tel: links and the Text handoff, or null if it is not a phone number. */
export function phoneHref(raw: string): string | null {
  const plus = raw.trim().startsWith('+') ? '+' : '';
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15 ? `${plus}${digits}` : null;
}

function when(d: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(d);
}

/** Everything the email shows, read once from the raw form fields. */
function read(fields: Record<string, unknown>) {
  const f = (k: string, max?: number) => str(fields[k], max);
  const opt = (k: string) => {
    const v = f(k, 100);
    return v ? labelFor(k, v) : '';
  };
  const name = f('name', 200);
  return {
    name,
    first: name.split(/\s+/)[0] ?? '',
    email: f('email', 320),
    message: f('message', 5000),
    organization: f('organization', 300),
    phone: f('phone', 40),
    website: f('current_website', 300),
    orgType: opt('org_type'),
    runs: opt('runs'),
    budget: opt('budget'),
    timelineValue: f('timeline', 50),
    timeline: opt('timeline'),
    heardFrom: opt('heard_from'),
    from: f('from', 120),
    tier: f('tier', 60),
    service: f('service', 120),
    originOrgType: opt('origin_org_type'),
    // First-touch attribution (src/lib/attribution.ts): where this person first found the site.
    leadSource: f('lead_source', 60),
    firstLanding: f('first_landing', 120),
    firstReferrer: f('first_referrer', 120),
    utm: [f('utm_source', 60), f('utm_medium', 60), f('utm_campaign', 60)]
      .filter(Boolean)
      .join(' / '),
    daysSinceFirst: f('days_since_first', 6),
    pagesSeen: f('pages_seen', 6),
  };
}

type Inquiry = ReturnType<typeof read>;

/** The inbox line: who, kind of org, budget, timing. Empty parts drop out. */
export function inquirySubject(q: Inquiry): string {
  const who = q.organization || q.name || 'someone';
  const parts = [
    q.orgType && q.orgType !== 'Something else' ? q.orgType : '',
    q.budget && q.budget !== 'Not sure yet' ? q.budget : '',
    SHORT_TIMELINE[q.timelineValue] ?? '',
  ].filter(Boolean);
  return [`New inquiry: ${who}`, ...parts].join(' · ').slice(0, 160);
}

function facts(q: Inquiry): Array<[string, string]> {
  return (
    [
      ['Budget', q.budget],
      ['Timeline', q.timeline],
      ['Organization type', q.orgType],
      ['Who keeps it updated', q.runs],
      ['Current website', q.website],
      ['Phone', q.phone],
      ['Heard about you from', q.heardFrom],
    ] as Array<[string, string]>
  ).filter(([, v]) => v);
}

function origin(q: Inquiry, siteUrl: string): Array<[string, string, string | null]> {
  const out: Array<[string, string, string | null]> = [];
  if (q.from) {
    const path = q.from.startsWith('/') ? q.from : `/work/${q.from}/`;
    out.push(['Came from', path, websiteHref(`${siteUrl}${path}`)]);
  }
  if (q.tier) out.push(['Was looking at the tier', q.tier, null]);
  if (q.service) out.push(['Was looking at the service', q.service, null]);
  if (q.originOrgType && q.originOrgType !== q.orgType) {
    out.push(['Org type in the link', q.originOrgType, null]);
  }
  if (q.leadSource && q.leadSource !== 'unknown')
    out.push(['First found the site via', q.leadSource, null]);
  if (q.firstReferrer) out.push(['Sent by', q.firstReferrer, null]);
  if (q.utm) out.push(['Campaign tags', q.utm, null]);
  if (q.firstLanding) {
    out.push(['First page they saw', q.firstLanding, websiteHref(`${siteUrl}${q.firstLanding}`)]);
  }
  if (q.daysSinceFirst) {
    const d = Number(q.daysSinceFirst);
    out.push(['First visit', d === 0 ? 'Today' : d === 1 ? '1 day ago' : `${d} days ago`, null]);
  }
  if (q.pagesSeen && q.pagesSeen !== '0') out.push(['Pages seen this visit', q.pagesSeen, null]);
  return out;
}

/** "Cincinnati, Ohio, US on Charter Communications", from whatever Cloudflare knew. */
export function sentFrom(meta: InquiryMeta): string {
  const where = [meta.place, meta.country].filter(Boolean).join(', ');
  return [where, meta.network ? `on ${meta.network}` : ''].filter(Boolean).join(' ');
}

function flagged(meta: InquiryMeta): boolean {
  return !!meta.spam && meta.spam.verdict !== 'ok';
}

function footerLine(meta: InquiryMeta): string {
  const from = sentFrom(meta);
  return [
    meta.id !== null ? `Inquiry #${meta.id}` : 'Not stored (database error)',
    `received ${when(meta.receivedAt)}`,
    from ? `from ${from}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

function text(q: Inquiry, meta: InquiryMeta, subject: string): string {
  const lines = [subject, ''];
  if (flagged(meta) && meta.spam) {
    lines.push(
      `Spam check: ${meta.spam.score} points`,
      ...meta.spam.reasons.map((r) => `- ${r}`),
      '',
    );
  }
  lines.push(
    `${q.name}${q.organization ? `, ${q.organization}` : ''}`,
    `Email: ${q.email} (just hit Reply)`,
    ...facts(q).map(([k, v]) => `${k}: ${v}`),
    '',
    'What they wrote:',
    q.message,
  );
  const o = origin(q, meta.siteUrl);
  if (o.length) lines.push('', ...o.map(([k, v]) => `${k}: ${v}`));
  lines.push(...profileText(meta));
  lines.push('', footerLine(meta), `Sent by the contact form on ${meta.studioName}.`);
  return lines.join('\n');
}

/** The trail as plain text: the summary, the longest-read pages, then visit by visit. */
function profileText(meta: InquiryMeta): string[] {
  const p = meta.profile;
  if (!p) return [];
  const out = [
    '',
    'Before they wrote:',
    ...profileFacts(p, meta.receivedAt, TIME_ZONE).map(([k, v]) => `${k}: ${v}`),
  ];
  out.push('', 'Longest on:');
  for (const t of p.topPages.slice(0, 8))
    out.push(
      `- ${t.path} ${duration(t.seconds)}, ${t.scroll}% down${t.views > 1 ? `, ${t.views} times` : ''}`,
    );
  out.push('', 'Visit by visit:');
  for (const v of p.visits) {
    out.push(`${when(v.start)}, from ${sourceWords(v.source)}:`);
    out.push(`  ${v.pages.map((pg) => `${pg.path} (${duration(pg.seconds)})`).join(' > ')}`);
  }
  if (meta.clarityUrl)
    out.push('', `Recordings: ${meta.clarityUrl} (filter Custom user ID: ${p.visitorId})`);
  return out;
}

/** The trail as an email section body. */
function profileHtml(meta: InquiryMeta): string {
  const p = meta.profile;
  if (!p) return '';
  const facts = profileFacts(p, meta.receivedAt, TIME_ZONE);
  const factRows = facts.map(([k, v], i) => row(k, esc(v), i === facts.length - 1)).join('');
  const small = `font-family:${FONT};font-size:14px;line-height:20px;color:${C.ink};`;
  const muted = `font-family:${FONT};font-size:13px;line-height:18px;color:${C.muted};`;
  const heading = (t: string) =>
    `<div style="${muted}font-weight:600;padding:16px 0 6px 0;">${esc(t)}</div>`;
  const top = p.topPages.slice(0, 8);
  const longest = Math.max(1, ...top.map((t) => t.seconds));
  const topRows = top
    .map(
      (t) =>
        `<tr><td style="${small}padding:4px 8px 4px 0;">${link(meta.siteUrl + t.path, t.path)}</td>` +
        `<td style="${muted}padding:4px 8px;white-space:nowrap;" align="right">${esc(duration(t.seconds))}</td>` +
        `<td style="padding:4px 0;width:30%;"><div style="background:${C.accent};height:6px;border-radius:3px;width:${Math.max(4, Math.round((t.seconds / longest) * 100))}%;"></div></td>` +
        `<td style="${muted}padding:4px 0 4px 8px;white-space:nowrap;" align="right">${t.scroll}% down</td></tr>`,
    )
    .join('');
  const visitRows = p.visits
    .map(
      (v, i) =>
        `<div style="${small}padding:6px 0;${i ? `border-top:1px solid ${C.line};` : ''}">` +
        `<strong>${esc(when(v.start))}</strong> <span style="color:${C.muted};">from ${esc(sourceWords(v.source))}, ${esc(duration(v.seconds))}</span><br>` +
        v.pages
          .map(
            (pg) =>
              `${esc(pg.path)} <span style="color:${C.faint};">${esc(duration(pg.seconds))}</span>`,
          )
          .join(' &rarr; ') +
        `</div>`,
    )
    .join('');
  const replay = meta.clarityUrl
    ? `<div style="padding-top:12px;">${button(meta.clarityUrl, 'Watch their sessions in Clarity', false)}</div>` +
      `<div style="${muted}">Filter by Custom user ID: ${esc(p.visitorId)}</div>`
    : '';
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${factRows}</table>` +
    heading('Longest on') +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${topRows}</table>` +
    heading('Visit by visit') +
    visitRows +
    replay
  );
}

function button(href: string, label: string, primary: boolean): string {
  const style = primary
    ? `background:${C.accent};color:${C.white};border:1px solid ${C.accent};`
    : `background:${C.white};color:${C.ink};border:1px solid ${C.line};`;
  // Inline-block anchors (not table cells) so the row wraps on a narrow phone.
  return (
    `<a href="${esc(href)}" style="${style}display:inline-block;margin:0 8px 8px 0;padding:10px 16px;border-radius:8px;` +
    `font-family:${FONT};font-size:15px;font-weight:600;line-height:20px;text-decoration:none;white-space:nowrap;">` +
    `${esc(label)}</a>`
  );
}

function row(label: string, valueHtml: string, last: boolean): string {
  const border = last ? '' : `border-bottom:1px solid ${C.line};`;
  return (
    `<tr>` +
    `<td valign="top" style="${border}padding:10px 12px 10px 0;width:38%;font-family:${FONT};font-size:13px;line-height:20px;color:${C.muted};">${esc(label)}</td>` +
    `<td valign="top" style="${border}padding:10px 0;font-family:${FONT};font-size:15px;line-height:20px;color:${C.ink};font-weight:600;">${valueHtml}</td>` +
    `</tr>`
  );
}

function link(href: string, label: string): string {
  return `<a href="${esc(href)}" style="color:${C.accent};text-decoration:underline;">${esc(label)}</a>`;
}

function html(q: Inquiry, meta: InquiryMeta, subject: string): string {
  const replySubject = `Re: your ${meta.studioName} inquiry`;
  const mailto = `mailto:${q.email}?subject=${encodeURIComponent(replySubject)}`;
  const tel = phoneHref(q.phone);
  const site = websiteHref(q.website);

  const buttons = [
    button(mailto, q.first ? `Reply to ${q.first}` : 'Reply', true),
    // Gmail strips sms: links, so Text goes through /text/ on the site (text-handoff.ts).
    tel ? button(textHandoffUrl(meta.siteUrl, tel), 'Text', false) : '',
    tel ? button(`tel:${tel}`, 'Call', false) : '',
    site ? button(site, 'Their website', false) : '',
  ].join('');

  const factRows = facts(q);
  const factHtml = factRows
    .map(([k, v], i) => {
      let value = esc(v);
      if (k === 'Current website' && site) value = link(site, v);
      if (k === 'Phone' && tel) value = link(`tel:${tel}`, v);
      return row(k, value, i === factRows.length - 1);
    })
    .join('');

  const o = origin(q, meta.siteUrl);
  const originHtml = o
    .map(([k, v, href], i) => row(k, href ? link(href, v) : esc(v), i === o.length - 1))
    .join('');

  const message = esc(q.message).replace(/\r?\n/g, '<br>');
  const preheader = esc(q.message.replace(/\s+/g, ' ').slice(0, 140));
  const subline = [q.organization, q.orgType].filter(Boolean).map(esc).join(' · ');

  const section = (title: string, body: string) =>
    `<tr><td style="padding:24px 28px 0 28px;">` +
    `<div style="font-family:${FONT};font-size:12px;line-height:16px;letter-spacing:0.08em;text-transform:uppercase;color:${C.muted};font-weight:600;padding-bottom:8px;">${esc(title)}</div>` +
    body +
    `</td></tr>`;

  return (
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">` +
    `<title>${esc(subject)}</title></head>` +
    `<body style="margin:0;padding:0;background:${C.wash};">` +
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.wash};">${preheader}</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.wash};">` +
    `<tr><td align="center" style="padding:24px 12px;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${C.white};border:1px solid ${C.line};border-radius:12px;">` +
    // Header: label + who.
    `<tr><td style="padding:24px 28px 0 28px;">` +
    `<div style="font-family:${FONT};font-size:12px;line-height:16px;letter-spacing:0.08em;text-transform:uppercase;color:${C.accent};font-weight:700;">New project inquiry</div>` +
    `<div style="font-family:${FONT};font-size:26px;line-height:32px;color:${C.ink};font-weight:700;padding-top:8px;">${esc(q.name || 'Someone')}</div>` +
    (subline
      ? `<div style="font-family:${FONT};font-size:16px;line-height:22px;color:${C.muted};padding-top:2px;">${subline}</div>`
      : '') +
    `<div style="font-family:${FONT};font-size:15px;line-height:22px;padding-top:6px;">${link(mailto, q.email)}</div>` +
    `</td></tr>` +
    // The spam check, first, when it flagged this one.
    (flagged(meta) && meta.spam
      ? `<tr><td style="padding:18px 28px 0 28px;">` +
        `<div style="background:#fff4e5;border-left:4px solid #b35c00;border-radius:0 8px 8px 0;padding:12px 16px;font-family:${FONT};font-size:14px;line-height:21px;color:${C.ink};">` +
        `<strong>Likely spam: ${meta.spam.score} points.</strong> ` +
        meta.spam.reasons.map(esc).join('; ') +
        `</div></td></tr>`
      : '') +
    // One-tap actions.
    `<tr><td style="padding:18px 28px 0 28px;">${buttons}</td></tr>` +
    // At a glance.
    (factHtml
      ? section(
          'At a glance',
          `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${factHtml}</table>`,
        )
      : '') +
    // The message.
    section(
      'What they wrote',
      `<div style="background:${C.accentSoft};border-left:4px solid ${C.accent};border-radius:0 8px 8px 0;padding:14px 16px;font-family:${FONT};font-size:16px;line-height:24px;color:${C.ink};">${message}</div>`,
    ) +
    // Where they came from.
    (originHtml
      ? section(
          'Where they came from',
          `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${originHtml}</table>`,
        )
      : '') +
    // Their trail on the site, when there is one.
    (meta.profile ? section('Before they wrote', profileHtml(meta)) : '') +
    // Footer.
    `<tr><td style="padding:24px 28px 24px 28px;">` +
    `<div style="border-top:1px solid ${C.line};padding-top:14px;font-family:${FONT};font-size:12px;line-height:18px;color:${C.faint};">` +
    `${esc(footerLine(meta))}<br>Reply goes straight to ${esc(q.email)}. Sent by the contact form on ${esc(meta.studioName)}.` +
    `</div></td></tr>` +
    `</table></td></tr></table></body></html>`
  );
}

/** Build the inquiry email from the raw form fields (FormData or JSON, flattened). */
export function buildInquiryEmail(
  fields: Record<string, unknown>,
  meta: InquiryMeta,
): InquiryEmail {
  const q = read(fields);
  const subject = (flagged(meta) ? '[Likely spam] ' : '') + inquirySubject(q);
  return { subject, text: text(q, meta, subject), html: html(q, meta, subject) };
}
