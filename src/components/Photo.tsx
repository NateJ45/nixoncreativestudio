/* ============================================================================
   Photo
   ============================================================================
   Foundation, edit with care.

   React island for individual images. Receives a build-resolved src URL
   (typically from an Astro `import` of a JPG asset) and renders an <img>
   with sensible defaults: lazy loading by default, async decoding, and a
   smooth fade-in once the bytes arrive. An optional placeholder data URL
   (plaiceholder-style base64) fills the box during load so the layout
   doesn't pop in cold.

   Hydration gotcha: an island's <img> often finishes loading BEFORE
   React hydrates this component, so a naive onLoad handler misses the
   event and the image stays at opacity 0 forever. The useEffect below
   checks imgRef.current.complete on mount to catch that case and flip
   `loaded` to true immediately when the image is already cached.

   Props:
     src         build-resolved image URL
     alt         accessibility text
     width       intrinsic image width
     height      intrinsic image height
     className   optional Tailwind classes for the outer wrapper
     priority    boolean; when true, loading="eager" and the image
                 bypasses lazy-load and starts fully opaque. Use for
                 above-the-fold LCP images.
     placeholder optional base64 data URL (from plaiceholder etc.) painted
                 behind the image until the bytes arrive
   ============================================================================ */

import { useState, useEffect, useRef, type CSSProperties } from 'react';

export interface PhotoProps {
  src:          string;
  alt:          string;
  width:        number;
  height:       number;
  className?:   string;
  priority?:    boolean;
  placeholder?: string;
}

export default function Photo({
  src,
  alt,
  width,
  height,
  className,
  priority,
  placeholder,
}: PhotoProps) {

  const imgRef = useRef<HTMLImageElement>(null);

  // Track load state so the img fades in instead of popping. Priority
  // images skip the fade and render fully opaque from the start.
  const [loaded, setLoaded] = useState<boolean>(Boolean(priority));

  // Catch the case where the browser already finished loading the image
  // before React hydrated this island. Without this, the onLoad event
  // fires too early to be observed and the img stays invisible.
  useEffect(() => {
    if (imgRef.current?.complete) {
      setLoaded(true);
    }
  }, []);

  // Wrapper styles. The aspect-ratio keeps the box at the right shape
  // before the image arrives, so there's no layout shift on load.
  const wrapperStyle: CSSProperties = {
    position:        'relative',
    aspectRatio:     `${width} / ${height}`,
    overflow:        'hidden',
    backgroundColor: placeholder ? undefined : 'var(--color-bg-soft)',
    backgroundImage: placeholder ? `url(${placeholder})` : undefined,
    backgroundSize:     'cover',
    backgroundPosition: 'center',
  };

  // Img styles. Fade in on load.
  const imgStyle: CSSProperties = {
    width:      '100%',
    height:     '100%',
    objectFit:  'cover',
    display:    'block',
    opacity:    loaded ? 1 : 0,
    transition: 'opacity 300ms ease',
  };

  return (
    <div className={className} style={wrapperStyle}>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        style={imgStyle}
      />
    </div>
  );
}
