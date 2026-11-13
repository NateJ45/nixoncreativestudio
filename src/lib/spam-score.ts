// The inquiry spam score: plain-reason points, added up, so a suspicious
// inquiry is labelled or held instead of landing in the inbox as a lead.
//
// Site-owned (the shared, PORTABLE spam check in contact-submission.ts stays
// the honeypot and timing floor every site gets). Modelled on the Theology
// Matters "check this" score: every point carries a reason a person can read,
// and no single signal blocks anything. A real church on a work VPN can show
// up as Germany; a real person can type their name as "JohnSmith". Only a pile
// of signals together is worth acting on.
//
// What the score does (src/contact-endpoint.ts):
//   below FLAG_AT  the inquiry is emailed as normal.
//   FLAG_AT up     emailed with "[Likely spam]" in the subject and the reasons
//                  at the top, so a Gmail filter or a glance can sort it.
//   HOLD_AT up     stored in D1 only, no email. `npm run contact:held` lists them.
// Every inquiry is stored first whatever its score, so nothing is ever lost.
//
// Calibrated on the first three real spam inquiries (2026-11-12 and 13, D1 rows
// 5 to 7): each scores 7 or more; every real and test inquiry scores 0.
//
// Pure: no bindings. Unit-tested in spam-score.test.ts.

export const FLAG_AT = 3;
export const HOLD_AT = 7;

export interface SpamSignals {
  /** The raw form fields (FormData or JSON, flattened). */
  fields: Record<string, unknown>;
  /** Cloudflare's two-letter country (cf-ipcountry), when known. */
  country: string | null;
  /** The network the request came from (request.cf.asOrganization), when known. */
  asOrg: string | null;
  /** How many inquiries this email address sent in the last 30 days, before this one. */
  recentFromSameEmail: number;
}

export interface SpamScore {
  score: number;
  reasons: string[];
  verdict: 'ok' | 'flag' | 'hold';
}

function str(v: unknown, max = 5000): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

/**
 * Throwaway inbox services. Short on purpose: the long public lists churn and
 * catch real providers. notboxletters.com is here because a spammer used it.
 */
const DISPOSABLE = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'sharklasers.com',
  'grr.la',
  '10minutemail.com',
  'temp-mail.org',
  'tempmail.com',
  'tempmailo.com',
  'yopmail.com',
  'trashmail.com',
  'getnada.com',
  'dispostable.com',
  'maildrop.cc',
  'fakeinbox.com',
  'throwawaymail.com',
  'mohmal.com',
  'emailnator.com',
  'mailnesia.com',
  'notboxletters.com',
]);

/**
 * Hosting and server networks: a person filling in a form is on a home, office
 * or phone network, a script usually is not. Akamai, Cloudflare and Fastly are
 * left OUT on purpose: iCloud Private Relay sends real Safari users through
 * them.
 */
const DATACENTER =
  /\b(amazon|aws|google cloud|microsoft|azure|digitalocean|ovh|hetzner|linode|vultr|choopa|contabo|leaseweb|m247|datacamp|cdn77|hostinger|scaleway|oracle|alibaba|tencent|hostwinds|colocrossing|psychz|quadranet|servers\.com|g-?core|ionos|frantech|buyvm|tzulo|packethub|clouvider|zenlayer|hostroyale|kamatera|cherry servers|worldstream|serverion|pq hosting|aeza|stark industries)\b/i;

/**
 * Small English words a real message in English almost cannot avoid. Matched
 * as whole words split on letters (\p{L}), not with \b: \b treats "ä" as a
 * break, so "Präis" would count as "is".
 */
const ENGLISH = new Set(
  'the a an and to for of in on with we our us i my me is are be it you your need want would like looking help site website web new church school have has can about this that'.split(
    ' ',
  ),
);

function hasGibberishToken(text: string): boolean {
  // A long run that mixes letters and digits: "NAERTERHTE2537443NEHTYHYHTR".
  return text.split(/\s+/).some((t) => t.length >= 12 && /[a-z]/i.test(t) && /\d/.test(t));
}

function looksNonEnglish(message: string): boolean {
  const words = message.toLowerCase().match(/\p{L}+/gu) ?? [];
  return words.length >= 5 && !words.some((w) => ENGLISH.has(w));
}

/** A one-word name glued from two capitalised parts: "RobertRoure", "StevenwaisaTJ". */
function gluedName(name: string): boolean {
  return !/\s/.test(name) && /^\p{Lu}\p{Ll}{2,}.*\p{Lu}/u.test(name);
}

/** Not a US number: 10 digits, or 11 starting with 1. Says nothing when the field is empty. */
function nonUsPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return false;
  return !(digits.length === 10 || (digits.length === 11 && digits.startsWith('1')));
}

function urlCount(text: string): number {
  return (text.match(/https?:\/\/|www\./gi) ?? []).length;
}

export function scoreInquiry(s: SpamSignals): SpamScore {
  const name = str(s.fields.name, 200);
  const email = str(s.fields.email, 320).toLowerCase();
  const message = str(s.fields.message);
  const organization = str(s.fields.organization, 300);
  const phone = str(s.fields.phone, 40);
  const domain = email.split('@')[1] ?? '';

  const reasons: string[] = [];
  let score = 0;
  const add = (points: number, reason: string) => {
    score += points;
    reasons.push(`${reason} (+${points})`);
  };

  const country = (s.country ?? '').toUpperCase();
  if (country === 'T1') add(3, 'Sent over Tor');
  else if (country && country !== 'XX' && country !== 'US')
    add(2, `Sent from outside the US (${country})`);

  if (s.asOrg && DATACENTER.test(s.asOrg))
    add(2, `Sent from a server network, not a home or phone (${s.asOrg})`);
  if (/\d/.test(name)) add(3, 'Name has numbers in it');
  else if (gluedName(name)) add(2, 'Name is two words glued together');
  if (hasGibberishToken(`${name} ${organization} ${message}`))
    add(2, 'Random letters and numbers in the text');
  if (DISPOSABLE.has(domain)) add(3, `Throwaway email address (${domain})`);
  if (looksNonEnglish(message)) add(2, 'Message is not in English');
  if (urlCount(message) >= 2) add(2, 'Message has several links');
  if (nonUsPhone(phone)) add(1, 'Phone is not a US number');
  if (s.recentFromSameEmail > 0) {
    add(
      1,
      `Same email sent ${s.recentFromSameEmail} other inquir${s.recentFromSameEmail === 1 ? 'y' : 'ies'} this month`,
    );
  }

  const verdict = score >= HOLD_AT ? 'hold' : score >= FLAG_AT ? 'flag' : 'ok';
  return { score, reasons, verdict };
}

/**
 * Checks this form's own rules that the shared validator does not know: the
 * org type question is required in the form (src/scripts/contact.js) and the
 * message needs 30 letters, so a post that skips them did not come through the
 * form. Shown to the visitor, so the words match the form's own.
 */
export function inquiryRuleErrors(
  fields: Record<string, unknown>,
  orgTypes: readonly string[],
): Record<string, string> {
  const errors: Record<string, string> = {};
  const orgType = str(fields.org_type, 100);
  if (!orgType || !orgTypes.includes(orgType)) {
    errors.org_type =
      "Choose the kind of organization closest to yours. It doesn't have to be exact.";
  }
  const message = str(fields.message);
  if (message && message.length < 30) {
    errors.message = 'Write a little more about what you hope to build: at least 30 letters.';
  }
  return errors;
}
