/* ============================================================================
   A bar chart read out of a table
   ============================================================================
   A journal post's comparison table is the one place its numbers are written.
   BarChart.astro wraps that table in the post, and this reads the rendered
   table's HTML at build time: the first column is each bar's name, one named
   column is its amount. The chart is drawn from what the table says, so the
   two cannot disagree, and a number that will not parse stops the build
   instead of drawing a wrong bar.

   Pure string work (no DOM, no astro imports), so table-chart.test.ts can run
   it with node --test.
   ============================================================================ */

export interface ChartRow {
  /** The row's first cell, as plain text. */
  label: string;
  /** The amount exactly as the table prints it ("$1,066"). */
  text: string;
  /** The amount as a number. */
  value: number;
  /** Its share of the largest amount, 0 to 100, to two places. */
  pct: number;
}

export interface TableChart {
  /** The first column's heading ("Option"). */
  labelHead: string;
  /** The charted column's heading ("5-year total"). */
  valueHead: string;
  rows: ChartRow[];
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
  '&nbsp;': ' ',
};

/** A cell's HTML as plain text: tags out, the common entities back to characters. */
export function cellText(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&(?:amp|lt|gt|quot|nbsp|#39|#x27);/g, (m) => ENTITIES[m])
    .replace(/\s+/g, ' ')
    .trim();
}

/** "$1,066" is 1066 and "$213.24" is 213.24. Anything that is not one plain amount is NaN. */
export function amount(text: string): number {
  return /^\$?\d[\d,]*(\.\d+)?$/.test(text) ? Number(text.replace(/[$,]/g, '')) : NaN;
}

const cells = (row: string, tag: 'th' | 'td') =>
  [...row.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) =>
    cellText(m[1]),
  );

/**
 * Read the first table in `html`. `column` is the heading of the column to chart; without it the
 * last column is used. Throws, naming the problem, when there is no table, no such column, or a
 * cell in it that is not a plain amount.
 */
export function tableChart(html: string, column?: string): TableChart {
  const table = /<table\b[\s\S]*?<\/table>/.exec(html)?.[0];
  if (!table) throw new Error('BarChart: there is no table inside it');
  const rows = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => m[1]);
  const head = rows.map((r) => cells(r, 'th')).find((r) => r.length) ?? [];
  const at = column ? head.indexOf(column) : head.length - 1;
  if (at < 1) throw new Error(`BarChart: no column headed "${column ?? ''}" to chart`);
  const body = rows.map((r) => cells(r, 'td')).filter((r) => r.length);
  if (!body.length) throw new Error('BarChart: the table has no rows');
  const read = body.map((r) => {
    const value = amount(r[at] ?? '');
    if (!Number.isFinite(value))
      throw new Error(`BarChart: "${r[at]}" in the row "${r[0]}" is not a plain amount`);
    return { label: r[0], text: r[at], value };
  });
  const max = Math.max(...read.map((r) => r.value));
  return {
    labelHead: head[0],
    valueHead: head[at],
    rows: read.map((r) => ({ ...r, pct: max ? Math.round((r.value / max) * 10000) / 100 : 0 })),
  };
}
