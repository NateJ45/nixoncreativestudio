// Safe to edit. Site-owned (not PORTABLE).
/* ============================================================================
   The 404's numerals, as a drawing caught mid-edit
   ============================================================================
   "404" drawn the way a design tool shows a shape you are still working on:
   an outline, a square on every anchor point, and the handles that bend the
   curves of the zero. The page renders it at rest from here (src/pages/404.astro)
   and src/scripts/not-found.js moves the points with the same functions, so the
   still picture and the moving one can never disagree.

   Units are the SVG's own (see VIEW). A shape is one closed outline; a point may
   carry a handle in (`i`) and a handle out (`o`), written as offsets from it.
   ============================================================================ */

export interface ArtPoint {
  x: number;
  y: number;
  /** The handle coming into this point, as an offset from it. */
  i?: [number, number];
  /** The handle leaving this point, as an offset from it. */
  o?: [number, number];
  /** Draw this point's handles. The zero's counter keeps its handles to itself. */
  show?: boolean;
}
export type ArtShape = ArtPoint[];

/** The picture's frame, with room round the edge for the squares and handles. */
export const VIEW = { x: -16, y: 12, w: 938, h: 376 };

/* A heavy "4": the stem, the bar and the slope, all straight lines, and its triangle counter. */
const four = (at: number): ArtShape[] =>
  [
    [
      [150, 30],
      [225, 30],
      [225, 250],
      [270, 250],
      [270, 315],
      [225, 315],
      [225, 370],
      [150, 370],
      [150, 315],
      [0, 315],
      [0, 255],
    ],
    [
      [150, 140],
      [150, 250],
      [78, 250],
    ],
  ].map((shape) => shape.map(([x, y]) => ({ x: x + at, y })));

/* A "0": two ovals, four points each. 0.5523 is the handle length that makes a quarter circle. */
const K = 0.5523;
const oval = (cx: number, cy: number, rx: number, ry: number, show: boolean): ArtShape => [
  { x: cx, y: cy - ry, i: [-K * rx, 0], o: [K * rx, 0], show },
  { x: cx + rx, y: cy, i: [0, -K * ry], o: [0, K * ry], show },
  { x: cx, y: cy + ry, i: [K * rx, 0], o: [-K * rx, 0], show },
  { x: cx - rx, y: cy, i: [0, K * ry], o: [0, -K * ry], show },
];
const zero = (at: number): ArtShape[] => [
  oval(at + 135, 200, 135, 172, true),
  oval(at + 135, 200, 62, 104, false),
];

export const SHAPES: ArtShape[] = [...four(0), ...zero(318), ...four(636)];

/** Every point, in the order the offsets are kept in. */
export const POINTS: ArtPoint[] = SHAPES.flat();

const n = (v: number) => v.toFixed(1);

/** The five paths of the picture. `off` moves each point: [x0, y0, x1, y1, ...], or nothing for rest. */
export function artPaths(off?: ArrayLike<number>) {
  let outline = '',
    handles = '',
    ends = '',
    anchors = '',
    at = 0;
  for (const shape of SHAPES) {
    /* This shape's points where they are right now. */
    const now = shape.map((p) => {
      const x = p.x + (off ? off[at * 2] : 0),
        y = p.y + (off ? off[at * 2 + 1] : 0);
      at++;
      return { p, x, y };
    });
    now.forEach((cur, j) => {
      if (j === 0) outline += `M${n(cur.x)} ${n(cur.y)}`;
      const next = now[(j + 1) % now.length];
      const o = cur.p.o,
        i = next.p.i;
      if (o || i) {
        outline += `C${n(cur.x + (o ? o[0] : 0))} ${n(cur.y + (o ? o[1] : 0))} ${n(
          next.x + (i ? i[0] : 0),
        )} ${n(next.y + (i ? i[1] : 0))} ${n(next.x)} ${n(next.y)}`;
      } else if (j < now.length - 1) outline += `L${n(next.x)} ${n(next.y)}`;
      /* A point is a path with almost no length: its square line cap is what you see. */
      anchors += `M${n(cur.x)} ${n(cur.y)}h.01`;
      if (cur.p.show) {
        for (const h of [cur.p.i, cur.p.o]) {
          if (!h) continue;
          handles += `M${n(cur.x)} ${n(cur.y)}L${n(cur.x + h[0])} ${n(cur.y + h[1])}`;
          ends += `M${n(cur.x + h[0])} ${n(cur.y + h[1])}h.01`;
        }
      }
    });
    outline += 'Z';
  }
  return { outline, handles, ends, anchors };
}
