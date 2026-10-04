import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getMenuItems, type CmsDeps, type CmsReader, type Raw } from './cms.ts';
import { fallbackFromFiles } from './cmsFallback.ts';
import { getSite, normalizeSite, phoneHref, emailHref, SITE_URL } from '../data/site.ts';

// ── Fixtures ─────────────────────────────────────────────────────────────────
// The committed fallback, read the way the Worker bundles it.

const readJson = (name: string): unknown =>
  JSON.parse(readFileSync(join(process.cwd(), 'cms/content', `${name}.json`), 'utf8'));
const files = { site_settings: readJson('site_settings'), menus: readJson('menus') };
const fallback = fallbackFromFiles(files);
const fallbackRaw = (fallback.entry('site_settings', 'site') ?? {}) as Raw;

/** A reader that serves the given entry / menu, or fails the way D1 would. */
function reader(opts: {
  entry?: Raw | null;
  entryError?: Error;
  throws?: boolean;
  menu?: Raw[] | null;
}): CmsReader {
  return {
    async getEntry() {
      if (opts.throws) throw new Error('D1 is down');
      return { data: opts.entry ?? null, error: opts.entryError };
    },
    async getList() {
      return { entries: [] };
    },
    async getMenu() {
      if (opts.throws) throw new Error('D1 is down');
      return { items: opts.menu ?? null };
    },
  };
}

function deps(r: CmsReader) {
  const logs: string[] = [];
  const d: CmsDeps = { reader: r, fallback, log: (m) => logs.push(m) };
  return { d, logs };
}

// ── The fallback IS today's hardcoded site.ts ────────────────────────────────

test('the committed fallback reproduces the values src/data/site.ts used to hold', () => {
  const s = normalizeSite(fallbackRaw);
  assert.equal(s.studioName, 'Nixon Creative Studio');
  assert.equal(s.ownerName, 'Nathan Nixon');
  assert.equal(s.email, 'nathan@nixoncreativestudio.com');
  assert.equal(s.phone, '(256) 318-6627');
  assert.equal(s.address, 'Cincinnati, OH');
  assert.equal(s.domain, 'nixoncreativestudio.com');
  assert.equal(s.url, 'https://nixoncreativestudio.com');
  assert.equal(s.social.instagram, 'https://www.instagram.com/thenate_n/');
  assert.equal(s.social.linkedin, 'https://www.linkedin.com/in/nathannixon/');
  assert.equal(
    s.tagline,
    'Modern websites for small businesses, nonprofits, churches, and schools. Based in Cincinnati, working with clients anywhere.',
  );
  assert.equal(s.bookingUrl, '');
  assert.equal(s.newsletterUrl, '');
  assert.equal(s.phoneHref, 'tel:2563186627');
  assert.equal(s.emailHref, 'mailto:nathan@nixoncreativestudio.com');
});

test('the fallback also carries the copy that used to live in components', () => {
  const s = normalizeSite(fallbackRaw);
  assert.equal(s.headerCtaLabel, 'Start a project');
  assert.equal(
    s.footerCurrently,
    'Booking small business and nonprofit web projects for the season ahead, with a few photography days mixed in.',
  );
  assert.deepEqual(s.ctaDefault, {
    title: "Let's build a site you won't have to redo.",
    sub: 'Tell me what you are working on. I reply myself within one or two business days.',
    label: 'Start a project',
  });
  assert.equal(s.defaultDescription, 'Nixon Creative Studio');
  assert.equal(s.rssTitle, 'Nixon Creative Studio: case studies');
  assert.equal(s.rssDescription, s.tagline);
});

test('phoneHref keeps digits only; emailHref is a plain mailto', () => {
  assert.equal(phoneHref('(256) 318-6627'), 'tel:2563186627');
  assert.equal(emailHref('a@b.co'), 'mailto:a@b.co');
  assert.equal(SITE_URL, 'https://nixoncreativestudio.com');
});

// ── The read path ────────────────────────────────────────────────────────────

