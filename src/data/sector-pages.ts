/* ============================================================================
   Sector pages
   ============================================================================
   Which sectors have their own page, and that page's title and description.
   /churches/ is its own build (src/pages/churches.astro). /schools/, /nonprofits/
   and /small-business/ are lean: one thin .astro file each, all drawn by
   src/components/SectorLean.astro from the copy here. Each carries one tool, "Try it": a few
   questions asked of one client's real phone page (the `ask` block, see LeanAsk below).
   A study's sector line and the JSON-LD trail ask sectorPagePath() where to link.
   A new sector page gets its own .astro file, an entry here, a line in
   tests/routes.ts and one in scripts/generate-og.mjs.

   Keep the proof honest. Say what is thin, in the page's own words, and never tie
   a client to a tier or a price. No outcome promises about attendance, gifts,
   enrollment or leads.
   ============================================================================ */

export type SectorKey = 'church' | 'school' | 'nonprofit' | 'small-business';

export interface SectorPage {
  /** The URL segment: /churches/. */
  path: string;
  /** The case-study `sector` value this page collects. */
  sector: SectorKey;
  /** The <title>, before " | Nixon Creative Studio". Keep the whole title under 60 characters. */
  title: string;
  /** Meta description, 110 to 160 characters. `{n}` becomes the study count. */
  description: string;
  /** The breadcrumb name. */
  label: string;
  /** The link back to this page from a case study. */
  linkText: string;
}

export interface LeanPoint {
  title: string;
  body: string;
}
/** A piece of copy with links in it: plain strings, or text and a href. */
export type Rich = (string | { text: string; href: string })[];

/** One question for "Try it", and where its answer sits on the client's real phone page. */
export interface AskQuestion {
  /** The question, in the visitor's words. */
  q: string;
  /** How far down it was found: "Found it on the first screen," or "Found it about 2 scrolls down,". */
  where: string;
  /** What is there. Name the page's own headings and buttons, never a detail that changes. */
  a: string;
  /** Where the window rests, in pixels of the 560-wide capture (one phone screen is about 1,090). */
  stop: number;
}

/* "Try it" on a lean page: the questions a first-time visitor asks, answered by scrolling one
   client's real homepage in a phone window (src/scripts/ask.js, the engine /churches/ uses).
   The picture is the long phone capture every study already has,
   public/assets/study/{slug}-mobile.webp, 560 by 4000. Every `where` and `a` below was written
   by looking at that capture with a ruler on it, so each one is TRUE of the picture: re-check
   them all whenever a capture is re-shot (npm run capture:study). A stop past about 2,900 cannot
   be reached, since the capture ends at 4,000. If a page cannot honestly answer a question,
   leave the question out. */
export interface LeanAsk {
  /** The case study whose capture is shown. */
  slug: string;
  /** Who is asking, for the heading: "Ask what a new student asks." */
  who: string;
  questions: AskQuestion[];
}

export interface LeanSector extends SectorPage {
  /** The H1, as HTML with the heavy words in <b>. */
  heading: string;
  /** The job, in this buyer's language. */
  lede: string;
  /** What the site has to do here. */
  points: LeanPoint[];
  /** Over the studies: how much proof there is, said plainly. */
  proofNote: Rich;
  /** Under the studies, when there is closer work elsewhere. */
  closest?: Rich;
  /** Under the tiers: anything this buyer should weigh, and when to walk away. */
  tierNotes: string[];
  /** "Try it": questions asked of one client's real phone page. */
  ask: LeanAsk;
}

export const CHURCHES: SectorPage = {
  path: 'churches',
  sector: 'church',
  title: 'Church website design in Cincinnati',
  description:
    'Church websites I designed and built: a clear first Sunday for visitors, and pages the staff keep current. Read the case studies and visit the live sites.',
  label: 'Churches',
  linkText: 'How I build for churches',
};

