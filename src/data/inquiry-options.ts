// The contact form's choices, in one place for the two things that read them:
// src/pages/contact.astro (what a visitor picks) and the inquiry email
// (src/lib/inquiry-email.ts, what Nathan reads). One list, so the email always
// shows the same words the visitor chose, and the stored `value`s never drift
// from the labels.
//
// Pure on purpose: no astro:content, so the Worker (src/worker.ts) can bundle it.
// The `value`s are what the form submits; keep them fixed even when labels change.

import { webTiers } from './pricing.ts';
import { money } from '../lib/money.ts';

export interface Option {
  value: string;
  label: string;
}

/** Case-study sectors. Also the org-type keys, so ?org_type from a study lines up. */
export const SECTOR_LABEL: Record<string, string> = {
  church: 'Church',
  school: 'School',
  nonprofit: 'Nonprofit',
  'small-business': 'Small business',
};

export const orgTypes: Option[] = [
  ...Object.entries(SECTOR_LABEL).map(([value, label]) => ({ value, label })),
  { value: 'other', label: 'Something else' },
];

/** The "who keeps it up to date" step, in plain words. */
export const runs: Option[] = [
  { value: 'one-person', label: 'Just me, or one person, when there is time' },
  { value: 'team', label: 'A few staff or volunteers' },
  { value: 'tools', label: 'A team that needs extra tools, like bookings or sign-ups' },
  { value: 'you', label: "I'd rather you kept it updated" },
  { value: 'not-sure', label: 'Not sure yet' },
];

// Budget ranges, built from the three web tier floors in src/data/pricing.ts, so a
// price change there moves them too. They never overlap: each ends a dollar below
// the next floor.
const floors = webTiers.map((t) => t.priceFrom);
const [launchFloor, signatureFloor, flagshipFloor] = floors.map(money);
const below = (n: number) => money(n - 1);

export const budgets: Option[] = [
  { value: 'under-4k', label: `Under ${launchFloor}` },
  { value: '4k-7k', label: `${launchFloor} to ${below(floors[1])}` },
  { value: '7k-12k', label: `${signatureFloor} to ${below(floors[2])}` },
  { value: '12k-plus', label: `${flagshipFloor} or more` },
  { value: 'not-sure', label: 'Not sure yet' },
];

export const timelines: Option[] = [
  { value: 'asap', label: 'Right away' },
  { value: '1-3-months', label: 'In the next 1 to 3 months' },
  { value: '3-6-months', label: '3 to 6 months from now' },
  { value: '6-plus', label: 'More than 6 months out' },
  { value: 'flexible', label: 'Flexible, no fixed deadline' },
];

export const heardFromOptions: Option[] = [
  { value: 'referral', label: 'A referral from someone I know' },
  { value: 'search', label: 'Google or another search engine' },
  // Added 2026-11-10 to measure AI search (GEO/AEO): ChatGPT, Claude, Perplexity and the like.
  { value: 'ai', label: 'ChatGPT, Claude or another AI assistant' },
  { value: 'social', label: 'Instagram, LinkedIn, or other social' },
  { value: 'past-client', label: "I've worked with Nathan before" },
  { value: 'event', label: 'In person, at an event or through a church or school' },
  { value: 'other', label: 'Somewhere else' },
];

const LISTS: Record<string, Option[]> = {
  org_type: orgTypes,
  origin_org_type: orgTypes,
  runs,
  budget: budgets,
  timeline: timelines,
  heard_from: heardFromOptions,
};

/** The label a visitor saw for a submitted value, or the value itself for free-text fields. */
export function labelFor(field: string, value: string): string {
  return LISTS[field]?.find((o) => o.value === value)?.label ?? value;
}
