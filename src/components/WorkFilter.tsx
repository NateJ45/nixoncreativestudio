/* ============================================================================
   WorkFilter
   ============================================================================
   Safe to edit.

   Client-side filter for the /work index card grid. Renders a row of sector
   chips and toggles a `data-hidden` attribute on the matching card list items
   so CSS can hide them. The cards themselves are rendered server-side by
   /work/index.astro; this component just tags them visible / hidden based on
   the active chip.

   Year is intentionally NOT a filter here: the studio doesn't want to surface
   project timing or how many projects happened per year. Filtering is sector
   only.

   Why DOM manipulation rather than re-rendering the card list in React:
   the cards have rich Astro Image markup with srcsets that we don't want
   to duplicate in JSX or re-render on filter changes. Hiding via a CSS
   class is one paint, no hydration of card content needed.

   The cards expect: data-work-card data-sector="..."
   ============================================================================ */

import { useEffect, useState } from 'react';

export interface WorkFilterProps {
  /** Distinct sector values across all case studies, in display order. */
  sectors: Array<{ value: string; label: string }>;
}

export default function WorkFilter({ sectors }: WorkFilterProps) {

  const [sector, setSector] = useState<string>('all');

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
      const match = sector === 'all' || cardSector === sector;
      card.toggleAttribute('data-hidden', !match);
      if (match) visible += 1;
    });

    // Toggle the "no results" notice (server-rendered, starts hidden).
    const empty = document.querySelector<HTMLElement>('[data-work-empty]');
    if (empty) empty.toggleAttribute('data-hidden', visible !== 0);
  }, [sector]);

  return (
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
  );
}
