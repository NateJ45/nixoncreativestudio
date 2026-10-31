// =============================================================================
// Picture helpers (overhaul package 4.4): the width ladder and the shared
// <Picture> settings
// =============================================================================
// A srcset is a ladder of widths. The browser takes the smallest step at least
// as wide as the slot times the screen density, so a big gap between two
// steps makes a slot just past the lower one fetch the upper one: a 520px slot
// on a [480, 800] ladder downloads the 800 file, about 2.4 times the pixels it
// needs. `ladder` closes every gap wider than MAX_STEP by adding evenly spaced
// (geometric) steps, rounded to 20px so neighbouring components share files.
//
// It never removes a step a caller asked for, and never adds one below the
// smallest or above the largest, so the range stays the caller's decision.
// Used by Media.astro and the few components that call <Picture> directly.
// PICTURE below is the format half: AVIF first, WebP as the fallback.
// =============================================================================

/** The widest ratio allowed between two neighbouring steps. */
export const MAX_STEP = 1.4;

export function ladder(widths: readonly number[], maxStep = MAX_STEP): number[] {
  const sorted = [...new Set(widths.filter((w) => w > 0).map(Math.round))].sort((a, b) => a - b);
  const out: number[] = [];
  sorted.forEach((w, i) => {
    const prev = sorted[i - 1];
    if (prev !== undefined && w / prev > maxStep) {
      // How many equal (geometric) parts keep every step at or under maxStep.
      const parts = Math.ceil(Math.log(w / prev) / Math.log(maxStep));
      const factor = (w / prev) ** (1 / parts);
      for (let k = 1; k < parts; k++) {
        const step = Math.round((prev * factor ** k) / 20) * 20;
        if (step > prev && step < w) out.push(step);
      }
    }
    out.push(w);
  });
  return [...new Set(out)];
}

/**
 * The shared <Picture> settings: an AVIF <source> ahead of a WebP <img>.
 * Spread it last on every <Picture> (`{...PICTURE}`). The <picture> is
 * display: contents, so it adds no box of its own: the <img> keeps its class,
 * its CSS and the loading / fetchpriority it had as a bare <Image>, and lays
 * out exactly as before. AVIF quality is set once in astro.config.mjs.
 */
export const PICTURE = {
  formats: ['avif' as const],
  fallbackFormat: 'webp' as const,
  // A getter, so every spread gets a fresh object: Astro's <Picture> writes the
  // calling component's scoped class onto pictureAttributes, and one shared
  // object would carry that class into every other component.
  get pictureAttributes(): { style: string } {
    return { style: 'display: contents' };
  },
};

/**
 * `sizes` for media that fills the .page-grid body (columns 4 to 12 from 64rem,
 * full width below). The container is min(100vw, 82.5rem) less 3rem of side
 * padding and the gutter is 2.5vw (2rem from 80rem), so nine of twelve columns
 * come to 74.3vw less 35px between 64rem and the cap, and 946px at the cap.
 * tests/images.spec.ts checks it against the rendered box at four widths.
 */
export const BODY_SIZES =
  '(min-width: 82.5rem) 946px, (min-width: 64rem) calc(74.3vw - 35px), calc(100vw - 3rem)';
