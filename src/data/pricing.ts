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
  /** Typical-range line shown under the price on /services and /one-page/. */
  range: string;
  /** Top of the usual range, when the tier has one (Flagship is quoted by scope). */
  rangeTo?: number;
  /**
   * The lowest care add-on this tier needs, when it needs one. Flagship's custom
   * tools need Care or Care+, so its cost rows never show Hosting alone
   * (Nathan, 2026-11-07).
   */
  needsCare?: string;
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
    range: 'Usually $3,500 to $6,000',
    rangeTo: 6000,
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
    range: 'Usually $6,500 to $11,000',
    rangeTo: 11000,
    fits: 'A staff or volunteer team who will run the site themselves, across several kinds of content, and who expect people to come and go.',
    responsible:
      'I plan and build a larger site, set up the editor around the people using it so a new volunteer can find their way without a phone call, and set up tracking for what matters to you.',
    care: 'Care',
    features: [
      'A larger site with more sections',
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
    needsCare: 'Care',
    fits: 'An organization whose site has to do real work: a custom tool, a staff workflow, a connection to systems you already use, or reports a board can actually read. If none of that is you, this is more than you need.',
    responsible:
      'I design and build the tools, map the workflows around how your staff work, connect the systems, build the reporting, and quote the care those tools will need.',
    care: 'Care+',
    features: [
      'Custom tools built for your site',
      'Staff tasks and connections to the systems you already use, built around how you work',
      'Room for lots of kinds of pages on a large site',
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
  'It is built on WordPress or other common tools that any web developer can pick up.',
  'If you ever move on, the code, content and documentation go with you.',
];

export interface AddOn {
  name: string;
  /** Display price string (these are ranges/floors, not a single number). */
  price: string;
  /** The unit shown small after the price, in words: 'a half day', 'one-time'. */
  unit: string;
  note: string;
}

// Add to any project: the extras people ask for most, each with its own honest
// price. Used by the /services add-on strip, /photography and /llms.txt. Every
// price string must hold its dollar amounts lowest first ('$350 to $650'),
// because the page's structured data reads them from the same string. There is
// no drawn-logo or brand-identity add-on on purpose (decided 2026-11-13): the
// wordmark is type and color only. Care after launch has its own list below
// (carePlans). When a price here changes, change the Google Business Profile
// services too (docs/PENDING.md).
export const addOns: AddOn[] = [
  {
    name: 'Photography',
    price: 'from $1,000',
    unit: 'a half day',
    note: 'Portraits, buildings and people at work, shot for your site by the person who designed it. A half day is $1,000 and a full day is $1,600, as part of a build or booked on its own across the Cincinnati region.',
  },
  {
    name: 'Writing your pages',
    price: 'from $900',
    unit: 'five core pages',
    note: 'I interview you, write the pages in plain words, and you approve every one before it goes live. Each page after the first five is $180.',
  },
  {
    name: 'Moving a large archive',
    price: 'from $1,500',
    unit: 'quoted by count',
    note: 'Years of sermons, articles, results or documents moved across, tidied and made searchable, with old links redirected. Your core pages are already moved in every build.',
  },
  {
    name: 'Simple wordmark',
    price: '$600',
    unit: 'one-time',
    note: 'Your name set in type, with colors and a browser icon. Two options and one round of changes.',
  },
  {
    name: 'Business listings',
    price: '$350 to $650',
    unit: 'one-time',
    note: 'Your organization claimed and filled in on Google, Apple Maps, Bing, Yelp and ChatGPT, all matching the site, for $650. Google alone is $350. You will need to answer a few verification codes and pass a quick ID check for ChatGPT.',
  },
];

// Custom development (new features and tools), per hour, quoted in writing first.
// Ordinary changes are billed at each plan's `rate` below. /services reads this.
export const customWorkRate = 150;

// The date every printed price is good for. /services and /one-page/ print it, so a
// printout and the live page can be told apart. Change it whenever a price changes.
export const pricesAsOf = 'November 2026';

/** How a plan's period reads in words: '/yr' is 'a year', '/mo' is 'a month'. */
export const perWords = (period: string): string => (period === '/yr' ? 'a year' : 'a month');

export interface CarePlan {
  name: string;
  /** Display price, e.g. '$49'. */
  price: string;
  /** Billing period shown after the price, e.g. '/mo'. */
  period: string;
  /** One-line "who it's for". */
  who: string;
  /** Included-time line, a sentence, e.g. '30 minutes of changes a month'. /llms.txt reads it. */
  time: string;
  /** The same time in a table cell: "Changes I make for you each month". */
  edits: string;
  /** What extra changes cost on this plan, per hour. */
  rate: number;
  /** Replies, and what happens when something breaks, in words. Never a bare dash. */
  support: string;
  /** What the plan covers, in one short line, for the "What Hosting and care cover" box on /one-page/. */
  short: string;
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
    time: 'No changes included; I make changes at $100 an hour',
    edits: 'None',
    rate: 100,
    // Nathan's words, 2026-11-07. Light Care and up keep "Fixes when something breaks".
    support:
      'If the site goes down, I investigate and fix it. An outage at Cloudflare itself can be outside my control. If a change you made breaks it, I fix it at my hourly rate.',
    short:
      'Hosting, security updates, daily backups and a check that the site is up. You make changes, or I do at $100 an hour.',
    features: [
      'Fast, secure hosting',
      'Security updates when a known weakness in the software is patched',
      'A check every 15 minutes that the site is up',
      'Daily backups',
      'Web address and security certificate renewals handled',
    ],
  },
  {
    name: 'Light Care',
    price: '$59',
    period: '/mo',
    addOn: true,
    who: 'For an organization that would rather send changes than make them.',
    time: '30 minutes of changes a month, and unused minutes carry over for three months',
    edits: '30 minutes',
    rate: 85,
    support:
      'Email replies within 2 business days. Fixes when something breaks, at no extra charge.',
    short:
      '30 minutes of changes a month, software updates, fixes at no extra charge, replies within 2 business days.',
    features: [
      "Software updates: WordPress, plugins and the site's code kept current",
      'Ask me how to do anything in the editor',
    ],
  },
  {
    name: 'Care',
    price: '$129',
    period: '/mo',
    addOn: true,
    who: 'For peace of mind as the site grows.',
    time: '1 hour of changes a month',
    edits: '1 hour',
    rate: 85,
    support: 'Next business day replies. Fixes when something breaks, at no extra charge.',
    short:
      'Everything in Light Care, 1 hour of changes a month, a monthly report, next-day replies.',
    features: [
      'Everything in Light Care',
      'A monthly report: what people did, and what to fix',
      'A yearly test that the backups really restore',
      'A yearly health report: speed, search, security',
    ],
  },
  {
    name: 'Care+',
    price: '$259',
    period: '/mo',
    addOn: true,
    who: 'For an organization that wants a web partner.',
    time: '3 hours of changes a month',
    edits: '3 hours',
    rate: 85,
    support: 'Same business day replies. Fixes when something breaks, at no extra charge.',
    short:
      'Everything in Care, 3 hours of changes a month, 2 new pages or features a year, same-day replies.',
    features: [
      'Everything in Care',
      '2 new pages or features a year',
      'A check-in every 3 months, with a look at your visitor numbers',
    ],
  },
];
