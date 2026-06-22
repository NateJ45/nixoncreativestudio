/* ============================================================================
   TestimonialCarousel
   ============================================================================
   Foundation, edit with care.

   An accessible client-testimonials carousel built on Embla. Data comes from
   the case-studies collection (the `testimonial` frontmatter field) via the
   Testimonials.astro wrapper, so quotes stay tied to the client they came from
   and nothing is ever fabricated here.

   Accessibility (the bar the studio holds, AA in both themes):
     - role=group + aria-roledescription="carousel", labelled.
     - Off-screen slides are `inert` so they leave the tab order and the
       accessibility tree (no aria-hidden-on-focusable trap).
     - Prev / Next / dot controls are real buttons with labels; the active dot
       carries aria-current and a filled (not color-only) state.
     - Left/Right arrow keys move the carousel when the region has focus.
     - Autoplay (SC 2.2.2 safe): off entirely under prefers-reduced-motion,
       pauses on hover and on keyboard focus, and a visible Pause/Play toggle
       gives every user an explicit stop. Single-item lists never autoplay.
   ============================================================================ */

import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

export interface TestimonialItem {
  quote: string;
  name: string;
  title?: string;
  href?: string;
  hrefLabel?: string;
}

export default function TestimonialCarousel({ items }: { items: TestimonialItem[] }) {
  const single = items.length <= 1;

  // Computed once on first render. On the server window is undefined, so SSR
  // gets no autoplay; the client hydration render (this is client:visible)
  // resolves the real preference. Single-item lists never autoplay.
  const autoplayRef = useRef(
    typeof window !== 'undefined' &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      !single
      ? Autoplay({ delay: 6500, stopOnMouseEnter: true, stopOnInteraction: false, stopOnFocusIn: true })
      : null,
  );

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: !single, align: 'center' },
    autoplayRef.current ? [autoplayRef.current] : [],
  );

  const [selected, setSelected] = useState(0);
  // mounted gates the client-only autoplay controls so the first client render
  // matches the server markup (no autoplay button on the server), avoiding a
  // hydration mismatch. playing is set true only after mount when autoplay runs.
  const [mounted, setMounted] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setMounted(true);
    setPlaying(Boolean(autoplayRef.current));
  }, []);

  const onSelect = useCallback(() => {
    if (emblaApi) setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect).on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  const togglePlay = useCallback(() => {
    const ap = autoplayRef.current;
    if (!ap) return;
    if (playing) {
      ap.stop();
      setPlaying(false);
    } else {
      ap.play();
      setPlaying(true);
    }
  }, [playing]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollNext();
    }
  };

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label="Client testimonials"
      onKeyDown={onKeyDown}
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {items.map((t, i) => (
            <figure
              key={`${t.name}-${i}`}
              className="flex min-w-0 flex-[0_0_100%] flex-col items-center gap-m px-s text-center"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${items.length}`}
              inert={i !== selected ? true : undefined}
            >
              <blockquote className="max-w-[50ch] text-h4 font-medium leading-[1.4] text-heading">
                <span aria-hidden="true" className="text-link">“</span>
                {t.quote}
                <span aria-hidden="true" className="text-link">”</span>
              </blockquote>
              <figcaption className="flex flex-col items-center gap-xs">
                <span className="font-display text-xl text-heading">{t.name}</span>
                {t.title && <span className="text-sm text-text-muted">{t.title}</span>}
                {t.href && (
                  <a href={t.href} className="card-link mt-xs">
                    {t.hrefLabel ?? 'Read the story'}
                  </a>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      {!single && (
        <div className="mt-xl flex items-center justify-center gap-m">
          <button
            type="button"
            onClick={scrollPrev}
            aria-label="Previous testimonial"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-text transition-colors duration-150 hover:border-link hover:text-link focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-2" role="group" aria-label="Choose a testimonial">
            {items.map((t, i) => (
              <button
                key={`dot-${t.name}-${i}`}
                type="button"
                onClick={() => scrollTo(i)}
                aria-label={`Go to testimonial ${i + 1}`}
                aria-current={i === selected ? 'true' : undefined}
                className={`h-2.5 rounded-full transition-all duration-200 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
                  i === selected ? 'w-6 bg-link' : 'w-2.5 bg-border hover:bg-text-muted'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={scrollNext}
            aria-label="Next testimonial"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-text transition-colors duration-150 hover:border-link hover:text-link focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>

          {mounted && autoplayRef.current && (
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? 'Pause testimonials' : 'Play testimonials'}
              className="ml-xs inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-text transition-colors duration-150 hover:border-link hover:text-link focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
            >
              {playing ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
