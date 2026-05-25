/* ============================================================================
   Site Data | Single source of truth for contact and identity values
   ============================================================================
   Anywhere on the site that displays an email address, phone number, name,
   studio name, business address, social URL, or canonical domain pulls from
   here. Update a value in this file and every page picks up the change on
   the next build. No more hunting through component files when something
   changes.

   What belongs in this file:
     - Structured contact info that appears in multiple places
     - Identity strings that should stay in sync sitewide
     - Social and marketing URLs that show up in the Footer and elsewhere

   What does NOT belong here:
     - Page-specific copy or marketing prose
     - One-off content like the About story (that's biography, not contact)
     - Anything that only appears once on the site
   ============================================================================ */


/* ----------------------------------------------------------------------------
   Type definition
   ----------------------------------------------------------------------------
   Keeping this typed gives the editor autocomplete and warns if a consumer
   asks for a field that doesn't exist. The `as const` at the bottom freezes
   the literal string types, so e.g. `site.address` has type `"Cincinnati, OH"`
   rather than the loose `string`. Helpful for catching typos at the point of
   use.
   ---------------------------------------------------------------------------- */

interface SiteData {
  // Identity
  ownerName: string;       // Person who owns the studio.
  studioName: string;      // Brand / business name.

  // Reach
  email: string;           // Primary inbox for inquiries.
  phone: string;           // Display number (formatted for humans).
  address: string;         // Public-facing locale, not a street address.

  // Web
  domain: string;          // Bare host, e.g. for the form subject line.
  url: string;             // Full canonical URL, used in meta and structured data.

  // Social
  social: {
    instagram: string;
    linkedin: string;
  };

  // Marketing
  tagline: string;         // One-line studio positioning.

  // Helpers
  phoneHref: string;       // Pre-computed tel: target.
  emailHref: string;       // Pre-computed mailto: target.
}


/* ----------------------------------------------------------------------------
   The values themselves
   ----------------------------------------------------------------------------
   These are the strings that appear (or get derived to appear) anywhere on
   the site. Editing any value here flows out everywhere on the next build.
   ---------------------------------------------------------------------------- */

const _email   = 'nathan@nixoncreativestudio.com';
const _phone   = '(256) 318-6627';
const _domain  = 'nixoncreativestudio.com';

// Tel hrefs strip everything that isn't a digit so the OS dialer can read
// the number cleanly. For US numbers this is fine; for international numbers
// we'd want a leading + and country code.
const _phoneDigits = _phone.replace(/\D/g, '');

export const site: SiteData = {

  ownerName:  'Nathan Nixon',
  studioName: 'Nixon Creative Studio',

  email:   _email,
  phone:   _phone,
  address: 'Cincinnati, OH',

  domain: _domain,
  url:    `https://${_domain}`,

  social: {
    instagram: 'https://instagram.com/nixoncreativestudio',
    linkedin:  'https://www.linkedin.com/in/nathanjnixon',
  },

  tagline: 'Modern websites for small businesses, nonprofits, churches, and schools in the Cincinnati region.',

  // Pre-computed link targets so consumers don't have to repeat the
  // string-stripping logic at every call site.
  phoneHref: `tel:${_phoneDigits}`,
  emailHref: `mailto:${_email}`,

} as const;