export const SCHOOLS: LeanSector = {
  path: 'schools',
  sector: 'school',
  title: 'School website design in Cincinnati',
  description:
    'School websites built around what families ask first: what it costs, how to visit and how to start, with honest advice on which tier fits your school.',
  label: 'Schools',
  linkText: 'How I build for schools',
  heading: `School websites built around <b>a family's first questions.</b>`,
  lede: 'A family deciding on a school wants to know what it is, who it is for, what it costs and how to come and see it. The site should answer all of that before anyone has to phone the office, and then the office should be able to keep it current.',
  points: [
    {
      title: 'Answer the first questions',
      body: 'What the school is, who it is for, what it costs and how to visit, in plain words and in that order.',
    },
    {
      title: 'Make the next step obvious',
      body: 'An inquiry, a tour or an application, each one clear and easy on a phone. I can set up a count of how many come through, so you can see the number for yourself.',
    },
    {
      title: 'Let the office keep it current',
      body: 'Calendars, staff, tuition and forms, in editing screens set up for the people who run the office, so changes never wait on a developer.',
    },
  ],
  proofNote: [
    'The Presbyterian Academy shows the same job done for a new school: what it is, who it is for, what it costs and how to start. I will be straight about the rest. It is the one school in my case studies, and it is new, so I have no enrollment figures to show you. It also teaches adults in small groups that study together, so it is not a school for children with tours and a tuition schedule.',
  ],
  closest: [
    'For the parts it does not cover, the closest work I can show you is ',
    { text: 'Stone Steps 50K', href: '/work/stone-steps-50k/' },
    ', which puts the date, the fees and registration on the home page, and ',
    { text: 'Reid Design', href: '/work/reid-design/' },
    ', which posts every price before the first call.',
  ],
  tierNotes: [
    'If you use an admissions or school management system, tell me early. What has to connect to it is part of what sets the tier.',
    'One way to weigh the cost: divide the first-year cost by a year of tuition. The answer is how many students, for one year each, would cover it. I cannot promise you a single student, so only you can judge whether that number looks reachable.',
  ],
  ask: {
    slug: 'presbyterian-academy',
    who: 'a new student',
    questions: [
      {
        q: 'Who is it for?',
        where: 'Found it on the first screen,',
        a: 'in the lines under the headline: who the school teaches, and how it meets.',
        stop: 120,
      },
      {
        q: 'What would I study?',
        where: 'Found it about 1 scroll down,',
        a: 'under Contents: every course by name, with who teaches it.',
        stop: 1000,
      },
      {
        q: 'What does it cost?',
        where: 'Found it about 2 scrolls down,',
        a: 'under The courses: each course shows its price beside its dates.',
        stop: 2330,
      },
      {
        q: 'Can I visit before I sign up?',
        where: 'Found it on the first screen,',
        a: 'twice: a Visit free link in the top bar, and a Book a free intro button.',
        stop: 0,
      },
    ],
  },
};

export const NONPROFITS: LeanSector = {
  path: 'nonprofits',
  sector: 'nonprofit',
  title: 'Nonprofit website design',
  description:
    'Nonprofit websites a small staff can run, with honest first-year and five-year costs, real case studies, and a summary you can take to your board or a funder.',
  label: 'Nonprofits',
  linkText: 'How I build for nonprofits',
  heading: `Nonprofit websites <b>a small staff can run.</b>`,
  lede: 'A funder, a new volunteer and a long-time supporter all check the site, often before they call. It should say plainly what you do and make it easy to help. And it has to stay current on the hours a small staff actually has.',
  points: [
    {
      title: 'Say what you do, plainly',
      body: 'The mission, the programs and who you serve, so someone new can understand you without reading a report.',
    },
    {
      title: 'Make it easy to help',
      body: 'Giving, signing up and getting involved, one step from where people already are. I can set up counts of what matters to you, though I cannot promise how many will come.',
    },
    {
      title: 'Stay current on a small staff',
      body: 'Editing screens built around the jobs your people actually do, with short written help beside them, so the site never waits on a developer.',
    },
  ],
  proofNote: [
    'The nonprofits in my case studies are a journal, a theological library and a trail race. If you run a food pantry or a clinic, your pages would differ, but the jobs above stay the same, and these show how I handle them.',
  ],
  tierNotes: [
    'Need this for a board or a grant? I can prepare a short summary of your project: the scope, the three-year cost, the upkeep and what happens if you ever move on.',
    'If your budget is small, one of these tiers may be too large a share of it. Tell me the number and I will say so.',
  ],
  ask: {
    slug: 'theology-matters',
    who: 'a new reader',
    questions: [
      {
        q: 'What is in the current issue?',
        where: 'Found it on the first screen,',
        a: 'under the name of the issue: how many articles, to read on the page or in print.',
        stop: 150,
      },
      {
        q: 'What is each article about?',
        where: 'Found it about 1 scroll down,',
        a: 'under In this issue: each article with its author, its reading time and a short summary.',
        stop: 950,
      },
      {
        q: 'How long has this been going?',
        where: 'Found it about 2 scrolls down,',
        a: 'in one line under the articles: the year it began, and how many essays and issues since.',
        stop: 2250,
      },
      {
        q: 'Can I read past essays?',
        where: 'Found it about 3 scrolls down,',
        a: 'under Recent Dispatches: essays from earlier issues, with a row of topics to pick from.',
        stop: 2830,
      },
    ],
  },
};

