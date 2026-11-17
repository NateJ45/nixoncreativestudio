// Safe to edit.
/* ============================================================================
   build-run-map.mjs: the Cincinnati street map under my Flying Pig 10K
   ============================================================================
   Usage (LOCAL ONLY, from this repo's root):

     node scripts/build-run-map.mjs              (fetches from Overpass)
     node scripts/build-run-map.mjs --from x.json  (re-bakes a saved response)
     node scripts/build-run-map.mjs --save x.json  (fetches and keeps the response)

   Pulls the roads and the rivers around the run from OpenStreetMap (Overpass
   API), projects them with exactly the maths the Running card uses for the
   route (OffTheClock.astro: CW 280, PAD 10, equirectangular at the run's
   middle latitude), clips and simplifies them, and writes

     public/assets/about/flying-pig-map.svg

   which IS committed. The card pulls it in with an external <use>, so it costs
   the page's HTML nothing and is cached like any asset. Colours are not baked:
   each layer paints with a CSS custom property (--map-water, --map-road-*)
   set in about.css, so the map follows the light and dark themes.

   The map reaches well past the route's own box (MX, MY below) because the
   card's map panel is wider than the route and its svg overflows visibly; the
   panel crops it. Map data (c) OpenStreetMap contributors, ODbL: the card
   carries the credit.
   ============================================================================ */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { runBounds as B } from '../src/data/flying-pig-10k.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const OUT = resolve(root, 'public/assets/about/flying-pig-map.svg');
const flag = (name) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? null : resolve(process.argv[i + 1]);
};

/* ---- The card's projection (keep in step with OffTheClock.astro) ---- */
const CW = 280;
const PAD = 10;
const midLat = ((B.north + B.south) / 2) * (Math.PI / 180);
const scale = (CW - PAD * 2) / ((B.east - B.west) * Math.cos(midLat));
const CH = Math.round((B.north - B.south) * scale + PAD * 2);
const px = (lon) => PAD + (lon - B.west) * Math.cos(midLat) * scale;
const py = (lat) => PAD + (B.north - lat) * scale;

/* How far past the viewBox the map runs, in card units. */
const MX = 150;
const MY = 70;
const R = { x0: -MX, y0: -MY, x1: CW + MX, y1: CH + MY };
const geo = {
  west: B.west + (R.x0 - PAD) / (Math.cos(midLat) * scale),
  east: B.west + (R.x1 - PAD) / (Math.cos(midLat) * scale),
  north: B.north - (R.y0 - PAD) / scale,
  south: B.north - (R.y1 - PAD) / scale,
};

/* ---- Fetch ---- */
const ROADS = {
  major: ['motorway', 'trunk', 'motorway_link', 'trunk_link'],
  mid: ['primary', 'secondary', 'tertiary', 'primary_link', 'secondary_link', 'tertiary_link'],
  minor: ['residential', 'unclassified', 'living_street'],
};
const bbox = [geo.south, geo.west, geo.north, geo.east].map((n) => n.toFixed(5)).join(',');
const query = `[out:json][timeout:90];
(
  way["highway"~"^(${Object.values(ROADS).flat().join('|')})$"](${bbox});
  way["natural"="water"]["water"="river"](${bbox});
  relation["natural"="water"]["water"="river"](${bbox});
);
out geom;`;

let data;
const from = flag('--from');
if (from) data = JSON.parse(readFileSync(from, 'utf8'));
else {
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: {
      'User-Agent': 'ncs-map-bake/1.0',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `data=${encodeURIComponent(query)}`,
  });
  const text = await res.text();
  if (!res.ok || !text.startsWith('{'))
    throw new Error(`Overpass ${res.status}: ${text.slice(0, 200)}`);
  data = JSON.parse(text);
  const save = flag('--save');
  if (save) writeFileSync(save, text);
}

const toXY = (g) => g.map((p) => [px(p.lon), py(p.lat)]);

