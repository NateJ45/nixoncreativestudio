#!/usr/bin/env node
// =============================================================================
// measure-live.mjs - live Lighthouse scores for the studio's own client sites
// =============================================================================
// Overhaul package 4.7. Runs Lighthouse (mobile, default throttling) three times
// against each measured study's `liveUrl` home page and keeps the MEDIAN of
// Performance, Accessibility, Best Practices, SEO, LCP and CLS. Writes
// src/data/live-scores.json, which the case-study rail reads at build
// (src/lib/live-scores.ts hides any entry older than 120 days).
//
// RUN IT IN CI, NOT ON THIS PC: Lighthouse on Windows is not trustworthy
// (docs/claude/gotchas.md, Gotcha 9), and the committed numbers must come from
// the .github/workflows/live-scores.yml runner (ubuntu-latest, Chrome).
//
// Lighthouse is not a direct dependency: it ships inside @lhci/cli, which is
// already in devDependencies, and npm hoists it to node_modules/lighthouse.
//
//   node scripts/measure-live.mjs            all five sites, 3 runs each
//   node scripts/measure-live.mjs --runs=1 --only=reid-design     (a smoke test)
//
// A site that fails to measure keeps its previous entry and is reported; the
// script exits 1 only when nothing could be measured.
// =============================================================================
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MEASURED_SLUGS, liveUrlOf, readReport, summarise } from './lib/live-scores.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = join(root, 'src', 'data', 'live-scores.json');
const cli = join(root, 'node_modules', 'lighthouse', 'cli', 'index.js');

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const runs = Number(arg('runs') ?? 3);
const only = arg('only')?.split(',');
const slugs = only ?? MEASURED_SLUGS;

if (!existsSync(cli)) {
  console.error('lighthouse is not installed (expected inside @lhci/cli). Run npm ci first.');
  process.exit(1);
}

function lighthouseOnce(url) {
  const r = spawnSync(
    process.execPath,
    [
      cli,
      url,
      '--output=json',
      '--output-path=stdout',
      '--quiet',
      '--only-categories=performance,accessibility,best-practices,seo',
      '--chrome-flags=--headless=new --no-sandbox --disable-gpu',
    ],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 180_000 },
  );
  if (r.status !== 0) throw new Error(`lighthouse exited ${r.status}: ${r.stderr.slice(0, 400)}`);
  const report = JSON.parse(r.stdout);
  if (report.runtimeError) {
    throw new Error(`${report.runtimeError.code}: ${report.runtimeError.message}`);
  }
  return readReport(report);
}

const previous = existsSync(outFile) ? JSON.parse(readFileSync(outFile, 'utf8')) : { scores: {} };
const scores = { ...previous.scores };
let measured = 0;

for (const slug of slugs) {
  const mdx = join(root, 'src', 'content', 'case-studies', `${slug}.mdx`);
  const url = existsSync(mdx) ? liveUrlOf(readFileSync(mdx, 'utf8')) : undefined;
  if (!url) {
    console.error(`SKIP ${slug}: no liveUrl in its case study`);
    continue;
  }
  try {
    const results = [];
    for (let i = 0; i < runs; i++) {
      results.push(lighthouseOnce(url));
      console.log(`${slug} run ${i + 1}/${runs}: performance ${results[i].performance}`);
    }
    scores[slug] = {
      url,
      measuredAt: new Date().toISOString(),
      formFactor: 'mobile',
      runs,
      ...summarise(results),
    };
    measured++;
    console.log(`${slug}:`, JSON.stringify(scores[slug]));
  } catch (err) {
    console.error(`FAIL ${slug} (${url}): ${err.message}`);
  }
}

const sorted = Object.fromEntries(Object.entries(scores).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(outFile, JSON.stringify({ scores: sorted }, null, 2) + '\n');
console.log(`Measured ${measured} of ${slugs.length}; wrote ${outFile}`);
process.exit(measured === 0 ? 1 : 0);
