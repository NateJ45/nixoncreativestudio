// Safe to edit.
/* ============================================================================
   Site navigation: the one list the header, mobile menu and footer read
   ============================================================================
   Before overhaul package 1.8 the header and the footer each kept their own
   copy of this list, with the Journal check written out twice. Now it lives
   here, and each piece of chrome asks for the list it shows:

     getNav()         Work, Services, About, then the gated pages. The desktop
                      header and the mobile menu (MobileNav) show this. Contact
                      is not in it: the "Start a project" button covers it.
     getFooterNav()   the same list plus Contact, for the footer's Studio
                      column (also the no-JS target of the mobile menu button).

   Every href ends in a slash: the site builds with trailingSlash 'always',
   and a slashless internal link is a redirect hop (npm run check:slashes).

   Two pages are gated at build time, so a link never points at an empty page:

     Journal       only when at least one entry is published. Same filter as
                   the journal index: drafts are hidden in production builds
                   and shown in `npm run dev`.
     Photography   only when the photos collection holds MIN_PHOTOS or more
                   real photographs. Today it holds none, so the link is off
                   (the page still builds at /photography/). Add photos (the
                   checklist is at the top of src/pages/photography.astro) and
                   the link appears on the next build.

   To rename, reorder or add a page, edit BASE below; the header, the mobile
   menu and the footer all follow.
   ============================================================================ */

import { getCollection } from 'astro:content';

export interface NavLink {
  label: string;
  /** Root-relative, always with a trailing slash. */
  href: string;
}

/** Photography joins the nav once the gallery has this many real photos. */
export const MIN_PHOTOS = 6;

const BASE: NavLink[] = [
  { label: 'Work', href: '/work/' },
  { label: 'Services', href: '/services/' },
  { label: 'About', href: '/about/' },
];

const JOURNAL: NavLink = { label: 'Journal', href: '/journal/' };
const PHOTOGRAPHY: NavLink = { label: 'Photography', href: '/photography/' };
const CONTACT: NavLink = { label: 'Contact', href: '/contact/' };

/** Published journal entries (drafts count in dev only, as on /journal/). */
async function journalCount(): Promise<number> {
  const entries = await getCollection('journal', ({ data }) =>
    import.meta.env.PROD ? data.draft !== true : true,
  );
  return entries.length;
}

async function photoCount(): Promise<number> {
  return (await getCollection('photos')).length;
}

/** The primary nav: header (desktop) and the mobile menu. */
export async function getNav(): Promise<NavLink[]> {
  const [journal, photos] = await Promise.all([journalCount(), photoCount()]);
  return [
    ...BASE,
    ...(photos >= MIN_PHOTOS ? [PHOTOGRAPHY] : []),
    ...(journal > 0 ? [JOURNAL] : []),
  ];
}

/** The footer's Studio column: the primary nav plus Contact. */
export async function getFooterNav(): Promise<NavLink[]> {
  return [...(await getNav()), CONTACT];
}