/* ---- Geometry helpers ---- */
// Douglas-Peucker, in card units.
const simplify = (pts, tol) => {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a];
    const [bx, by] = pts[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    let best = -1;
    let bi = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * (pts[i][0] - ax) - dx * (pts[i][1] - ay)) / len;
      if (d > best) [best, bi] = [d, i];
    }
    if (best > tol) {
      keep[bi] = 1;
      stack.push([a, bi], [bi, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
};
// A closed ring starts and ends on the same point, which gives Douglas-Peucker no baseline: split
// it at the point farthest from the start and simplify the two halves.
const simplifyRing = (ring, tol) => {
  const pts = ring.slice(0, -1);
  let k = 0;
  let far = -1;
  pts.forEach(([x, y], i) => {
    const d = Math.hypot(x - pts[0][0], y - pts[0][1]);
    if (d > far) [far, k] = [d, i];
  });
  const a = simplify(pts.slice(0, k + 1), tol);
  const b = simplify([...pts.slice(k), pts[0]], tol);
  return a.concat(b.slice(1, -1));
};

// Liang-Barsky: clip a polyline to R, splitting it where it leaves and re-enters.
const clipLine = (pts) => {
  const runs = [];
  let cur = null;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const dx = x1 - x0;
    const dy = y1 - y0;
    let t0 = 0;
    let t1 = 1;
    let ok = true;
    for (const [p, q] of [
      [-dx, x0 - R.x0],
      [dx, R.x1 - x0],
      [-dy, y0 - R.y0],
      [dy, R.y1 - y0],
    ]) {
      if (p === 0) {
        if (q < 0) ok = false;
      } else {
        const t = q / p;
        if (p < 0) t0 = Math.max(t0, t);
        else t1 = Math.min(t1, t);
      }
    }
    if (!ok || t0 > t1) {
      cur = null;
      continue;
    }
    const a = [x0 + t0 * dx, y0 + t0 * dy];
    const b = [x0 + t1 * dx, y0 + t1 * dy];
    if (!cur || t0 > 0) {
      cur = [a];
      runs.push(cur);
    }
    cur.push(b);
    if (t1 < 1) cur = null;
  }
  return runs.filter((r) => r.length > 1);
};

// Sutherland-Hodgman against the rectangle R (convex, so any ring clips cleanly).
const clipRing = (ring) => {
  const edges = [
    [(p) => p[0] >= R.x0, (a, b) => [R.x0, a[1] + ((R.x0 - a[0]) * (b[1] - a[1])) / (b[0] - a[0])]],
    [(p) => p[0] <= R.x1, (a, b) => [R.x1, a[1] + ((R.x1 - a[0]) * (b[1] - a[1])) / (b[0] - a[0])]],
    [(p) => p[1] >= R.y0, (a, b) => [a[0] + ((R.y0 - a[1]) * (b[0] - a[0])) / (b[1] - a[1]), R.y0]],
    [(p) => p[1] <= R.y1, (a, b) => [a[0] + ((R.y1 - a[1]) * (b[0] - a[0])) / (b[1] - a[1]), R.y1]],
  ];
  let out = ring;
  for (const [inside, cut] of edges) {
    const src = out;
    out = [];
    for (let i = 0; i < src.length; i++) {
      const a = src[(i + src.length - 1) % src.length];
      const b = src[i];
      if (inside(b)) {
        if (!inside(a)) out.push(cut(a, b));
        out.push(b);
      } else if (inside(a)) out.push(cut(a, b));
    }
    if (!out.length) break;
  }
  return out;
};

// Join a multipolygon's member ways end to end into closed rings.
const joinRings = (lines) => {
  const key = (p) => `${p.lat},${p.lon}`;
  const left = lines.map((l) => [...l]);
  const rings = [];
  while (left.length) {
    let ring = left.shift();
    let grew = true;
    while (key(ring[0]) !== key(ring[ring.length - 1]) && grew) {
      grew = false;
      const end = key(ring[ring.length - 1]);
      for (let i = 0; i < left.length; i++) {
        const l = left[i];
        if (key(l[0]) === end) ring = ring.concat(l.slice(1));
        else if (key(l[l.length - 1]) === end) ring = ring.concat([...l].reverse().slice(1));
        else continue;
        left.splice(i, 1);
        grew = true;
        break;
      }
    }
    if (key(ring[0]) === key(ring[ring.length - 1])) rings.push(ring);
  }
  return rings;
};

/* ---- Build the layers ---- */
const r1 = (n) => Math.round(n * 10) / 10;
const fmt = (pts, close) =>
  pts.map(([x, y], i) => `${i ? 'L' : 'M'}${r1(x)} ${r1(y)}`).join('') + (close ? 'Z' : '');

const water = [];
const roads = { major: [], mid: [], minor: [] };
const classOf = (hw) => Object.keys(ROADS).find((k) => ROADS[k].includes(hw));

for (const e of data.elements) {
  if (e.tags?.natural === 'water') {
    const rings =
      e.type === 'way'
        ? [e.geometry]
        : joinRings(e.members.filter((m) => m.type === 'way' && m.geometry).map((m) => m.geometry));
    for (const g of rings) {
      const ring = clipRing(simplifyRing(toXY(g), 0.3));
      if (ring.length > 2) water.push(fmt(ring, true));
    }
  } else if (e.tags?.highway && e.geometry) {
    const k = classOf(e.tags.highway);
    if (!k) continue;
    for (const run of clipLine(toXY(e.geometry))) roads[k].push(fmt(simplify(run, 0.35), false));
  }
}
if (!water.length) throw new Error('No river came back: check the query');

/* evenodd so an island (an inner ring) stays land. */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CW} ${CH}">
<!-- GENERATED by scripts/build-run-map.mjs. Map data (c) OpenStreetMap contributors, ODbL. -->
<g id="map" fill="none" stroke-linecap="round" stroke-linejoin="round">
<path style="fill:var(--map-water,#dde6f2)" fill-rule="evenodd" d="${water.join('')}"/>
<path style="stroke:var(--map-road-minor,#e4e4e4)" stroke-width="0.9" d="${roads.minor.join('')}"/>
<path style="stroke:var(--map-road-mid,#d6d6d6)" stroke-width="1.6" d="${roads.mid.join('')}"/>
<path style="stroke:var(--map-road-major,#c8c8c8)" stroke-width="2.6" d="${roads.major.join('')}"/>
</g>
</svg>
`;
writeFileSync(OUT, svg);
console.log(
  `Wrote ${OUT}: ${(svg.length / 1024).toFixed(1)} KB, ${water.length} water rings, ` +
    `roads ${Object.entries(roads)
      .map(([k, v]) => `${k} ${v.length}`)
      .join(', ')}`,
);
