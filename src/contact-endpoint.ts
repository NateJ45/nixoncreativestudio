/* The contact form's own endpoint: POST /api/contact/, run by src/worker.ts.

   Why it lives here and not in src/pages/api/: this site builds static, and the
   deploy is the static assets plus src/worker.ts, added after the build by
   scripts/add-video-worker.mjs with run_worker_first limited to the paths that
   need code. An Astro server route would switch the whole build to Astro's
   server layout and break that step (the video byte ranges iPhones need). So
   the endpoint is one more run_worker_first path on the same small Worker.

   Site-owned, not a PORTABLE copy: it follows the starter's route (PORTS.md
   card 45, as presacademy runs it) without the starter's Sanity-backed
   recipient lookup and studio Inbox. The pure halves ARE canonical copies:
   src/lib/contact-submission.ts (validation, spam checks, the email body, the
   table) and migrations/0001_contact_submissions.sql. src/lib/inquiry.ts maps
   this form's dozen fields onto that contract.

   THE ORDER MATTERS MORE THAN ANYTHING ELSE HERE: store first, notify second.
   With a form service the email IS the record, so a message that bounces, gets
   spam-filtered or is deleted never existed. The row is written first, so an
   inquiry survives a failed send and `notified = 0` says it needs chasing.

   TWO KINDS OF CALLER. src/scripts/contact.js posts FormData with
   `Accept: application/json` and reads JSON back. A visitor without JavaScript
   posts the same form natively, and gets a 303 to /contact/?sent=1#sent (the
   success panel shows through CSS :target) or, on a rejected answer, a short
   plain page saying what to fix.

   NOTIFY: Cloudflare Email Sending (EMAIL binding, CONTACT_TO, CONTACT_FROM)
   first, then Web3Forms with a SERVER-SIDE key (WEB3FORMS_KEY secret) if that
   fails. Every piece is optional: a visitor never hears about configuration,
   the log does. */

import {
  validateSubmission,
  looksAutomated,
  buildNotification,
  type CleanSubmission,
} from './lib/contact-submission.ts';
import { inquiryToSubmission } from './lib/inquiry.ts';
import { site } from './data/site.ts';

/** The slice of D1 this route uses, declared structurally (no workers-types dependency). */
interface D1Lite {
  prepare(sql: string): {
    bind(...values: unknown[]): { run(): Promise<{ meta?: { last_row_id?: number } }> };
  };
}

export interface ContactEnv {
  /** D1 database holding contact_submissions. */
  CONTACT_DB?: D1Lite;
  /** Cloudflare Email Sending binding. */
  EMAIL?: { send: (message: Record<string, unknown>) => Promise<{ messageId?: string }> };
  /** Where notifications go (a plain var in wrangler.jsonc). */
  CONTACT_TO?: string;
  /** Who they come from. Must be on a domain onboarded for Email Sending. */
  CONTACT_FROM?: string;
  /** Turnstile server key. Turnstile is skipped entirely when unset (the form ships no widget). */
  TURNSTILE_SECRET?: string;
  /** Server-side Web3Forms key, the fallback when Email Sending fails. */
  WEB3FORMS_KEY?: string;
}

const SENT_URL = '/contact/?sent=1#sent';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** The no-JS answer for anything but success: plain words and a way back. */
function plainPage(status: number, lines: string[]): Response {
  const items = lines.map((l) => `<li>${escapeHtml(l)}</li>`).join('');
  const body =
    `<!doctype html><html lang="en"><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>That did not send | ${escapeHtml(site.studioName)}</title>` +
    `<body style="font:1.1rem/1.5 system-ui,sans-serif;max-width:36rem;margin:3rem auto;padding:0 1rem">` +
    `<h1>That did not send yet</h1><ul>${items}</ul>` +
    `<p>Go back to fix it (your answers are still in the form), or email ` +
    `<a href="mailto:${site.email}">${site.email}</a>.</p></body></html>`;
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

async function passesTurnstile(
  secret: string | undefined,
  token: string | null,
  ip: string | null,
): Promise<boolean> {
  if (!secret) return true;
  if (!token) return false;
  try {
    const body = new FormData();
    body.append('secret', secret);
    body.append('response', token);
    if (ip) body.append('remoteip', ip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    // A Turnstile outage must not eat a real inquiry; the honeypot and timing check still stand.
    return true;
  }
}

/** Cloudflare Email Sending. Returns null on success, or the reason it failed. */
async function notifyByEmail(e: ContactEnv, s: CleanSubmission): Promise<string | null> {
  if (!e.EMAIL || !e.CONTACT_TO || !e.CONTACT_FROM) return 'email binding not configured';
  const note = buildNotification(s, site.studioName);
  const message: Record<string, unknown> = {
    to: e.CONTACT_TO,
    from: { email: e.CONTACT_FROM, name: `${site.studioName} website` },
    subject: note.subject,
    text: note.text,
    html: note.html,
  };
  try {
    // Reply-To as a custom header (confirmed on a live send, card 45), retried
    // without it if the transport ever rejects the field.
    await e.EMAIL.send({ ...message, headers: [{ key: 'Reply-To', value: s.email }] });
    return null;
  } catch {
    try {
      await e.EMAIL.send(message);
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : 'send failed';
    }
  }
}

/** The fallback transport, with the key in a Worker secret instead of the page. */
async function notifyByWeb3Forms(e: ContactEnv, s: CleanSubmission): Promise<string | null> {
  if (!e.WEB3FORMS_KEY) return 'no fallback transport configured';
  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        access_key: e.WEB3FORMS_KEY,
        name: s.name,
        email: s.email,
        subject: s.subject,
        message: s.message,
        from_name: `${site.studioName} website`,
      }),
    });
    return res.ok ? null : `web3forms responded ${res.status}`;
  } catch (err) {
    return err instanceof Error ? err.message : 'web3forms request failed';
  }
}