export const SMALL_BUSINESS: LeanSector = {
  path: 'small-business',
  sector: 'small-business',
  title: 'Small business web design',
  description:
    'Small business websites built around the first call: what you do, what it costs and an easy way to ask. Real case studies, and honest advice on which tier fits.',
  label: 'Small businesses',
  linkText: 'How I build for small businesses',
  heading: `Small business websites built around <b>the first call.</b>`,
  lede: 'Someone told them to call you, or they found you on a phone. Either way, they want to see what you do, what it might cost and how to ask, and you want that first call to start further along than the same 5 questions.',
  points: [
    {
      title: 'Answer what you keep getting asked',
      body: 'What you do, how pricing works and where you work, so the first conversation can start from the job itself.',
    },
    {
      title: 'Make asking easy',
      body: 'A number to tap and a form that asks enough, built for a phone first. I can set up a count of the calls and forms, so you can see them.',
    },
    {
      title: 'Stay yours to change',
      body: 'Change a price, a page or a photo yourself, without waiting on me.',
    },
  ],
  proofNote: [
    'These 2 are an interior designer and a home embroidery studio. I have not shown you every trade here, and yours may not be on the list. The job may still be the same: getting a stranger ready to ask you for something.',
  ],
  tierNotes: [
    'If you need a few pages and enjoy doing it yourself, a site builder is probably enough, and I will tell you so.',
    'One way to weigh the cost: divide the first-year cost by what a typical job brings in. That is how many jobs would cover it. I cannot promise you those jobs, so only you can judge whether that number looks reachable.',
  ],
  ask: {
    slug: 'reid-design',
    who: 'a new customer',
    questions: [
      {
        q: 'Do you work near me?',
        where: 'Found it on the first screen,',
        a: 'in the line over the headline: the town, and the area the business serves.',
        stop: 300,
      },
      {
        q: 'Who would I be working with?',
        where: 'Found it about 1 scroll down,',
        a: 'in the owner’s own introduction: her photo, her name and why she started.',
        stop: 1000,
      },
      {
        q: 'What do other customers say?',
        where: 'Found it about 2 scrolls down,',
        a: 'under What clients say: the Google rating, then reviews with names.',
        stop: 2150,
      },
      {
        q: 'What will it cost?',
        where: 'Found it on the first screen,',
        a: 'on a See services and prices button, over a line saying you see the price before anything is ordered.',
        stop: 420,
      },
    ],
  },
};

export const SECTOR_PAGES: SectorPage[] = [CHURCHES, SCHOOLS, NONPROFITS, SMALL_BUSINESS];

/* "If this sounds like you": the table on /services/ and the tier section of each
   lean page. Situations, checked against what each tier in pricing.ts includes:
   Launch is one person and the essentials, Signature is a team and several kinds
   of content, Flagship is custom tools, workflows, integrations and reporting.
   Sector and situation only: no client is tied to a tier or a price. */
export interface Situation {
  sector: SectorKey;
  /** The row's name. */
  label: string;
  launch: string;
  signature: string;
  flagship: string;
}

export const SITUATIONS: Situation[] = [
  {
    sector: 'church',
    label: 'A church',
    launch:
      'A small staff and one part-time administrator, with everything a first-time visitor needs done right.',
    signature:
      'Several ministries, and a staff or volunteer team who post the news and events themselves.',
    flagship:
      'Many editors, plus custom tools, links to the church database or other systems you use, or reports for an elder board.',
  },
  {
    sector: 'school',
    label: 'A school',
    launch: 'A preschool or small school with one office person, and clear inquiry pages.',
    signature:
      'An admissions lead and office staff running several kinds of content, with inquiries tracked.',
    flagship:
      'Several campuses or age groups and many editors, with links into the systems you already use.',
  },
  {
    sector: 'nonprofit',
    label: 'A nonprofit',
    launch: 'One busy person keeps the mission, the programs and the ways to help current.',
    signature:
      'A staff or volunteer team runs events and sign-ups, and wants gifts and registrations tracked.',
    flagship: 'A library, a custom tool or a staff workflow the site has to run, or board reports.',
  },
  {
    sector: 'small-business',
    label: 'A small business',
    launch: 'A few clear pages and an easy way to call, and you update them yourself.',
    signature:
      'More services and deeper pages, a small team keeping them current, and the calls tracked.',
    flagship: 'A custom tool does part of the selling, or the site ties into how you run the work.',
  },
];

export function sectorPagePath(sector: string): string | undefined {
  const page = SECTOR_PAGES.find((p) => p.sector === sector);
  return page ? `/${page.path}/` : undefined;
}

export function sectorPage(sector: string): SectorPage | undefined {
  return SECTOR_PAGES.find((p) => p.sector === sector);
}
