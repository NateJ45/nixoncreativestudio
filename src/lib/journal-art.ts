// Safe to edit. Site-owned (not PORTABLE).
/* ============================================================================
   A drawn face for every journal post
   ============================================================================
   One small drawing per cluster, in the same line language as the 404's
   numerals (src/lib/not-found-art.ts): an ink outline on a paper fill, a few
   thinner ink lines inside it, and square studio-blue anchor points, the way a
   design tool shows a shape you are still working on. No stock art and nothing
   drawn per post: a post wears the face of its cluster.

     costs          a till receipt with a torn foot
     churches       a phone page with two service rows and a button
     schools        a calendar page with one day marked
     nonprofits     a search field over a result and a button
     accessibility  a key inside a focus ring
     lab            a rota grid with its gaps filled
     (none)         a sheet of notes

   Units are the SVG's own, a 120 by 120 box. `faceSvg()` returns the markup;
   the pages print it with set:html. Colours and line weights are in
   journal.css (.jf, .jf-o, .jf-d, .jf-p), so the drawing follows the theme.
   Every line carries pathLength="1", so one dash rule in CSS draws any of them
   in from nothing (the deck does that as a card comes to the front).
   ============================================================================ */

export interface Face {
  /** The closed shapes that carry the paper fill. */
  outline: string[];
  /** The thinner lines inside. */
  detail: string[];
  /** The anchor points, as [x, y]. */
  points: [number, number][];
}

/* A rectangle with round corners, as one path. */
const box = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${
    x + w - r
  } ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;

/* A circle, as two arcs. */
const ring = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;

const receipt: Face = {
  // The slip: straight sides and a foot torn into eight teeth.
  outline: ['M34 12H86V100l-6.5 7-6.5-7-6.5 7-6.5-7-6.5 7-6.5-7-6.5 7-6.5-7Z'],
  detail: [
    // Three lines, each a name on the left and an amount on the right.
    'M43 28H63M71 28H77',
    'M43 40H58M69 40H77',
    'M43 52H66M71 52H77',
    // The rule, then the total.
    'M43 66H77',
    'M43 80H55M65 80H77',
  ],
  points: [
    [34, 12],
    [86, 12],
    [77, 80],
  ],
};

const phone: Face = {
  outline: [box(37, 8, 46, 104, 9)],
  detail: [
    // The speaker, then the church's name.
    'M55 17H65',
    'M46 32H68',
    // Two services: a small clock and its line.
    `${ring(49.5, 50, 4.5)}M49.5 47.5V50H51.5`,
    'M59 50H74',
    `${ring(49.5, 66, 4.5)}M49.5 63.5V66H51.5`,
    'M59 66H71',
    // The button under them.
    box(45, 82, 30, 13, 6.5),
  ],
  points: [
    [37, 60],
    [83, 60],
    [60, 88.5],
  ],
};

const calendar: Face = {
  outline: [box(22, 22, 76, 82, 7)],
  detail: [
    // The two rings the page hangs from, and the rule under the month.
    'M44 14V30M76 14V30',
    'M22 42H98',
    // The days, as short strokes: three weeks of five.
    'M33 56H39M47 56H53M61 56H67M75 56H81',
    'M33 71H39M47 71H53M75 71H81',
    'M33 86H39M47 86H53M61 86H67M75 86H81',
    // The day that is booked: a ring round it.
    ring(64, 71, 7),
  ],
  points: [
    [22, 42],
    [98, 42],
    [64, 71],
  ],
};

const search: Face = {
  outline: [box(16, 18, 88, 26, 13), box(22, 84, 40, 20, 10)],
  detail: [
    // The magnifying glass in the field, and what was typed.
    `${ring(33, 30, 5)}M37 34L41.5 38.5`,
    'M50 31H78',
    // The result under it: a title and two lines.
    'M24 58H64',
    'M24 68H96',
    'M24 76H82',
    // The word on the button.
    'M33 94H51',
  ],
  points: [
    [16, 31],
    [104, 31],
    [62, 94],
  ],
};

const key: Face = {
  outline: [box(36, 36, 48, 48, 9)],
  detail: [
    // The focus ring round the key, then the arrow on it.
    box(24, 24, 72, 72, 16),
    'M48 60H71M64 52.5L71.5 60L64 67.5',
  ],
  points: [
    [24, 60],
    [96, 60],
    [60, 24],
    [60, 96],
  ],
};

const rota: Face = {
  outline: [box(16, 20, 88, 80, 7)],
  detail: [
    // The head row, then two columns and two rows of rules.
    'M16 38H104',
    'M44 38V100M74 38V100',
    'M16 59H104M16 80H104',
    // Who is on: a short stroke a name. Three slots are still open.
    'M24 49H36M52 49H66M82 49H96',
    'M24 70H36M82 70H96',
    'M52 91H66',
  ],
  // The open slots, filled: the three gaps the swap rule closed.
  points: [
    [59, 70],
    [30, 91],
    [89, 91],
  ],
};

const notes: Face = {
  // A sheet with its corner turned down.
  outline: ['M30 12H76L92 28V108H30Z'],
  detail: ['M76 12V28H92', 'M41 44H81', 'M41 56H81', 'M41 68H70', 'M41 86H58'],
  points: [
    [30, 12],
    [92, 28],
    [30, 108],
  ],
};

const FACES: Record<string, Face> = {
  costs: receipt,
  churches: phone,
  schools: calendar,
  nonprofits: search,
  accessibility: key,
  lab: rota,
};

/** The drawing a cluster wears; a post with no cluster gets the sheet of notes. */
export function faceFor(cluster: string | undefined): Face {
  return (cluster && FACES[cluster]) || notes;
}

/**
 * The drawing as an inline SVG. It is decoration: the card beside it says the cluster in words,
 * so it is hidden from assistive tech. `cls` adds a class for the page that places it.
 */
export function faceSvg(cluster: string | undefined, cls = ''): string {
  const f = faceFor(cluster);
  const line = (c: string) => (d: string) => `<path class="${c}" pathLength="1" d="${d}"/>`;
  // A point is a path with almost no length: its square line cap is what you see. It is drawn
  // twice, a blue square and a smaller paper one inside it, like an anchor in a design tool.
  const points = f.points.map(([x, y]) => `M${x} ${y}h.01`).join('');
  return (
    `<svg class="jf${cls ? ' ' + cls : ''}" viewBox="0 0 120 120" aria-hidden="true" focusable="false">` +
    f.outline.map(line('jf-o')).join('') +
    f.detail.map(line('jf-d')).join('') +
    `<path class="jf-p" d="${points}"/><path class="jf-pi" d="${points}"/>` +
    '</svg>'
  );
}
