// Safe to edit. Site-owned (not PORTABLE).
// =============================================================================
// The measurements a case study prints about itself
// =============================================================================
// Two things on a study read real numbers off the page instead of typing them:
// the spec on a decision card (its heading size, its padding, and the colour of
// its "What I did" label against the card, with the contrast ratio) and the
// sizing frame in the hero (the pixel size of the still it is drawn around).
// Everything here is pure, so the unit test can hold it to the files and to the
// same contrast maths the palette gate uses (contrast.ts).
//
// The rule both follow: a value that cannot be read is left out. Nothing is
// guessed, rounded up or filled in.
// =============================================================================
import { contrastRatio, AA_BODY_TEXT } from './contrast.ts';

/** The phone still every window shows (`/assets/{slug}-m.webp`). The test reads each file. */
export const PHONE_STILL = { w: 584, h: 1138 } as const;

/** `rgb(18, 18, 17)` or `rgb(18 18 17)` to `#121211`. Null for anything see-through or in
    another notation: a colour that cannot be read is not measured. */
export function rgbToHexString(css: string): string | null {
  const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(
    css.trim(),
  );
  if (!m) return null;
  if (m[4] !== undefined && parseFloat(m[4]) !== (m[4].endsWith('%') ? 100 : 1)) return null;
  const parts = [m[1], m[2], m[3]].map((v) => Math.round(Number(v)));
  if (parts.some((v) => !(v >= 0 && v <= 255))) return null;
  return `#${parts.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export interface PairSpec {
  /** The text colour, as a hex. */
  fg: string;
  /** What it sits on, as a hex. */
  bg: string;
  /** WCAG contrast ratio, to two places. */
  ratio: number;
  /** Clears 4.5 to 1, the AA line for body text. */
  aa: boolean;
}

/** A text colour on its ground, from two computed colours. Null if either cannot be read. */
export function pairSpec(fg: string, bg: string): PairSpec | null {
  const a = rgbToHexString(fg),
    b = rgbToHexString(bg);
  if (!a || !b) return null;
  const ratio = contrastRatio(a, b);
  return { fg: a, bg: b, ratio, aa: ratio >= AA_BODY_TEXT };
}

/** "9.31 to 1" reads better as 9.3; never rounds a failing pair up over the line. */
export function ratioWords(ratio: number): string {
  return `${(Math.floor(ratio * 10) / 10).toFixed(1)}:1`;
}

/** A computed length like `27.5px` as a short label, "27.5px" or "28px". Null if not in px. */
export function pxWords(css: string): string | null {
  const m = /^([\d.]+)px$/.exec(css.trim());
  if (!m) return null;
  const n = Math.round(Number(m[1]) * 10) / 10;
  return `${n}px`;
}

/** "1000 × 750", or an empty string when there is no size on record. */
export function sizeWords(size: readonly number[] | { w: number; h: number } | undefined): string {
  if (!size) return '';
  const [w, h] = 'w' in size ? [size.w, size.h] : size;
  return w > 0 && h > 0 ? `${w} × ${h}` : '';
}
