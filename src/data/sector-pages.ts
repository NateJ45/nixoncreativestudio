/* ============================================================================
   Sector pages
   ============================================================================
   Which sectors have their own page, and that page's title and description. One
   so far: /churches/ (src/pages/churches.astro). A study's sector line and the
   JSON-LD trail ask sectorPagePath() where to link. A new sector page gets its
   own .astro file, an entry here, and a line in tests/routes.ts.
   ============================================================================ */

export interface SectorPage {
  /** The URL segment, plural: /churches/. */
  path: string;
  /** The case-study `sector` value this page collects. */
  sector: 'church' | 'school' | 'nonprofit' | 'small-business';
  /** The <title>, before " | Nixon Creative Studio". Keep the whole title under 60 characters. */
  title: string;
  /** Meta description, 110 to 160 characters. `{n}` becomes the study count. */
  description: string;
  /** The breadcrumb name. */
  label: string;
}

export const CHURCHES: SectorPage = {
  path: 'churches',
  sector: 'church',
  title: 'Church websites',
  description:
    'Church websites I designed and built: a clear first Sunday for visitors, and pages the staff keep current. Read the case studies and visit the live sites.',
  label: 'Churches',
};

export const SECTOR_PAGES: SectorPage[] = [CHURCHES];

export function sectorPagePath(sector: string): string | undefined {
  const page = SECTOR_PAGES.find((p) => p.sector === sector);
  return page ? `/${page.path}/` : undefined;
}
