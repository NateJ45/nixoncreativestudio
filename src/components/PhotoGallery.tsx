/* ============================================================================
   PhotoGallery
   ============================================================================
   Foundation, edit with care.

   React island that composes react-photo-album (justified grid layout)
   with yet-another-react-lightbox (fullscreen viewer + zoom + thumbnails).

   Drop in anywhere on a page to render a clickable photo grid:

     <PhotoGallery client:load photos={photos} />

   where `photos` is an array of objects each with at minimum:
     { src: string, width: number, height: number, alt?: string }

   Optional `caption` is shown in the lightbox's lower bar.

   The component holds the lightbox open/close state internally. The
   parent just hands it photos and forgets about it.
   ============================================================================ */

import { useState } from 'react';

import {
  RowsPhotoAlbum,
  type Photo,
  type RenderImageContext,
  type RenderImageProps,
} from 'react-photo-album';
import 'react-photo-album/rows.css';

import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';

// Local extension of the react-photo-album Photo type to carry an
// optional caption. react-photo-album passes the original Photo to its
// click handler, so we pass the array through and let the lightbox read
// the same shape. `title` is optional: callers usually only set `alt`
// (the photo's name) and `caption`; the lightbox below falls back to
// `alt` for its title so a real label always shows.
export interface GalleryPhoto extends Photo {
  alt?:     string;
  title?:   string;
  caption?: string;
}

export interface PhotoGalleryProps {
  photos:           GalleryPhoto[];
  /** Target row height in pixels for react-photo-album's rows layout.
      Lower = denser grid, higher = bigger photos. Defaults to 300. */
  targetRowHeight?: number;
}

// Custom grid-image renderer: each photo starts transparent and fades in
// once the browser has decoded it (onLoad), so slow connections get a soft
// reveal instead of a cold pop. Already-cached images that fire load before
// React attaches the handler are caught by checking `complete` on mount via
// the ref callback. Reduced-motion users get an instant show (the CSS
// transition is disabled globally in globals.css under the reduce query).
function renderFadeImage(
  { alt = '', title, sizes }: RenderImageProps,
  { photo, width, height }: RenderImageContext<GalleryPhoto>,
) {
  return (
    <img
      src={photo.src}
      alt={alt}
      title={title}
      sizes={sizes}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      style={{
        display: 'block',
        width: '100%',
        height: 'auto',
        opacity: 0,
        transition: 'opacity 400ms ease',
      }}
      ref={(node) => {
        if (node?.complete) node.style.opacity = '1';
      }}
      onLoad={(e) => {
        e.currentTarget.style.opacity = '1';
      }}
    />
  );
}

export default function PhotoGallery({
  photos,
  targetRowHeight = 300,
}: PhotoGalleryProps) {

  // Lightbox index. -1 means closed. Setting >= 0 opens at that slide.
  const [index, setIndex] = useState<number>(-1);

  return (
    <>
      <RowsPhotoAlbum
        photos={photos}
        onClick={({ index }) => setIndex(index)}
        targetRowHeight={targetRowHeight}
        spacing={12}
        render={{ image: renderFadeImage }}
      />

      <Lightbox
        slides={photos.map((p) => ({
          src:         p.src,
          width:       p.width,
          height:      p.height,
          alt:         p.alt,
          // Fall back to the photo's alt (its name) when no explicit title is
          // set, so the lightbox always shows a real label above the caption.
          title:       p.title ?? p.alt,
          description: p.caption,
        }))}
        open={index >= 0}
        index={index >= 0 ? index : 0}
        close={() => setIndex(-1)}
        plugins={[Zoom, Thumbnails]}
        controller={{ closeOnBackdropClick: true }}
      />
    </>
  );
}
