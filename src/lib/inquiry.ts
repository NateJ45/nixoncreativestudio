// The studio's project-inquiry form, mapped onto the shared contact endpoint's
// contract (src/lib/contact-submission.ts, PORTS.md card 45).
//
// The endpoint stores and emails four things: name, email, subject and message.
// This form asks for a dozen. Everything past the first four is folded into the
// message as `Label: value` lines in form order, so the stored row and the email
// carry the whole answer without the shared table growing columns only this
// site uses. Empty answers are left out.
//
// Pure on purpose (no bindings, no Astro), so it is unit-tested beside the
// endpoint in src/contact-endpoint.ts.

import type { RawSubmission } from './contact-submission.ts';
import { labelFor } from '../data/inquiry-options.ts';

/** The optional fields, in the order the form asks them, with the label the email shows. */
export const DETAIL_FIELDS = [
  ['org_type', 'Organization type'],
  ['runs', 'Who keeps it updated'],
  ['budget', 'Budget'],
  ['organization', 'Organization'],
  ['phone', 'Phone'],
  ['current_website', 'Current website'],
  ['timeline', 'Timeline'],
  ['heard_from', 'Heard about the studio from'],
  ['from', 'Came from page'],
  ['tier', 'Tier they were looking at'],
  ['service', 'Service they were looking at'],
  ['origin_org_type', 'Org type in the link'],
] as const;

const MAX_DETAIL = 300;

function text(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * Turn the form's fields (from FormData or JSON, both arrive as a flat record)
 * into the endpoint's RawSubmission.
 *
 * The honeypot input is named `botcheck` in the markup and passed on as
 * `company`, the name the shared spam check reads. `rendered_at` is the epoch
 * ms the script stamped when the page loaded; a no-JS post has none, and the
 * timing check then skips itself.
 */
export function inquiryToSubmission(fields: Record<string, unknown>): RawSubmission {
  const details = DETAIL_FIELDS.map(([key, label]) => {
    // The words the visitor saw ("$4,000 to $6,999"), not the stored key ("4k-7k").
    const value = text(fields[key]).slice(0, MAX_DETAIL);
    return value ? `${label}: ${labelFor(key, value)}` : '';
  }).filter(Boolean);

  const message = text(fields.message);
  const org = text(fields.organization);
  const name = text(fields.name);

  return {
    name,
    email: fields.email,
    // Only fold when there is a message: an empty message must still fail
    // validation rather than pass on the strength of the details alone.
    message: message && details.length ? `${message}\n\n${details.join('\n')}` : message,
    subject: `New project inquiry${org ? ` from ${org}` : name ? ` from ${name}` : ''}`,
    company: fields.botcheck,
    renderedAt: fields.rendered_at,
    turnstileToken: fields['cf-turnstile-response'],
  };
}
