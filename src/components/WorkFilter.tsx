/* ============================================================================
   WorkFilter
   ============================================================================
   Safe to edit.

   Client-side filter for the /work index card grid. Renders two rows of
   chips (sector + year), and toggles a `data-hidden` attribute on the
   matching card list items so CSS can hide them. The cards themselves
   are rendered server-side by /work/index.astro; this component just
   tags them as visible / hidden based on chip selection.

   Why DOM manipulation rather than re-rendering the card list in React:
   the cards have rich Astro Image markup with srcsets that we don't want
   to duplicate in JSX or re-render on filter changes. Hiding via a CSS
   class is one paint, no hydration of card content needed.

   The cards expect data attributes:
     data-work-card data-sector="..." data-year="..."
   ============================================================================ */

import { useEffect, useMemo, useState } from 'react';

export interface WorkFilterProps {
  /** Distinct sector values across all case studies, in display order. */
  sectors: Array<{ value: string; label: string }>;
  /** Distinct year values across all case studies, sorted newest first. */
  years:   number[];
}

export default function WorkFilter({ sectors, years }: WorkFilterProps) {

  const [sector, setSector] = useState<string>('all');
  const [year,   setYear]   = useState<string>('all');

  // The chip styles — pulled into one place so the render below stays
  // focused on which one is active.
  const chipBase = 'inline-flex items-center rounded-full border px-3 py-1 font-body text-[0.85rem] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2';
  const chipOff  = 'border-border bg-bg text-text hover:bg-bg-soft';
  const chipOn   = 'border-link bg-link text-accent-foreground';

  // On every state change, walk the cards and toggle visibility. Done
  // in a useEffect so React's render cycle stays clean.
  useEffect(() => {
    const cards = document.querySelectorAll<HTMLElement>('[data-work-card]');
    let visible = 0;
    cards.forEach((card) => {
      const cardSector = card.getAttribute('data-sector') ?? '';
      const cardYear   = card.getAttribute('data-year')   ?? '';
      const match =
        (sector === 'all' || cardSector === sector) &&
        (year   === 'all' || cardYear   === year);
      card.toggleAttribute('data-hidden', !match);
      if (match) visible += 1;
    });

    // Toggle the "no results" notice (server-rendered, starts hidden).
    const empty = document.querySelector<HTMLElement>('[data-work-empty]');
    if (empty) empty.toggleAttribute('data-hidden', visible !== 0);
  }, [sector, year]);

  // Memoize because the parent passes a fresh array on each render.
  const yearOptions = useMemo(() => years.map((y) => String(y)), [years]);

  return (
    <div className="flex flex-col gap-s">

      <fieldset className="flex flex-wrap items-center gap-xs">
        <legend className="sr-only">Filter by sector</legend>
        <span className="font-mono text-[0.75rem] uppercase tracking-[0.08em] text-text-muted">
          Sector
        </span>
        <button
          type="button"
          onClick={() => setSector('all')}
          className={`${chipBase} ${sector === 'all' ? chipOn : chipOff}`}
          aria-pressed={sector === 'all'}
        >
          All
        </button>
        {sectors.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setSector(s.value)}
            className={`${chipBase} ${sector === s.value ? chipOn : chipOff}`}
            aria-pressed={sector === s.value}
          >
            {s.label}
          </button>
        ))}
      </fieldset>

      <fieldset className="flex flex-wrap items-center gap-xs">
        <legend className="sr-only">Filter by year</legend>
        <span className="font-mono text-[0.75rem] uppercase tracking-[0.08em] text-text-muted">
          Year
        </span>
        <button
          type="button"
          onClick={() => setYear('all')}
          className={`${chipBase} ${year === 'all' ? chipOn : chipOff}`}
          aria-pressed={year === 'all'}
        >
          All
        </button>
        {yearOptions.map((y) => (
          <button
            key={y}
            type="button"
            onClick={() => setYear(y)}
            className={`${chipBase} ${year === y ? chipOn : chipOff}`}
            aria-pressed={year === y}
          >
            {y}
          </button>
        ))}
      </fieldset>

    </div>
  );
}
