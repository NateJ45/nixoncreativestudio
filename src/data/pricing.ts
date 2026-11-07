/* ============================================================================
   Pricing | Single source of truth for studio pricing
   ============================================================================
   The /services page (tier cards, the "add to any project" strip, the care
   levels, the FAQ answers and the JSON-LD offers), the homepage PricingTeaser,
   the /contact budget brackets, the /photography and /services meta
   descriptions and /llms.txt all read their numbers from here, so they can
   never drift apart. Change a price once, in this file, and every surface
   updates on the next build. Same single-source pattern as src/data/site.ts.
   Prose that quotes a price reads it with money() or, from a display string
   like 'from $900', dollars() (src/lib/money.ts).

   The numbers reflect the 2026 market for an agency-grade solo studio:
   Launch from $3,500, Signature from $6,500, Flagship from $12,500, plus the
   add-ons. If a number changes here, also
   update the strategy doc (outside this repo). Keep the dollar amounts in the
   display strings (price, range, time) written as '$1,234': the JSON-LD and
   the FAQ read them back out of those strings.
   ============================================================================ */

export interface WebTier {
  /** Tier name shown on both surfaces. */
  name: string;
  /** Numeric floor. Drives both price displays (static text, no count-up). */
  priceFrom: number;
  /** Trailing glyph after the price, e.g. '+'. */
  priceSuffix: string;
  /** One-line "who it's for", used by the compact homepage teaser. */
  who: string;
  /** Typical-range line shown under the price on /services. */
  range: string;
  /** Who the tier fits, in their situation. Leads the tier on /services. */
  fits: string;
  /** What I take responsibility for. Second on /services, and on /one-page/. */
  responsible: string;
  /** The care level the honest cost table pairs with this tier (src/lib/tier-costs.ts). */
  care: string;
  /** "What's included" bullets on /services. */
  features: string[];
  /** The anchor tier (Signature): gets the accent border + badge. */
  highlighted: boolean;
  /** Badge text shown on the highlighted tier. */
  badge?: string;
}

// The three web design tiers. Every build is custom-designed and comes with a
// system the client can run, so the tiers do NOT differ in whether the work is
// custom or whether there is a CMS. They differ in scope and in how much the
// organization runs itself: Launch, one busy person keeps the essentials
// current. Signature, a team runs it, so it gets the staff home screen, checks
// and event tracking. Flagship, the site does real work, so it gets custom tools,
// workflows and reporting. Sanity or WordPress is chosen per client, not sold as
// an option. Ranges say what to expect: no claim about what most clients paid.
export const webTiers: WebTier[] = [
  {
    name: 'Launch',
    priceFrom: 3500,
    priceSuffix: '+',
    who: 'You keep the essentials current',
    range: 'Expect $3,500 to $6,000',
    fits: 'A smaller organization where one busy person keeps the site current. You want the essential pages done well, and you would rather not call anyone to change a date.',
    responsible:
      'I plan, design and build your core pages, set up an editor simple enough for one person, and write the guide they will use.',
    care: 'Light Care',
    features: [
      'A focused set of core pages, designed around your goals',
      'A plain editor with a written guide, and deleted pages you can get back',
      'Visitor numbers, plus the calls and forms that matter',
      'Year one hosting included',
    ],
    highlighted: false,
  },
  {
    name: 'Signature',
    priceFrom: 6500,
    priceSuffix: '+',
    who: 'Your team runs it',
    range: 'Expect $6,500 to $11,000',
    fits: 'A staff or volunteer team who will run the site themselves, across several kinds of content, and who expect people to come and go.',
    responsible:
      'I plan and build a larger site, set up the editor around the people using it so a new volunteer can find their way without a phone call, and set up tracking for what matters to you.',
    care: 'Care',
    features: [
      'A larger site with deeper content sections',
      'A home screen for your staff: what is coming up, what needs fixing, whether it is live',
      'Checks before anything publishes, and earlier versions to go back to',
      'Tracking for what matters to you: gifts, registrations, sign-ups',
      'Year one hosting included',
    ],
    highlighted: true,
  },
  {
    name: 'Flagship',
    priceFrom: 12500,
    priceSuffix: '+',
    who: 'The site does real work',
    range: 'Quoted from $12,500, by scope',
    fits: 'An organization whose site has to do real work: a custom tool, a staff workflow, a connection to systems you already use, or reports a board can actually read. If none of that is you, this is more than you need.',
    responsible:
      'I design and build the tools, map the workflows around how your staff work, connect the systems, build the reporting, and quote the care those tools will need.',
    care: 'Care+',
    features: [
      'Custom interactive tools and features',
      'Staff workflows and integrations built around how you work',
      'A deep content system for a large site',
      'Reporting built for your staff and your board',
      'Year one hosting included',
    ],
    highlighted: false,
  },
];

