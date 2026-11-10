/* ============================================================================
   The sourced figures, for the "What changed" stack on /work
   ============================================================================
   A case study ends on a <ResultsBlock items={[...]} /> in its MDX body. A row
   there is a sentence or a figure ({ figure, text, source }), and only a figure
   with a source is set at display size (case-results.test.ts). /work gathers
   those same figures, so this reads them straight out of the study's body text:
   nothing is typed twice, and a figure that leaves a study leaves /work too.

   The dot maths lives here as well, so it can be unit tested
   (work-figures.test.ts): one dot per `unit`, never more than MAX_DOTS dots.
   ============================================================================ */

export interface SourcedFigure {
  figure: string;
  text: string;
  source: string;
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
      if (figure && text && source) out.push({ figure, text, source });
    }
  }
  return out;
}

/** The number inside a figure: "About 5,200" is 5200, "2,345" is 2345. NaN when there is none. */
export function figureNumber(figure: string): number {
  const m = /\d[\d,]*(?:\.\d+)?/.exec(figure);
  return m ? Number(m[0].replace(/,/g, '')) : NaN;
}

export const MAX_DOTS = 120;

/** Round units a reader can hold in their head: 1, 2, 5, 10, 20, 25, 50, 100 and so on. */
function* niceUnits() {
  for (let p = 1; ; p *= 10) for (const m of [1, 2, 2.5, 5]) if (m * p >= 1) yield m * p;
}

export interface DotPlan {
  /** What one dot stands for. */
  unit: number;
  /** How many dots to draw: round(n / unit), at most MAX_DOTS. */
  dots: number;
  /** True when the dots add up to the figure exactly. */
  exact: boolean;
}

/** The smallest round unit that keeps the grid at or under `max` dots. */
export function dotPlan(n: number, max = MAX_DOTS): DotPlan {
  if (!Number.isFinite(n) || n <= 0) throw new Error(`No dots for ${n}`);
  for (const unit of niceUnits()) {
    if (!Number.isInteger(unit)) continue;
    const dots = Math.round(n / unit);
    if (dots <= max) return { unit, dots: Math.max(1, dots), exact: dots * unit === n };
  }
  throw new Error('unreachable');
}

/** The words under the grid: "Each dot is 20." or, when the dots round, says so. */
export function dotWords({ unit, exact }: DotPlan): string {
  const u = unit.toLocaleString('en-US');
  return exact ? `Each dot is ${u}.` : `Each dot is ${u}, rounded to the nearest dot.`;
}
