// Safe to edit.
/* ============================================================================
   site_settings  (cms/schema)
   ============================================================================
   The shared values every page reads: contact details, socials, the footer
   "Currently" line, the default closing-banner copy, the fallback meta
   description and the RSS feed title. One entry (slug `site`), read by
   getSite() in src/data/site.ts. Design: docs/CMS-DESIGN.md section 1.2.

   EmDash's own Site Settings screen (title, tagline, logo) is NOT read by the
   site; this collection is the one place to edit these values.

   Left in code on purpose: the domain and canonical URL (bound to the deployment
   and the admin passkey origin), see src/data/site.ts.

   Deviation from the design table: there is no `footer_blurb` field. The footer
   has no brand paragraph today (its bottom row shows the tagline), so a field
   would edit nothing. Add it with the paragraph when the footer design wants one.

   Field limits: `maxLength` on a plain string or text field IS enforced by the
   server. The label says the number so editors see it.
   ============================================================================ */

import { singletonSettings } from '../../scripts/lib/emdash-schema.mjs';

export const SLUG = 'site_settings';

export const COLLECTION = singletonSettings({
  label: 'Site settings',
  labelSingular: 'Site settings',
  description: 'Contact details, social links and the shared copy that appears on every page.',
  group: 'Site',
  // The admin's "live view" button opens this address (the shared copy shows on every page, so the homepage). A fixed address is allowed.
  urlPattern: '/',
  sortOrder: 0,
  titleField: 'studio_name',
});

export const FIELDS = [
  {
    slug: 'studio_name',
    type: 'string',
    label: 'Studio name (max 40)',
    required: true,
    validation: { maxLength: 40 },
  },
  {
    slug: 'owner_name',
    type: 'string',
    label: 'Owner name (max 40)',
    required: true,
    validation: { maxLength: 40 },
  },
  {
    slug: 'email',
    type: 'string',
    label: 'Email address (shown in the footer, contact page and menu; max 80)',
    required: true,
    validation: { maxLength: 80, pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$' },
  },
  {
    slug: 'phone',
    type: 'string',
    label: 'Phone number, as people should read it (max 24)',
    required: true,
    validation: { maxLength: 24 },
  },
  {
    slug: 'location',
    type: 'string',
    label: 'Location line, for example "Cincinnati, OH" (max 40)',
    required: true,
    validation: { maxLength: 40 },
  },
  {
    slug: 'tagline',
    type: 'text',
    label: 'Tagline (footer, search results and the feed; max 160)',
    required: true,
    validation: { maxLength: 160 },
  },
  { slug: 'instagram_url', type: 'url', label: 'Instagram link', required: true },
  { slug: 'linkedin_url', type: 'url', label: 'LinkedIn link', required: true },
  {
    slug: 'booking_url',
    type: 'url',
    label: 'Booking link, for example a Cal.com page (empty hides "Book a call")',
  },
  {
    slug: 'newsletter_url',
    type: 'url',
    label: 'Newsletter sign-up link (empty hides the newsletter block)',
  },
  {
    slug: 'header_cta_label',
    type: 'string',
    label: 'Header button text, also used in the phone menu (max 20)',
    required: true,
    validation: { maxLength: 20 },
  },
  {
    slug: 'footer_currently',
    type: 'text',
    label: 'Footer "Currently" line (change with the season; max 180)',
    required: true,
    validation: { maxLength: 180 },
  },
  {
    slug: 'cta_default_title',
    type: 'string',
    label: 'Closing banner title on pages that do not set their own (max 60)',
    required: true,
    validation: { maxLength: 60 },
  },
  {
    slug: 'cta_default_sub',
    type: 'text',
    label: 'Closing banner text on pages that do not set their own (max 200)',
    required: true,
    validation: { maxLength: 200 },
  },
  {
    slug: 'cta_default_label',
    type: 'string',
    label: 'Closing banner button text (max 24)',
    required: true,
    validation: { maxLength: 24 },
  },
  {
    slug: 'default_description',
    type: 'text',
    label: 'Search description for a page that has none (max 160)',
    required: true,
    validation: { maxLength: 160 },
  },
  {
    slug: 'rss_title',
    type: 'string',
    label: 'Feed title (max 70)',
    required: true,
    validation: { maxLength: 70 },
  },
  {
    slug: 'rss_description',
    type: 'text',
    label: 'Feed description (max 200)',
    required: true,
    validation: { maxLength: 200 },
  },
];