/** Read the body whichever way it came: JSON, multipart FormData or a native urlencoded post. */
async function readFields(request: Request): Promise<Record<string, unknown> | null> {
  const type = request.headers.get('content-type') ?? '';
  try {
    if (type.includes('application/json')) return (await request.json()) as Record<string, unknown>;
    const data = await request.formData();
    const fields: Record<string, unknown> = {};
    data.forEach((value, key) => {
      if (typeof value === 'string') fields[key] = value;
    });
    return fields;
  } catch {
    return null;
  }
}

/** Store the row, then notify, then record whether the notification went out. */
async function storeAndNotify(
  e: ContactEnv,
  request: Request,
  value: CleanSubmission,
): Promise<{ stored: boolean; failure: string | null }> {
  let rowId: number | null = null;
  if (e.CONTACT_DB) {
    try {
      const res = await e.CONTACT_DB.prepare(
        `INSERT INTO contact_submissions
           (received_at, name, email, subject, message, user_agent, country)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          new Date().toISOString(),
          value.name,
          value.email,
          value.subject,
          value.message,
          request.headers.get('user-agent')?.slice(0, 300) ?? null,
          request.headers.get('cf-ipcountry') ?? null,
        )
        .run();
      rowId = res.meta?.last_row_id ?? null;
    } catch (err) {
      // A database problem must not lose the message either: still try to email it.
      console.error('[contact] could not store submission:', err);
    }
  }

  // `failure` decides `notified`; `note` is what notify_error keeps. A fallback
  // delivery still records why Email Sending failed: otherwise the row reads
  // notified = 1 with no error and a broken primary transport goes unnoticed.
  let failure = await notifyByEmail(e, value);
  let note = failure;
  if (failure) {
    const first = failure;
    console.warn('[contact] email send failed, trying web3forms:', first);
    const second = await notifyByWeb3Forms(e, value);
    failure = second ? `${first}; ${second}` : null;
    note = second ? failure : `sent via web3forms; email failed: ${first}`;
  }

  if (rowId !== null && e.CONTACT_DB) {
    try {
      await e.CONTACT_DB.prepare(
        `UPDATE contact_submissions SET notified = ?, notify_error = ? WHERE id = ?`,
      )
        .bind(failure ? 0 : 1, note, rowId)
        .run();
    } catch (err) {
      console.error('[contact] could not record notification state:', err);
    }
  }
  if (failure) console.error('[contact] notification failed:', failure);
  return { stored: rowId !== null, failure };
}

export async function handleContact(request: Request, e: ContactEnv): Promise<Response> {
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405);

  // The script asks for JSON; a native browser post asks for HTML.
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');
  const done = () =>
    wantsJson ? json({ ok: true }) : Response.redirect(new URL(SENT_URL, request.url).href, 303);

  const fields = await readFields(request);
  if (!fields) {
    return wantsJson
      ? json({ ok: false, error: 'Could not read that submission.' }, 400)
      : plainPage(400, ['The form could not be read.']);
  }

  const raw = inquiryToSubmission(fields);

  // Silent on purpose: a bot gets the same answer a person does.
  if (looksAutomated(raw, Date.now()).automated) return done();

  const { ok, errors, value } = validateSubmission(raw);
  if (!ok || !value) {
    return wantsJson ? json({ ok: false, errors }, 422) : plainPage(422, Object.values(errors));
  }

  const ip = request.headers.get('cf-connecting-ip');
  if (!(await passesTurnstile(e.TURNSTILE_SECRET, value.turnstileToken, ip))) {
    const error = 'That did not pass the spam check. Please try again.';
    return wantsJson ? json({ ok: false, error }, 403) : plainPage(403, [error]);
  }

  const { stored, failure } = await storeAndNotify(e, request, value);

  // Stored but not sent is still a success for the visitor: the message exists
  // and the row says it needs chasing. Only neither-stored-nor-sent has failed.
  if (failure && !stored) {
    const error = `Sorry, that did not send. Please email ${site.email} directly.`;
    return wantsJson ? json({ ok: false, error }, 502) : plainPage(502, [error]);
  }
  return done();
}
