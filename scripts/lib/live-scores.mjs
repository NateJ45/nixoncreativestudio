// Pure helpers for scripts/measure-live.mjs (overhaul package 4.7). No I/O here, so
// scripts/lib/live-scores.test.mjs can run them under `node --test`.

/** The five studies measured: sites the studio builds end to end on Astro + Sanity + Cloudflare. */
export const MEASURED_SLUGS = [
  'mas-monograms',
  'presbyterian-academy',
  'reid-design',
  'stone-steps-50k',
  'first-baptist-muncie',
];

/** Median of a non-empty list of numbers (the mean of the middle two when the count is even). */
export function median(values) {
  if (values.length === 0) throw new Error('median of an empty list');
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** One Lighthouse JSON report reduced to the numbers this site keeps. */
export function readReport(report) {
  const score = (id) => {
    const v = report?.categories?.[id]?.score;
    if (typeof v !== 'number') throw new Error(`report has no ${id} score`);
    return Math.round(v * 100);
  };
  const metric = (id) => {
    const v = report?.audits?.[id]?.numericValue;
    if (typeof v !== 'number') throw new Error(`report has no ${id} value`);
    return v;
  };
  return {
    performance: score('performance'),
    accessibility: score('accessibility'),
    bestPractices: score('best-practices'),
    seo: score('seo'),
    lcpMs: metric('largest-contentful-paint'),
    cls: metric('cumulative-layout-shift'),
  };
}

/** The median of each number across several runs, rounded for storage. */
export function summarise(runs) {
  const med = (key) => median(runs.map((r) => r[key]));
  return {
    performance: Math.round(med('performance')),
    accessibility: Math.round(med('accessibility')),
    bestPractices: Math.round(med('bestPractices')),
    seo: Math.round(med('seo')),
    lcpMs: Math.round(med('lcpMs')),
    cls: Math.round(med('cls') * 1000) / 1000,
  };
}

/** The `liveUrl` line of a case study's frontmatter, or undefined. */
export function liveUrlOf(mdx) {
  const m = /^liveUrl:\s*["']?(\S+?)["']?\s*$/m.exec(mdx);
  return m ? m[1] : undefined;
}
