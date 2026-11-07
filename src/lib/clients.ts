/* ============================================================================
   Clients | The deck
   ============================================================================
   One list of the selected case studies, read from the case study frontmatter:
   name, sector, hook, colors and live address all live in the MDX, so a window,
   a sheet, a quote band and the closing deck can never disagree. Only the deal
   order is kept here, because the deck runs in its own order, not the study
   loop's `order` field. A study missing from DECK goes to the end, and a slug
   here with no study is simply skipped.

   Footage and captures sit in public/assets/ under the study's slug.
   ============================================================================ */

import { getCollection, type CollectionEntry } from 'astro:content';
import { nightMark } from './night-mark';

/** The order the deck is dealt in: home, /work and the closing. */
export const DECK = [
  'stone-steps-50k',
  'mas-monograms',
  'presbyterian-academy',
  'theology-matters',
  'first-baptist-muncie',
  'reid-design',
  'foundation-for-reformed-theology',
  'first-presbyterian-orangeburg',
];

export const SECTOR_LABEL: Record<string, string> = {
  church: 'Church',
  school: 'School',
  nonprofit: 'Nonprofit',
  'small-business': 'Small business',
};

export interface Client {
  slug: string;
  name: string;
  /** The label: Nonprofit, Small business and so on. */
  sector: string;
  /** The key: nonprofit, small-business and so on. */
  sectorKey: string;
  hook: string;
  /** The one-line honest outcome from the study's frontmatter. */
  outcome: string;
  /** The client's own color. Carries surfaces and the on-color text pair. */
  accent: string;
  /** The color of the client's marks on the dark side of this site. See night-mark.ts. */
  night: string;
  /** The client's paper, the text on their color. */
  paper: string;
  host: string;
  live: string;
  study: string;
  clip: string;
  still: string;
  desk: string;
  deskStill: string;
  cms: string;
}

export const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, '');

export function toClient(entry: CollectionEntry<'case-studies'>): Client {
  const d = entry.data;
  const slug = entry.id;
  const live = d.liveUrl ?? '';
  return {
    slug,
    name: d.client,
    sector: SECTOR_LABEL[d.sector] ?? d.sector,
    sectorKey: d.sector,
    hook: d.hook ?? '',
    outcome: d.outcome ?? '',
    accent: d.palette?.accent ?? '#121211',
    night: nightMark(d.palette?.accent ?? '#121211', d.palette?.markDark),
    paper: d.palette?.paper ?? '#ffffff',
    host: d.facts?.host ?? (live ? hostOf(live) : ''),
    live,
    study: `/work/${slug}/`,
    clip: `/assets/${slug}-m.mp4`,
    still: `/assets/${slug}-m.webp`,
    desk: `/assets/${slug}.mp4`,
    deskStill: `/assets/${slug}-cover.webp`,
    cms: d.cmsShot ? `/assets/${slug}-cms.webp` : '',
  };
}

/** Every client, in deal order. */
export async function getClients(): Promise<Client[]> {
  const entries = await getCollection('case-studies');
  const at = (id: string) => {
    const i = DECK.indexOf(id);
    return i === -1 ? DECK.length : i;
  };
  return entries
    .slice()
    .sort((a, b) => at(a.id) - at(b.id))
    .map(toClient);
}

export async function getClient(slug: string): Promise<Client> {
  const client = (await getClients()).find((c) => c.slug === slug);
  if (!client) throw new Error(`No case study called ${slug}`);
  return client;
}

/** Sector names for the ledger. Names, not counts: the case studies are a selection, not the whole list. */
const PLURAL: Record<string, string> = {
  Nonprofit: 'Nonprofits',
  Church: 'Churches',
  School: 'Schools',
  'Small business': 'Small businesses',
};

/** "Nonprofits", most-shown sector first, read from the client list. */
export function sectorNames(clients: Client[]): string[] {
  const counts = new Map<string, number>();
  for (const c of clients) counts.set(c.sector, (counts.get(c.sector) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => PLURAL[k] ?? k);
}

/** The big line on the homepage spells the real count. */
const WORDS = [
  'Zero',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
];
export const countWord = (n: number) => WORDS[n] ?? String(n);
