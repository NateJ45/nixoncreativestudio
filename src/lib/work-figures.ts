/* ============================================================================
   The sourced figures, for the "What changed" stack on /work
   ============================================================================
   A case study ends on a <ResultsBlock items={[...]} /> in its MDX body. A row
   there is a sentence or a figure ({ figure, text, source }), and only a figure
   with a source is set at display size (case-results.test.ts). /work gathers
   those same figures, so this reads them straight out of the study's body text:
   nothing is typed twice, and a figure that leaves a study leaves /work too.

   A figure can also name a capture of the page where the number lives (shot,
   shotAlt, shotNote) and, when it is part of a stated whole, that whole (of,
   ofLabel). /work shows the capture beside the number and draws the part as a
   bar; the maths for the bar is here so it can be unit tested.
   ============================================================================ */

export interface SourcedFigure {
  figure: string;
  text: string;
  source: string;
  /** A capture of the page where the number lives: a file name in public/assets/study/. */
  shot?: string;
  shotAlt?: string;
  /** The line under the capture, saying what it is. */
  shotNote?: string;
  /** The whole this figure is part of ("216"), when it is one. */
  of?: string;
  /** What the whole is counted in, to finish "195 of 216 ...". */
  ofLabel?: string;
}

/** A quoted string in an object literal: '...', "..." or `...`, escapes allowed. */
const QUOTED = String.raw`(['"\x60])((?:\\.|(?!\1)[\s\S])*)\1`;

function field(obj: string, key: string): string | undefined {
  const m = new RegExp(String.raw`\b${key}\s*:\s*` + QUOTED).exec(obj);
  return m ? m[2].replace(/\\(.)/g, '$1').trim() : undefined;
}

/** Every figure with a source in a study body's ResultsBlock ledgers, in the order written. */
export function sourcedFigures(body: string): SourcedFigure[] {
  const blocks = body.match(/<ResultsBlock\b[\s\S]*?\/>/g) ?? [];
  const out: SourcedFigure[] = [];
  for (const block of blocks) {
    // A figure is a flat object literal, so it never holds braces itself.
    for (const obj of block.match(/\{[^{}]*\bfigure\s*:[^{}]*\}/g) ?? []) {
      const figure = field(obj, 'figure');
      const text = field(obj, 'text');
      const source = field(obj, 'source');
      if (!figure || !text || !source) continue;
      const fig: SourcedFigure = { figure, text, source };
      for (const key of ['shot', 'shotAlt', 'shotNote', 'of', 'ofLabel'] as const) {
        const v = field(obj, key);
        if (v) fig[key] = v;
      }
      out.push(fig);
    }
  }
  return out;
}

/** The number inside a figure: "About 5,200" is 5200, "2,345" is 2345. NaN when there is none. */
export function figureNumber(figure: string): number {
  const m = /\d[\d,]*(?:\.\d+)?/.exec(figure);
  return m ? Number(m[0].replace(/,/g, '')) : NaN;
}

export interface Share {
  /** The part, the figure's own number. */
  part: number;
  /** The whole it is counted out of. */
  whole: number;
  /** The part as a fraction of the whole, 0 to 1, for the bar's width. */
  ratio: number;
  /** The line beside the bar: "195 of 216 library items searchable word for word". */
  words: string;
}

/** A figure that is part of a stated whole, or undefined when it names no whole. */
export function share(f: SourcedFigure): Share | undefined {
  if (!f.of) return undefined;
  const part = figureNumber(f.figure);
  const whole = figureNumber(f.of);
  if (!(part > 0) || !(whole > 0) || part > whole)
    throw new Error(`"${f.figure}" of "${f.of}" is not a part of a whole`);
  const n = (x: number) => x.toLocaleString('en-US');
  return {
    part,
    whole,
    ratio: part / whole,
    words: `${n(part)} of ${n(whole)}${f.ofLabel ? ' ' + f.ofLabel : ''}`,
  };
}
