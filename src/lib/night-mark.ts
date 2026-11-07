// Safe to edit. Site-owned.
//
// A client's accent is usually a deep color, chosen to read on paper. On the dark side of this site
// it would vanish, so a study's small marks (chapter numbers, figures, rules) use a color that reads
// there. A client's own second color comes first (`palette.markDark` in the study's frontmatter, a
// gold on most of them), because a tint made up here is not theirs. Only a client with no such color
// gets their accent lifted towards white, as little as it takes.

import { contrastRatio, AA_BODY_TEXT } from './contrast.ts';

/** The dark side's surfaces a mark sits on: `--ground` and `--card` in kit.css. */
export const NIGHT_SURFACES = ['#14162f', '#1d2042'];

function reads(hex: string): boolean {
  return NIGHT_SURFACES.every((surface) => contrastRatio(hex, surface) >= AA_BODY_TEXT);
}

function towardsWhite(hex: string, amount: number): string {
  const channel = (i: number) => {
    const v = parseInt(hex.slice(i, i + 2), 16);
    return Math.round(v + (255 - v) * amount)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

/** The color a client's marks take on the dark side. Always clears AA on both surfaces. */
export function nightMark(accent: string, markDark?: string): string {
  if (markDark && reads(markDark)) return markDark;
  for (let amount = 0; amount <= 1; amount += 0.02) {
    const lifted = towardsWhite(accent, amount);
    if (reads(lifted)) return lifted;
  }
  return '#ffffff';
}
