import { test, expect, type Page } from '@playwright/test';
import { routes } from './routes';

// =============================================================================
// Metadata: titles, descriptions, JSON-LD, llms.txt and robots.txt
// =============================================================================
// Site-owned (overhaul package 1.9). Reads every route in tests/routes.ts plus
// every case study linked from /work/, so a new study is checked without
// anyone adding it here.
//
//  - Each page has a title of at most 64 characters (60 is the aim; one study
//    with a long client name runs to 63) and a description of 110 to 160, and
//    no two pages share either.
//  - Every JSON-LD block parses, no `@id` is defined twice, and every
//    { "@id": ... } reference points at a node on the same page.
//  - The /services JSON-LD offers quote prices the page actually shows.
//  - /llms.txt is plain text and lists every case study; /robots.txt names
//    the AI crawlers and keeps the sitemap line.
// =============================================================================

const TITLE_MAX = 64;
const DESC_MIN = 110;
const DESC_MAX = 160;

/** Every case-study path linked from /work/, e.g. '/work/stone-steps-50k/'. */
async function studyPaths(page: Page): Promise<string[]> {
  await page.goto('/work/');
  const hrefs = await page.$$eval('a[href^="/work/"]', (els) =>
    els.map((e) => e.getAttribute('href') ?? ''),
  );
  return [...new Set(hrefs.filter((h) => /^\/work\/[^/?#]+\/$/.test(h)))].sort();
}

/** routes.ts plus every study, with trailing slashes, each once (routes.ts lists the sample study too). */
async function allPaths(page: Page, skip: string[] = []): Promise<string[]> {
  const slash = (p: string) => (p.endsWith('/') ? p : `${p}/`);
  const list = [...routes.filter((r) => !skip.includes(r)), ...(await studyPaths(page))];
  return [...new Set(list.map(slash))];
}

type Json = Record<string, unknown>;

function walk(node: unknown, visit: (o: Json) => void) {
  if (Array.isArray(node)) node.forEach((n) => walk(n, visit));
  else if (node && typeof node === 'object') {
    visit(node as Json);
    Object.values(node).forEach((v) => walk(v, visit));
  }
}

async function jsonLd(page: Page): Promise<unknown[]> {
  const blocks = await page.$$eval('script[type="application/ld+json"]', (els) =>
    els.map((e) => e.textContent ?? ''),
  );
  return blocks.map((raw) => JSON.parse(raw));
}

test('titles and descriptions are present, sized for search results, and unique', async ({
  page,
}) => {
  const paths = await allPaths(page);
  const titles = new Map<string, string>();
  const descriptions = new Map<string, string>();
  for (const path of paths) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    const title = await page.title();
    const description =
      (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';
    expect(title.length, `${path} title "${title}"`).toBeLessThanOrEqual(TITLE_MAX);
    expect(description.length, `${path} description "${description}"`).toBeGreaterThanOrEqual(
      DESC_MIN,
    );
    expect(description.length, `${path} description "${description}"`).toBeLessThanOrEqual(
      DESC_MAX,
    );
    expect(description, `${path} description has no em dash`).not.toContain(
      String.fromCharCode(0x2014),
    );
    expect(titles.get(title), `${path} shares its title`).toBeUndefined();
    expect(descriptions.get(description), `${path} shares its description`).toBeUndefined();
    titles.set(title, path);
    descriptions.set(description, path);
  }
});

test('every JSON-LD graph parses, has unique ids, and every reference resolves', async ({
  page,
}) => {
  const paths = await allPaths(page, ['/coming-soon']);
  for (const path of paths) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    const blocks = await jsonLd(page);
    expect(blocks.length, `${path} has JSON-LD`).toBeGreaterThan(0);
    const defined: string[] = [];
    const refs: string[] = [];
    walk(blocks, (o) => {
      if (typeof o['@id'] !== 'string') return;
      if ('@type' in o) defined.push(o['@id']);
      else refs.push(o['@id']);
    });
    expect(defined, `${path} defines each @id once`).toEqual([...new Set(defined)]);
    for (const ref of refs) expect(defined, `${path} defines ${ref}`).toContain(ref);
    const text = JSON.stringify(blocks);
    expect(text, `${path} claims no ratings or reviews`).not.toMatch(/aggregateRating|"review"/);
  }
});

test('case studies carry CreativeWork and a BreadcrumbList', async ({ page }) => {
  for (const path of await studyPaths(page)) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    const types: string[] = [];
    walk(await jsonLd(page), (o) => {
      const t = o['@type'];
      if (typeof t === 'string') types.push(t);
      else if (Array.isArray(t)) types.push(...(t as string[]));
    });
    expect(types, path).toContain('CreativeWork');
    expect(types, path).toContain('BreadcrumbList');
  }
});

test('the /services offers quote prices the page shows', async ({ page }) => {
  await page.goto('/services/');
  const body = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
  const prices: number[] = [];
  walk(await jsonLd(page), (o) => {
    for (const key of ['minPrice', 'maxPrice', 'price']) {
      if (typeof o[key] === 'number') prices.push(o[key] as number);
    }
  });
  expect(prices.length).toBeGreaterThan(0);
  for (const p of prices) {
    expect(body, `the page shows $${p.toLocaleString('en-US')}`).toContain(
      `${p.toLocaleString('en-US')}`,
    );
  }
});

test('/llms.txt is plain text and lists every case study', async ({ page, request }) => {
  const studies = await studyPaths(page);
  const res = await request.get('/llms.txt');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('text/plain');
  const text = await res.text();
  expect(text).toMatch(/^# Nixon Creative Studio/);
  expect(text).toContain(`## Case studies (${studies.length})`);
  for (const path of studies) expect(text, `llms.txt lists ${path}`).toContain(path);
});

test('/robots.txt allows the AI crawlers and keeps the sitemap', async ({ request }) => {
  const text = await (await request.get('/robots.txt')).text();
  for (const bot of [
    'GPTBot',
    'ClaudeBot',
    'Claude-SearchBot',
    'PerplexityBot',
    'Google-Extended',
    'Applebot-Extended',
    'CCBot',
  ]) {
    expect(text, bot).toContain(`User-agent: ${bot}`);
  }
  expect(text).not.toMatch(/Disallow:\s*\/\s*$/m);
  expect(text).toContain('Sitemap: https://nixoncreativestudio.com/sitemap-index.xml');
});