// The same short block on every tier, on /services and /one-page/. The promise is
// that a client can leave, not that they hold the accounts: Nathan runs the hosting
// and the repos on purpose (decided 2026-11-07). Do not say the domain, hosting or
// accounts are in the client's name.
export const freeToMove: string[] = [
  'I host it and look after the code, so there is nothing for you to run.',
  'It uses well-used tools, WordPress or Sanity, GitHub and Cloudflare, that another developer can pick up.',
  'If you ever move on, the code, content and documentation go with you.',
];

export interface AddOn {
  name: string;
  /** Display price string (these are ranges/floors, not a single number). */
  price: string;
  note: string;
}

// Add to any project. Photography and standalone brand/strategy, each with its
// own honest floor. Used by the /services add-on strip. Care after launch has
// its own list below (carePlans).
export const addOns: AddOn[] = [
  {
    name: 'Photography',
    price: 'from $900',
    note: 'Headshots, brand, and environmental photos shot for your site by the person who designed it. A half-day starts at $900 and a full day runs about $1,200, often folded into a build or booked on its own across the Cincinnati region.',
  },
  {
    name: 'Brand & strategy',
    price: '$500 to $2,000',
    note: 'Standalone strategy or brand-identity work for when you need it on its own. Strategy is already built into every website project.',
  },
];

// Custom work outside a care plan, per hour. Ordinary changes are in Hosting's
// `time` line below. The /services FAQ reads this.
export const customWorkRate = 150;

export interface CarePlan {
  name: string;
  /** Display price, e.g. '$49'. */
  price: string;
  /** Billing period shown after the price, e.g. '/mo'. */
  period: string;
  /** One-line "who it's for". */
  who: string;
  /** Included-time line, e.g. '30 minutes of edits each month'. */
  time: string;
  features: string[];
  /** True for a care add-on, paid on top of Hosting, never instead of it. */
  addOn?: boolean;
}

// Care after launch. Hosting is paid by every live site, from year two, since
// year one Hosting is included in every web tier (see the tier features above).
// Care is an add-on on top of Hosting (Nathan, 2026-11-07): billed monthly from
// launch, never instead of Hosting, and never with a free first year. The add-ons
// bring edit time, the monthly report and faster replies. Change a level here and in the proposal template
// together, and keep the /services "Do I need a care plan" answer in step.
// These prices are for new work: signed agreements keep what they say.
export const carePlans: CarePlan[] = [
  {
    name: 'Hosting',
    price: '$200',
    period: '/yr',
    who: 'For an organization that edits everything itself.',
    time: 'No edits included; changes at $100 an hour',
    features: [
      'Fast, secure hosting',
      'Software and security updates',
      'Uptime monitoring, every 15 minutes',
      'Daily backups',
      'Domain and security renewals handled',
    ],
  },
  {
    name: 'Light Care',
    price: '$59',
    period: '/mo',
    addOn: true,
    who: 'For an organization that would rather send changes than make them.',
    time: 'Send me changes, up to 30 minutes a month; unused minutes carry over for three months',
    features: [
      'Fixes when something breaks, at no extra charge',
      'Ask me how to do anything in the editor',
      'Extra work at $85 an hour',
      'Email replies within 2 business days',
    ],
  },
  {
    name: 'Care',
    price: '$129',
    period: '/mo',
    addOn: true,
    who: 'For peace of mind as the site grows.',
    time: '1 hour of edits each month',
    features: [
      'Everything in Light Care',
      'A monthly report: what people did, and what to fix',
      'A yearly backup restore test',
      'Annual health report: speed, search, security',
      'Next business day replies',
    ],
  },
  {
    name: 'Care+',
    price: '$259',
    period: '/mo',
    addOn: true,
    who: 'For an organization that wants a web partner.',
    time: '3 hours of content help each month',
    features: [
      'Everything in Care',
      '2 new pages or features a year',
      'Quarterly check-in and analytics review',
      'Same business day replies',
    ],
  },
];
