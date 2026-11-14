/* ============================================================================
   Where the selected clients are | About's map
   ============================================================================
   One card per state, in the order the map walks them, each with the case
   studies based there (slugs from src/lib/clients.ts DECK). State level only:
   never a street or a town that would point at a person. `fips` matches the
   state codes in src/data/us-dots.json, which only draws outlines for the
   states listed in scripts/tools/us-dots.mjs (OUTLINED); add a state there and
   regenerate before adding it here. ClientMap.astro throws on an unknown slug.

   Ohio is the studio's home state, so its pin is Cincinnati itself.
   ============================================================================ */

export interface Place {
  /** The state's name, as the list prints it. */
  state: string;
  /** The postal code, printed in the card's corners. */
  abbr: string;
  /** The state's FIPS code, as in us-dots.json. */
  fips: number;
  /** True for the state the studio is in: its pin is the Cincinnati hub. */
  home?: boolean;
  /** Case study slugs, in the order the row lists them. */
  clients: string[];
}

export const PLACES: Place[] = [
  {
    state: 'Ohio',
    abbr: 'OH',
    fips: 39,
    home: true,
    clients: ['stone-steps-50k', 'presbyterian-academy'],
  },
  { state: 'Indiana', abbr: 'IN', fips: 18, clients: ['first-baptist-muncie', 'reid-design'] },
  { state: 'North Carolina', abbr: 'NC', fips: 37, clients: ['foundation-for-reformed-theology'] },
  {
    state: 'South Carolina',
    abbr: 'SC',
    fips: 45,
    clients: ['theology-matters', 'first-presbyterian-orangeburg', 'mas-monograms'],
  },
];
