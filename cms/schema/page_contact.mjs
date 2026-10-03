// Safe to edit.
/* ============================================================================
   page_contact  (cms/schema)
   ============================================================================
   The words on /contact, apart from the form's own labels and messages. A
   singleton: one entry (slug `contact`), read by getContactPage() in
   src/lib/contactPage.ts. Design: docs/CMS-DESIGN.md 1.8.

   What it edits, in page order:
     Masthead             the headline (two colours: plain part plus accent phrase)
                          and the paragraph under it
     The form's lists     the Budget range, Project timeline and "How did you hear
                          about us" choices
     Sidebar              the "What happens next" lines and the "Where I am" text
     Closing banner       title, text and button label (empty uses the default)

   WHAT A VISITOR PICKS IS WHAT YOU RECEIVE. The text of each choice is exactly
   what arrives in the inquiry email ("Budget: Under $4,000"). Rename a choice and
   the emails change with it; there is no hidden code behind it to keep in step.

   Not here, on purpose: the field labels and help text, the validation and
   success/error messages (the success text includes the domain), the Web3Forms
   key and form wiring, and the Organization type list (it matches the sector
   names used by the case studies, so it stays in code).

   BUDGET BRACKETS AND PRICES. The Budget choices should line up with the Pricing
   tiers (Launch, Signature, Flagship starting prices). The first choice should sit
   at the lowest tier's starting price so the form never invites work below it.
   After a price change, update this list too (and the FAQ answers on the Services
   page).

   Field limits: `maxLength` on a plain string or text field IS enforced by the
   server. A repeater's own `minItems` / `maxItems` are enforced too, but EmDash
   keeps no limit on a repeater ROW field, so those labels state the length and
   the editing guide repeats it.
   ============================================================================ */

import { commonPageFields, singletonSettings } from '../../scripts/lib/emdash-schema.mjs';

export const SLUG = 'page_contact';

export const COLLECTION = singletonSettings({
  label: 'Contact page',
  labelSingular: 'Contact page',
  description: 'The words on the Contact page: headline, the form choices and the sidebar.',
  group: 'Pages',
  sortOrder: 4,
  titleField: 'seo_title',
});

export const FIELDS = [
  // Search and tab title (the studio name is added for you), search description, and
  // the closing banner's title and text.
  ...commonPageFields({ cta: true }),
  {
    slug: 'cta_label',
    type: 'string',
    label: 'Closing banner button text (max 24). The button emails you',
    required: true,
    validation: { maxLength: 24 },
  },

  // ── Masthead ──────────────────────────────────────────────────────────────
  {
    slug: 'heading',
    type: 'string',
    label: 'Headline, plain part (max 40). The accent phrase below follows it',
    required: true,
    validation: { maxLength: 40 },
  },
  {
    slug: 'heading_accent',
    type: 'string',
    label: 'Headline, accent phrase shown in blue (max 24)',
    required: true,
    validation: { maxLength: 24 },
  },
  {
    slug: 'intro',
    type: 'text',
    label: 'Paragraph under the headline (max 400)',
    required: true,
    validation: { maxLength: 400 },
  },

  // ── The form's choice lists ───────────────────────────────────────────────
  {
    slug: 'budgets',
    type: 'repeater',
    label:
      'Budget range choices (2 to 6, in order; each under 40 characters). What the visitor picks is what arrives in your email. Keep these in line with the Pricing tiers: the first choice should start at the lowest tier price',
    required: true,
    validation: {
      minItems: 2,
      maxItems: 6,
      subFields: [{ slug: 'label', label: 'Choice', type: 'string', required: true }],
    },
  },
  {
    slug: 'timelines',
    type: 'repeater',
    label:
      'Project timeline choices (2 to 6, in order; each under 48 characters). What the visitor picks is what arrives in your email. The field itself is optional on the form',
    required: true,
    validation: {
      minItems: 2,
      maxItems: 6,
      subFields: [{ slug: 'label', label: 'Choice', type: 'string', required: true }],
    },
  },
  {
    slug: 'heard_from',
    type: 'repeater',
    label:
      '"How did you hear about us" choices (2 to 8, in order; each under 64 characters). What the visitor picks is what arrives in your email. The field itself is optional on the form',
    required: true,
    validation: {
      minItems: 2,
      maxItems: 8,
      subFields: [{ slug: 'label', label: 'Choice', type: 'string', required: true }],
    },
  },

  // ── Sidebar ───────────────────────────────────────────────────────────────
  {
    slug: 'next_steps',
    type: 'repeater',
    label:
      'What happens next (2 to 4 short lines, in order; each under 120 characters). Keep the response time honest: this is a promise',
    required: true,
    validation: {
      minItems: 2,
      maxItems: 4,
      subFields: [{ slug: 'text', label: 'Line', type: 'string', required: true }],
    },
  },
  {
    slug: 'where_text',
    type: 'text',
    label:
      'Where I am: text after your address (max 300). The address itself comes from Site settings and is shown first',
    required: true,
    validation: { maxLength: 300 },
  },
];
