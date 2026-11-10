// The Text button in the inquiry email (src/lib/inquiry-email.ts). Gmail strips
// sms: links from an email, so the button cannot point at sms: directly: it
// links to /text/#<number> on this site, and that page opens Messages.
//
// The number rides in the URL fragment, which the browser never sends to the
// server, so it stays out of request logs and analytics.
//
// Pure: no DOM. Unit-tested in text-handoff.test.ts; used by src/pages/text.astro.

const PATH = '/text/';

/** The https link the email's Text button uses. `tel` is already digits (phoneHref). */
export function textHandoffUrl(siteUrl: string, tel: string): string {
  return `${siteUrl.replace(/\/+$/, '')}${PATH}#${encodeURIComponent(tel)}`;
}

/** The sms: target for a /text/ page fragment, or null if it is not a phone number. */
export function smsFromHash(hash: string): string | null {
  let raw = hash.replace(/^#/, '');
  try {
    raw = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (!/^\+?\d{7,15}$/.test(raw)) return null;
  return `sms:${raw}`;
}