test('getSite serves the CMS entry and derives the hrefs from it', async () => {
  const { d, logs } = deps(
    reader({
      entry: {
        ...fallbackRaw,
        email: 'hello@example.org',
        phone: '(513) 555-0100',
        booking_url: 'https://cal.com/nathannixon/30min',
        newsletter_url: null,
      },
    }),
  );
  const s = await getSite({}, { deps: d });
  assert.equal(s.email, 'hello@example.org');
  assert.equal(s.emailHref, 'mailto:hello@example.org');
  assert.equal(s.phoneHref, 'tel:5135550100');
  assert.equal(s.bookingUrl, 'https://cal.com/nathannixon/30min');
  assert.equal(s.newsletterUrl, '');
  assert.deepEqual(logs, [], 'a healthy read logs nothing');
});

test('a missing entry falls back to the committed JSON and logs it', async () => {
  const { d, logs } = deps(reader({ entry: null }));
  const s = await getSite({}, { deps: d });
  assert.equal(s.email, 'nathan@nixoncreativestudio.com');
  assert.equal(logs.length, 1);
  assert.match(logs[0], /site_settings\/site is missing or unpublished/);
});

test('a D1 error and a thrown read both fall back', async () => {
  for (const r of [reader({ entryError: new Error('no such table') }), reader({ throws: true })]) {
    const { d, logs } = deps(r);
    const s = await getSite({}, { deps: d });
    assert.equal(s.studioName, 'Nixon Creative Studio');
    assert.equal(logs.length, 1);
  }
});

test('an entry with a blank required field falls back instead of a half-empty footer', async () => {
  const { d, logs } = deps(reader({ entry: { ...fallbackRaw, email: '   ' } }));
  const s = await getSite({}, { deps: d });
  assert.equal(s.email, 'nathan@nixoncreativestudio.com');
  assert.match(logs[0], /could not be read as the expected shape/);
});

test('getSite reads once per request and shares the result', async () => {
  let reads = 0;
  const base = reader({ entry: fallbackRaw });
  const counting: CmsReader = {
    ...base,
    async getEntry(c, s) {
      reads += 1;
      return base.getEntry(c, s);
    },
  };
  const { d } = deps(counting);
  const request = new Request('https://example.com/');
  const [a, b, c] = await Promise.all([
    getSite({ request }, { deps: d }),
    getSite({ request }, { deps: d }),
    getSite({ request }, { deps: d }),
  ]);
  assert.equal(reads, 1);
  assert.strictEqual(a, b);
  assert.strictEqual(b, c);
  await getSite({ request: new Request('https://example.com/other') }, { deps: d });
  assert.equal(reads, 2, 'a different request reads again');
});

// ── Menus ────────────────────────────────────────────────────────────────────

test("with no menu in the CMS the header and footer menus are today's hardcoded nav", async () => {
  const { d } = deps(reader({ menu: null }));
  const primary = await getMenuItems('primary', { deps: d });
  assert.deepEqual(
    primary.map((i) => [i.label, i.url, i.titleAttr]),
    [
      ['Work', '/work/', 'Selected client projects'],
      ['Services', '/services/', 'What I build, and how'],
      ['About', '/about/', 'The studio, and me'],
      ['Journal', '/journal/', 'Notes on the work'],
    ],
  );
  const footer = await getMenuItems('footer', { deps: d });
  assert.deepEqual(
    footer.map((i) => [i.label, i.url]),
    [
      ['Work', '/work/'],
      ['Services', '/services/'],
      ['About', '/about/'],
      ['Journal', '/journal/'],
      ['Contact', '/contact/'],
    ],
  );
});

test('a menu edited in the CMS wins over the fallback, nested children ignored', async () => {
  const { d, logs } = deps(
    reader({
      menu: [
        { label: 'Projects', url: '/work/', titleAttr: 'The portfolio', children: [{}] },
        { label: '', url: '/blank/' },
      ],
    }),
  );
  const primary = await getMenuItems('primary', { deps: d });
  assert.deepEqual(primary, [
    { label: 'Projects', url: '/work/', target: undefined, titleAttr: 'The portfolio' },
  ]);
  assert.deepEqual(logs, []);
});
