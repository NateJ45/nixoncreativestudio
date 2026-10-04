/* ============================================================================
   photos | The Photography page's pictures, read from the CMS `photos` collection
   ============================================================================
   Foundation, edit with care.

   /photography reads its pictures through here (CMS-DESIGN PR 11), replacing the
   old Astro `photos` content collection. One entry per photo, edited in the
   EmDash admin under Photography, Photos (schema in cms/schema/photos.mjs).

   THERE IS NO COMMITTED FALLBACK, ON PURPOSE. Production has no photos today and
   the page's honest "In progress" state is what it shows; an empty collection,
   a read error and a CMS that does not have the table yet all read as "no
   photos", so the page renders that state and never breaks (getOrdered returns []
   when there is no JSON to fall back to).

   A photo is dropped, not rendered half-way, when it cannot be shown properly:
     - no picture, or a picture with no stored width and height (the justified
       gallery needs the proportions to lay a row out);
     - a blank description for screen readers (the `alt` field), because a photo
       must never ship without alt text;
     - an unknown category.

   IMAGES. A photo is served as resized WebP through the site's /_image resizer
   with WIDTH-ONLY URLs (/_image?href=<absolute media URL>&w=N&f=webp), the shape
   EmDashPhoto and ScrollShot use. A request that carries a height of 4096 px or
   more silently gets the untouched original back (docs/EMDASH.md, "The 4096px
   resizer limit"), and a tall photo's height can reach that, so no height is ever
   sent. The page builds the absolute URL from its own origin; the host must be in
   `image.remotePatterns` (astro.config.mjs), as it is for the About photos.
   ============================================================================ */

import type { ImageValue } from 'emdash';
import { getOrdered, bool, image, int, text, type CmsEntry, type Raw } from './cms.ts';
import { PHOTO_CATEGORIES, type PhotoCategory } from './indexPages.ts';
import type { RouteCache } from './routeCache.ts';

export interface Photo {
  /** The entry slug. */
  id: string;
  title: string;
  image: ImageValue;
  /** Stored picture proportions, used to lay the gallery out. */
  width: number;
  height: number;
  /** Description for screen readers (never blank on a kept photo). */
  alt: string;
  category: PhotoCategory;
  caption?: string;
  location?: string;
  year: number;
  featured: boolean;
  sortOrder?: number;
}

/** The stored media shape, read defensively (an ImageValue's fields can be absent). */
type MediaLike = {
  id?: string;
  width?: number;
  height?: number;
  meta?: { storageKey?: string };
};

/**
 * One raw `photos` entry as a Photo, or undefined when it cannot be shown (see the
 * header). Never throws: one unusable entry must not take the list down with it.
 */
export function normalizePhoto(raw: Raw, slug: string): Photo | undefined {
  const picture = image(raw.image);
  const media = (picture ?? {}) as unknown as MediaLike;
  const alt = text(raw.alt)?.trim();
  const title = text(raw.title)?.trim();
  const category = PHOTO_CATEGORIES.find((c) => c === raw.category);
  const width = media.width;
  const height = media.height;
  if (!picture || !alt || !title || !category) return undefined;
  if (!width || !height || width <= 0 || height <= 0) return undefined;
  return {
    id: slug,
    title,
    image: picture,
    width,
    height,
    alt,
    category,
    caption: text(raw.caption)?.trim(),
    location: text(raw.location)?.trim(),
    year: int(raw.year) ?? 0,
    featured: bool(raw.featured),
    sortOrder: int(raw.sort_order),
  };
}

/**
 * Order inside a group: Order number first (smallest first, unnumbered after the
 * numbered ones), then newest year first, then slug so the order is stable.
 */
export function comparePhotos(a: Photo, b: Photo): number {
  const ao = a.sortOrder ?? Number.POSITIVE_INFINITY;
  const bo = b.sortOrder ?? Number.POSITIVE_INFINITY;
  if (ao !== bo) return ao < bo ? -1 : 1;
  if (a.year !== b.year) return b.year - a.year;
  return a.id.localeCompare(b.id);
}

/** What the reader needs from the caller: `Astro` in a page. */
export interface PhotosContext {
  /** Route cache; the read adds its tag so publishing a photo purges the page. */
  cache?: RouteCache;
}

/** Every usable published photo, in gallery order. [] when there are none. */
export async function getPhotos(
  ctx: PhotosContext = {},
  opts: Pick<NonNullable<Parameters<typeof getOrdered>[2]>, 'deps'> = {},
): Promise<Photo[]> {
  const entries: CmsEntry<Photo | undefined>[] = await getOrdered('photos', normalizePhoto, {
    cache: ctx.cache,
    ...opts,
  });
  return entries.flatMap((e) => (e.data ? [e.data] : [])).sort(comparePhotos);
}

/* ----------------------------------------------------------------------------
   Grouping for the page
   ---------------------------------------------------------------------------- */

export interface PhotoGroup {
  id: PhotoCategory;
  photos: Photo[];
  /** The group's lead photo (its card thumbnail). */
  cover: Photo;
}

