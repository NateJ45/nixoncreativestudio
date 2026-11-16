/* The two flags on About's postcard (src/components/Crossing.astro), as plain SVG drawn on the
   postcard's sky box: 1200 x 560, with 40 units more above and below so a waving flag never shows
   an edge. The page shows them still (reduced motion, or before the loop loads); the waving loop
   in public/media/ is rendered from these same drawings by scripts/render-flags.mjs, so change
   them here and run `npm run flags:render`. */

export const W = 1200;
export const H = 560;
export const PAD = 40;

/** The Stars and Stripes starts here; the Saltire runs to SALTIRE_END, under the crossfade. */
export const US = { x: 480, w: 720 };
export const SALTIRE_END = US.x + 320;

const r = (n: number) => +n.toFixed(2);
const wrap = (body: string) =>
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 ${-PAD} ${W} ${H + 2 * PAD}' width='${W}' height='${H + 2 * PAD}' preserveAspectRatio='none'>${body}</svg>`;

export function saltireSvg(): string {
  return wrap(
    `<rect y='${-PAD}' width='${SALTIRE_END}' height='${H + 2 * PAD}' fill='#005eb8'/>` +
      `<path d='M0 0 ${SALTIRE_END} ${H}M0 ${H} ${SALTIRE_END} 0' stroke='#fff' stroke-width='80'/>`,
  );
}

/* 13 stripes, a canton of seven, 50 stars in rows of 6 and 5. The stripes and stars are two
   patterns. The stars: rows of 6 and 5 interleave, so one tile a sixth of the canton wide and two
   rows tall holds a star at its middle and one at its corners. The filled box stops 10 units
   inside the canton's edges, which keeps the 50 stars whole and leaves out the corner stars that
   would fall on the edge. */
const STAR =
  'm0-7.5 1.76 5.08 5.37.1-4.28 3.24 1.56 5.15-4.41-3.07-4.41 3.07 1.56-5.15-4.28-3.24 5.37-.1z';
export function usFlagSvg(): string {
  const stripe = H / 13;
  const canton = { w: US.w * 0.4, h: stripe * 7 };
  const tile = { w: canton.w / 6, h: (canton.h / 10) * 2 };
  return wrap(
    `<defs><pattern id='t' width='${W}' height='${r(stripe * 2)}' patternUnits='userSpaceOnUse'>` +
      `<rect y='${r(stripe)}' width='${W}' height='${r(stripe)}' fill='#fff'/></pattern>` +
      `<pattern id='s' x='${US.x}' width='${r(tile.w)}' height='${r(tile.h)}' patternUnits='userSpaceOnUse'>` +
      `<path fill='#fff' d='M${r(tile.w / 2)} ${r(tile.h / 2)}${STAR}M0 0${STAR}M${r(tile.w)} 0${STAR}M0 ${r(tile.h)}${STAR}M${r(tile.w)} ${r(tile.h)}${STAR}'/></pattern></defs>` +
      `<rect x='${US.x}' y='${-PAD}' width='${US.w}' height='${H + 2 * PAD}' fill='#b22234'/>` +
      `<rect x='${US.x}' width='${US.w}' height='${H}' fill='url(#t)'/>` +
      `<rect x='${US.x}' y='${-PAD}' width='${r(canton.w)}' height='${r(canton.h + PAD)}' fill='#4d5cc4'/>` +
      `<rect x='${US.x + 10}' y='10' width='${r(canton.w - 20)}' height='${r(canton.h - 20)}' fill='url(#s)'/>`,
  );
}

/** A drawing as a CSS url() of a data URI, escaping only what a data URI needs. */
export function cssUrl(svg: string): string {
  return `url("data:image/svg+xml,${svg.replace(/[%#<>"]/g, encodeURIComponent)}")`;
}
