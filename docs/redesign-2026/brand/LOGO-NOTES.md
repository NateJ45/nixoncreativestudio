# Logo notes

Vector set built from `logo-navy.png` / `logo-white.png` (1423 x 361 masters). Glyphs are Bebas Neue outlines (no live font), each fitted to the measured glyph box of the PNG.

## Files

| File                              | Use                                                              | Size    |
| --------------------------------- | ---------------------------------------------------------------- | ------- |
| `logo.svg`                        | Full lockup, `currentColor` with `--logo-color` fallback to navy | ~6.0 KB |
| `logo-white.svg`                  | Full lockup, white, for dark backgrounds                         | ~6.0 KB |
| `logo-mark-top.svg`               | Top line only (viewBox 1423 x 183), for narrow mobile headers    | ~3.3 KB |
| `logo-navy.png`, `logo-white.png` | Raster masters (source of truth for the artwork)                 |         |

Usage: inline the SVG or use `<img>`. Inline lets it inherit `color`; as `<img>` it renders navy. Set the colour with `color: var(--paper)` or `--logo-color`. Always set an explicit `width` or `height`; the ratio is 1423:361 (3.94:1) for the lockup and 1423:183 (7.78:1) for the top line.

## Colours

- Navy (brand dark): `#0a1628`, rgb(10, 22, 40). Sampled from the PNG's solid pixels.
- White: `#ffffff` on navy or other dark grounds.
- The divider rule is the same colour at 74% opacity (about 3.6 px thick at 1423 px wide, so roughly 0.25% of the width).

## Sizes

- Header, desktop: lockup 220 to 280 px wide (line 2 stays legible).
- Header, mobile (under 480 px): use `logo-mark-top.svg`, 140 to 180 px wide.
- Footer / hero: lockup 320 px and up.

## Minimum sizes

- Full lockup: 160 px wide (screen), 40 mm (print). Below this the second line fails.
- Top line only: 96 px wide (screen), 25 mm (print).

## Clear space

Keep a margin on all sides equal to the cap height of line 2 (`x`, about 24% of the lockup height, so a 280 px wide lockup needs about 17 px). For the top-line mark use the cap height of its own letters divided by 2. Do not place text, edges or other logos inside this zone.

## Do not

Stretch or condense, recolour outside navy/white, add shadows or outlines, rearrange the lines, or place on low-contrast photos without a scrim.

## Fidelity

Alpha-channel diff against the PNG at 1423 x 361 shows 8.3% of ink pixels (3.6% of the canvas) differ visibly, almost all on glyph edges and crossbar thickness (the PNG's top line is slightly heavier and softer than stock Bebas Neue). Side-by-side: `logo-compare.png` (PNG, SVG render, diff in red).
