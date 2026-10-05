/* ============================================================================
   heroGround (the home hero's two grounds, as tokens)
   ============================================================================
   Safe to edit. DESIGN.md "Hero ground".

   The hero draws the Ohio's contours (the foundation's contour sheet,
   src/assets/grounds/contours.svg) as three CSS mask layers, each filled with
   a token colour: the contour lines, the river and creek beds, and the river's
   banks with its name. The masks are white-on-transparent copies baked by
   scripts/brand/build-hero-contours.mjs into src/assets/home/contours-*.svg.

   Why masks and not a background image: a background image attached after the
   load event became the page's LCP element (Lighthouse, 2026-10-04: the LCP
   moved to .hero-lines at 2.6 s). A mask is not an LCP candidate, and the
   colours stay tokens, so switching the ground is this one file.

   Pure (no imports) so src/lib/heroContours.test.ts can check every hero text
   colour against the worst line pixel of each ground.
   ============================================================================ */

export interface HeroGroundTokens {
  /** The band's flat colour (the Band ground paints it). */
  ground: string;
  /** Contour lines: colour and opacity of the heaviest (50 m) line. */
  line: string;
  lineOpacity: number;
  /** River and creek beds (opaque). */
  bed: string;
  /** The river's banks and its name. */
  edge: string;
  edgeOpacity: number;
}

/** The minor (10 m) contour line's strength relative to the major one, as baked. */
export const MINOR_LINE = 0.73;

export const HERO_GROUNDS: Record<'ink' | 'paper', HeroGroundTokens> = {
  // Light contours drawn on the ink board, the river edged in vermilion (--marker-hot), its
  // bed one step up (--ink-raised).
  ink: {
    ground: '#0a1628',
    line: '#f3eee4',
    lineOpacity: 0.16,
    bed: '#15233a',
    edge: '#f2835f',
    edgeOpacity: 0.34,
  },
  // The survey sheet turned up: the contour brown at a weight you can see, the river edged
  // in slate (--river).
  paper: {
    ground: '#e8e6d9',
    line: '#7a5638',
    lineOpacity: 0.42,
    bed: '#dedbcc',
    edge: '#6c8592',
    edgeOpacity: 0.7,
  },
};

/** The custom properties the hero's mask layers read. */
export function heroGroundStyle(t: HeroGroundTokens): string {
  return [
    `--hg-line: ${t.line}`,
    `--hg-line-o: ${t.lineOpacity}`,
    `--hg-bed: ${t.bed}`,
    `--hg-edge: ${t.edge}`,
    `--hg-edge-o: ${t.edgeOpacity}`,
  ].join('; ');
}
