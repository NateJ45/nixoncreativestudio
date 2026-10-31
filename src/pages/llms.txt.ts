/* ============================================================================
   /llms.txt | A plain-text summary of the studio for AI tools
   ============================================================================
   Safe to edit. Follows the llms.txt convention (https://llmstxt.org): a
   Markdown file at the site root that tells language models and AI search
   tools, in a few hundred words, who the studio is, what it sells, what it
   costs and where the proof is.

   Everything is generated at build time from the same sources the pages use,
   so it can never say something the site does not:
     - identity and contact from src/data/site.ts
     - prices from src/data/pricing.ts
     - case studies from the case-studies collection (title, hook when the
       study has one, summary, URL), in the same order as /work

   robots.txt explicitly allows the AI crawlers that read this file (Nathan's
   decision, 2026-10-30).
   ============================================================================ */

import type { APIRoute } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { site } from '../data/site';
import { addOns, carePlans, webTiers } from '../data/pricing';
import { money } from '../lib/money';

// Static endpoint: written to dist as a plain file at build time.
export const prerender = true;

// `hook` and `order` arrive with the overhaul content model (package 1.6).
// Read them loosely so this file builds before and after that lands.
type Study = CollectionEntry<'case-studies'>;
const extra = (e: Study) => e.data as Study['data'] & { hook?: string; order?: number };

export const GET: APIRoute = async () => {
  // Same order as /work: the study's `order` when every study has one,
  // otherwise newest first by publish date.
  const all = await getCollection('case-studies');
  const ordered = all.every((e) => typeof extra(e).order === 'number');
  const studies = all.sort((a, b) =>
    ordered
      ? (extra(a).order ?? 0) - (extra(b).order ?? 0)
      : b.data.published.valueOf() - a.data.published.valueOf(),
  );

  const url = (path: string) => new URL(path, site.url).toString();

  const lines = [
    `# ${site.studioName}`,
    '',
    `> ${site.tagline} ${site.studioName} is one person, ${site.ownerName}, who plans, designs and builds every site himself and photographs projects across the Cincinnati region.`,
    '',
    `Based in ${site.address}. Web design, strategy and brand work for clients anywhere; photography in the Greater Cincinnati region. Every site is custom, accessible (built to WCAG 2.1 AA), fast, and handed over with a content system the client runs themselves.`,
    '',
    `Contact: ${site.email}, ${site.phone}. Start a project: ${url('/contact/')}`,
    '',
    '## Pricing',
    '',
    'Website builds (year one hosting included in every tier):',
    ...webTiers.map((t) => `- ${t.name}: from ${money(t.priceFrom)}. ${t.who}. ${t.range}.`),
    '',
    'Add to any project:',
    ...addOns.map((a) => `- ${a.name}: ${a.price}`),
    '',
    'Care after launch:',
    ...carePlans.map((p) => `- ${p.name}: ${p.price}${p.period}. ${p.time}.`),
    '',
    `Full details: ${url('/services/')}`,
    '',
    `## Case studies (${studies.length})`,
    '',
    ...studies.map((s) => {
      const hook = extra(s).hook;
      return `- [${s.data.title}](${url(`/work/${s.id}/`)}): ${hook ? `${hook} ` : ''}${s.data.summary}`;
    }),
    '',
    '## Pages',
    '',
    `- [About ${site.ownerName}](${url('/about/')})`,
    `- [Services and pricing](${url('/services/')})`,
    `- [All case studies](${url('/work/')})`,
    `- [Photography](${url('/photography/')})`,
    `- [Contact](${url('/contact/')})`,
    `- [How this site is built](${url('/colophon/')})`,
    `- [Accessibility statement](${url('/accessibility/')})`,
    `- [Privacy](${url('/privacy/')})`,
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
