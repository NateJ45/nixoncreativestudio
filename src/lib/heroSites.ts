/* ============================================================================
   heroSites (which sites the homepage hero scene shows)
   ============================================================================
   Foundation, edit with care.

   CMS-DESIGN PR 13. The hero's device scene (HeroShowcase.astro) used to be a
   hardcoded array of five client sites. It is now built from the case studies:
   every published case study with `in_hero` ticked AND both showcase captures
   (desktop and mobile) set joins the scene, ordered by `hero_order`, lowest
   first. The address bar shows the host of the case study's live URL.

   WHEN NOTHING QUALIFIES, the scene keeps the hardcoded five (bundled captures,
   the array in HeroShowcase.astro). That is the state of production until the
   PR 13 data is loaded (the two fields do not exist there yet), and it is also
   the safety net if an editor un-ticks every site or a read fails.

   This module is pure (type-only imports), so the unit tests run it under plain
   Node (src/lib/heroSites.test.ts). Reading the case studies stays in Hero.astro.

   Tall captures and the 4096 px resizer limit (docs/EMDASH.md): the full-page
   screenshots are 4000 to 10000 px tall, and Cloudflare's resizer returns the
   untouched original for any request 4096 px or taller. So the URLs built here
   are WIDTH-ONLY /_image requests, exactly what ScrollShot.astro builds.
   ============================================================================ */
import type { ImageValue } from 'emdash';

/** The fields of a case study this module reads (a structural subset of CaseStudy). */
export interface HeroCandidate {
  id: string;
  published: Date;
  liveUrl?: string;
  inHero: boolean;
  heroOrder?: number;
  showcaseDesktop?: ImageValue;
  showcaseMobile?: ImageValue;
}

/** One site in the scene: the host for the address bar and the two captures. */
export interface HeroStudy {
  /** Case study slug. */
  id: string;
  /** Address-bar text, the live URL's host without "www.". */
  host: string;
  desktop: ImageValue;
  mobile: ImageValue;
}

/** "https://www.example.org/path" -> "example.org". Undefined when it is not a URL. */
export function hostOf(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return host || undefined;
  } catch {
    return undefined;
  }
}

/**
 * The scene's sites, in order. Only an entry with in_hero, both captures and a
 * usable live URL qualifies. Ordered by hero_order ascending (an entry with no
 * number goes after the numbered ones), ties broken newest project first, then by
 * slug so the order is always the same.
 */
export function selectHeroStudies(studies: HeroCandidate[]): HeroStudy[] {
  return studies
    .filter((s) => s.inHero && s.showcaseDesktop && s.showcaseMobile && hostOf(s.liveUrl))
    .sort(
      (a, b) =>
        (a.heroOrder ?? Number.MAX_SAFE_INTEGER) - (b.heroOrder ?? Number.MAX_SAFE_INTEGER) ||
        b.published.valueOf() - a.published.valueOf() ||
        a.id.localeCompare(b.id),
    )
    .map((s) => ({
      id: s.id,
      host: hostOf(s.liveUrl) as string,
      desktop: s.showcaseDesktop as ImageValue,
      mobile: s.showcaseMobile as ImageValue,
    }));
}

/** The loose shape of an image value that this module reads. */
type Media = { id?: string; width?: number; height?: number; meta?: { storageKey?: string } };

/** Absolute URL of the original file on this site's own origin ('' when the image has no file). */
export function mediaUrl(image: ImageValue, origin: string): string {
  const m = image as unknown as Media;
  const file = m.meta?.storageKey ?? m.id;
  return file ? new URL(`/_emdash/api/media/file/${file}`, origin).href : '';
}

/** A width-only resizer URL (never a height: see the 4096 px note above). */
export function resizedUrl(absoluteMediaUrl: string, width: number): string {
  return `/_image?href=${encodeURIComponent(absoluteMediaUrl)}&w=${width}&f=webp`;
}

/** What an image element needs for one capture: srcset, a fallback src and the intrinsic size. */
export interface ResizedImage {
  src: string;
  srcset: string;
  width?: number;
  height?: number;
}

/**
 * Resized-image attributes for a CMS capture. `widths` are the srcset entries; `src` is the
 * widest one (the same "largest candidate" the bundled path uses as its plain src), and
 * width/height are the capture's own intrinsic size, which only fixes the aspect ratio.
 */
export function resizedImage(
  image: ImageValue,
  origin: string,
  widths: number[],
): ResizedImage | undefined {
  const url = mediaUrl(image, origin);
  if (!url || widths.length === 0) return undefined;
  const sorted = [...widths].sort((a, b) => a - b);
  const m = image as unknown as Media;
  return {
    src: resizedUrl(url, sorted[sorted.length - 1]),
    srcset: sorted.map((w) => `${resizedUrl(url, w)} ${w}w`).join(', '),
    width: m.width,
    height: m.height,
  };
}