/** The non-empty groups in display order. Empty groups are not returned. */
export function groupPhotos(photos: Photo[]): PhotoGroup[] {
  const groups: PhotoGroup[] = [];
  for (const id of PHOTO_CATEGORIES) {
    const inGroup = photos.filter((p) => p.category === id).sort(comparePhotos);
    if (inGroup.length > 0) groups.push({ id, photos: inGroup, cover: inGroup[0] });
  }
  return groups;
}

/** The opening picture: the first Featured photo, else the first photo, else nothing. */
export function heroPhoto(photos: Photo[]): Photo | undefined {
  const ordered = photos.slice().sort(comparePhotos);
  return ordered.find((p) => p.featured) ?? ordered[0];
}

/* ----------------------------------------------------------------------------
   Gallery URLs (width-only resizer requests)
   ---------------------------------------------------------------------------- */

/** One entry of a srcset / the lightbox's alternative sizes. */
export interface GallerySource {
  src: string;
  width: number;
  height: number;
}

/** The shape PhotoGallery.tsx takes (a react-photo-album Photo plus our extras). */
export interface GalleryItem extends GallerySource {
  srcSet: GallerySource[];
  alt: string;
  /** The photo's title (slide data for the viewer; it has no Captions plugin today, so it is carried but not drawn). */
  title: string;
  caption: string;
  /** Larger source for the full-screen viewer. */
  lightboxSrc: string;
  /** The viewer's alternatives: the grid sizes plus the large one when it is bigger. */
  viewerSrcSet: GallerySource[];
}

/** Widths offered to the justified grid, smallest first. */
export const GRID_WIDTHS = [480, 800, 1200, 1600] as const;
/** The viewer asks for this width at most (or the original, if smaller). */
export const LIGHTBOX_WIDTH = 2048;

/** The storage key (or id) of the stored media file, which names its public URL. */
function mediaFile(img: ImageValue): string | undefined {
  const m = img as unknown as MediaLike;
  return m.meta?.storageKey ?? m.id;
}

/** The absolute URL of the stored original, on this site's own origin. */
export function mediaUrl(img: ImageValue, origin: string): string | undefined {
  const file = mediaFile(img);
  return file ? new URL(`/_emdash/api/media/file/${file}`, origin).href : undefined;
}

/** A WIDTH-ONLY resizer URL. Never add a height: 4096 px and up returns the original. */
export function resizedUrl(absoluteMediaUrl: string, width: number): string {
  return `/_image?href=${encodeURIComponent(absoluteMediaUrl)}&w=${width}&f=webp`;
}

/** The widths worth offering for a picture: those under its own width, plus its own width. */
function offeredWidths(originalWidth: number, candidates: readonly number[]): number[] {
  const under = candidates.filter((w) => w < originalWidth);
  return [...under, Math.min(originalWidth, candidates[candidates.length - 1])];
}

/**
 * One photo as a gallery item. Returns undefined when the stored file has no URL.
 * Heights are the real proportions scaled to each width (they only inform layout:
 * the request itself carries a width and nothing else).
 */
export function galleryItem(photo: Photo, origin: string): GalleryItem | undefined {
  const url = mediaUrl(photo.image, origin);
  if (!url) return undefined;
  const ratio = photo.height / photo.width;
  const at = (w: number): GallerySource => ({
    src: resizedUrl(url, w),
    width: w,
    height: Math.round(w * ratio),
  });
  const grid = offeredWidths(photo.width, GRID_WIDTHS).map(at);
  const largest = grid[grid.length - 1];
  const lightbox = at(Math.min(photo.width, LIGHTBOX_WIDTH));
  return {
    // The grid's own width and height are the photo's real proportions, so rows lay out right.
    src: largest.src,
    width: photo.width,
    height: photo.height,
    srcSet: grid,
    alt: photo.alt,
    title: photo.title,
    // Slide caption data; falls back to the title as before.
    caption: photo.caption ?? photo.title,
    lightboxSrc: lightbox.src,
    viewerSrcSet: lightbox.width > largest.width ? [...grid, lightbox] : grid,
  };
}

/** A group's photos as gallery items (photos with no usable URL are skipped). */
export function galleryItems(group: PhotoGroup, origin: string): GalleryItem[] {
  return group.photos.flatMap((p) => {
    const item = galleryItem(p, origin);
    return item ? [item] : [];
  });
}

/* ----------------------------------------------------------------------------
   Search visibility
   ---------------------------------------------------------------------------- */

/**
 * The robots directive for /photography. While the gallery is empty the page is a
 * service page with no portfolio behind it, a thin result for the "Cincinnati
 * photographer" query, so it asks search engines to leave it out (`follow` keeps its
 * links counted). The first published photo flips it back to indexable with no
 * deploy: the page reads the photos on every render and publishing purges the cache.
 * Returns undefined (no robots tag at all) once there is something to show.
 */
export function photographyRobots(photoCount: number): string | undefined {
  return photoCount > 0 ? undefined : 'noindex, follow';
}
