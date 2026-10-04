import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CmsDeps, CmsReader, Raw } from './cms.ts';
import { fallbackFromFiles } from './cmsFallback.ts';
import {
  BUNDLED_HEADSHOT,
  aboutTitle,
  buildPersonSchema,
  dayOf,
  freshnessLabel,
  getAboutPage,
  normalizeAboutPage,
  picture,
  updatedLabel,
} from './aboutPage.ts';
import { blockHtml, restrictPortableText } from './portableText.ts';

// ── Fixtures ─────────────────────────────────────────────────────────────────
// The committed fallback, read the way the Worker bundles it.

const readJson = (name: string): unknown =>
  JSON.parse(readFileSync(join(process.cwd(), 'cms/content', `${name}.json`), 'utf8'));
const fallback = fallbackFromFiles({ page_about: readJson('page_about') });
const aboutRaw = (fallback.entry('page_about', 'about') ?? {}) as Raw;

/** A reader that serves the given entry, or fails the way D1 would. */
function reader(opts: { page?: Raw | null; error?: Error; throws?: boolean }): CmsReader {
  return {
    async getEntry() {
      if (opts.throws) throw new Error('D1 is down');
      if (opts.error) return { data: null, error: opts.error };
      return { data: opts.page ?? null };
    },
    async getList() {
      return { entries: [] };
    },
    async getMenu() {
      return { items: null };
    },
  };
}

function deps(r: CmsReader) {
  const logs: string[] = [];
  const d: CmsDeps = { reader: r, fallback, log: (m) => logs.push(m) };
  return { d, logs };
}

/** What an EmDash image field stores once the loader (or the admin) has uploaded a file. */
const media = (name: string) => ({
  id: `01MEDIA${name.toUpperCase()}`,
  provider: 'local',
  filename: `${name}.jpg`,
  mimeType: 'image/jpeg',
  width: 1200,
  height: 1200,
  alt: '',
  meta: { storageKey: `${name.toUpperCase()}.jpg` },
});

/** The fallback entry with its bundled-file references replaced by CMS media. */
function cmsEntry(): Raw {
  const photos = (aboutRaw.photos as Raw[]).map((p, i) => ({ ...p, image: media(`photo${i}`) }));
  return { ...aboutRaw, headshot: media('headshot'), photos };
}

// ── The fallback IS today's hardcoded /about page ────────────────────────────
// These literals were copied from about.astro on main before this PR. If one
// changes, the production page changes with it, so it should be a deliberate edit
// of cms/content/page_about.json.

test('the committed fallback reproduces the words /about used to hold', async () => {
  const { d, logs } = deps(reader({}));
  const about = await getAboutPage({}, { deps: d });
  assert.equal(logs.length, 1);
  assert.match(logs[0], /page_about\/about is missing or unpublished/);

  assert.equal(about.seoTitle, 'About');
  assert.equal(
    about.seoDescription,
    'About Nathan Nixon, sole owner of Nixon Creative Studio in Cincinnati, Ohio.',
  );
  assert.equal(about.ctaTitle, 'Want to talk about a project?');
  assert.equal(about.heading, 'A one-person studio for');
  assert.equal(about.headingAccent, 'sites your own people can run.');
  assert.match(about.intro, /^I'm Nathan Nixon\. I run Nixon Creative Studio out of Cincinnati/);
  assert.match(about.intro, /hands you the finished site\.$/);
  assert.deepEqual(about.thesis, {
    before:
      'One person on every project, start to finish: strategy, design, photography, and code. I work with',
    accent: 'churches, schools, nonprofits, and small businesses',
    after: 'around Cincinnati in person, and anywhere for web work.',
  });
  assert.equal(about.story.heading, 'The longer story');
  assert.equal(about.story.body.length, 4, 'the four story paragraphs');
  assert.equal(about.outside.heading, 'Outside the studio');
  assert.deepEqual(
    about.outside.photos.map((p) => [p.caption, p.file]),
    [
      ['A park afternoon', 'src/assets/about/family.jpg'],
      ['Race day', 'src/assets/about/running.jpg'],
      ['Out exploring', 'src/assets/about/exploring.jpg'],
      ['Wedding day', 'src/assets/about/wedding.jpg'],
      ['From the other side of the lens', 'src/assets/about/portrait-bw.jpg'],
    ],
  );
  assert.deepEqual(
    about.principles.items.map((p) => p.title),
    [
      'Strategy before pixels',
      'The right platform for the job',
      'Cincinnati base, clients anywhere',
    ],
  );
  assert.equal(about.currently.heading, 'Currently');
  assert.equal(about.currently.updated, '2026-10-01');
  assert.deepEqual(about.currently.workingOn, [
    "Finishing the Presbyterian Academy website ahead of the school's first term.",
    'Buying our first house, here in Cincinnati.',
  ]);
  assert.deepEqual(
    about.currently.booking.map((b) => [b.label, b.status]),
    [
      ['Web design', 'open'],
      ['Photography', 'limited'],
    ],
  );
  assert.deepEqual(
    about.currently.reading.map((r) => [r.title, r.author, r.note]),
    [
      ['John Adams', 'David McCullough', undefined],
      ['The New Father', 'Armin A. Brott', undefined],
      ['The Lord of the Rings', 'J.R.R. Tolkien', 're-reading'],
    ],
  );
  assert.equal(about.currently.learning.length, 3);
  assert.equal(about.testimonials.heading, 'What clients say');
  assert.deepEqual(about.lighthouse, {
    performance: 92,
    accessibility: 100,
    bestPractices: 100,
    seo: 100,
  });
  assert.equal(about.jobTitle, 'Founder, Designer, Developer, Photographer');
});

test('the fallback keeps pointing at the bundled pictures, with their alt text', async () => {
  const { d } = deps(reader({}));
  const about = await getAboutPage({}, { deps: d });
  assert.deepEqual(about.headshot, {
    file: 'src/assets/brand/headshot.jpg',
    alt: 'Nathan Nixon, smiling outdoors',
  });
  assert.deepEqual(about.headshot, BUNDLED_HEADSHOT);
  for (const photo of about.outside.photos) {
    assert.ok(photo.file, `${photo.caption} names a bundled file`);
    assert.equal(photo.image, undefined, 'a fallback photo is not CMS media');
    assert.ok(photo.alt.length > 20, `${photo.caption} has alt text`);
  }
});

test('the story renders as four bare paragraphs carrying the original text', async () => {
  const { d } = deps(reader({}));
  const about = await getAboutPage({}, { deps: d });
  const html = restrictPortableText(about.story.body).map((b) => blockHtml(b));
  assert.equal(html.length, 4);
  assert.match(html[0], /^I came to this work through a camera\. For years I photographed/);
  assert.ok(html[0].includes("the studio's main work now"), 'apostrophes stay literal');
  assert.match(html[2], /^I also do plenty of this work as a volunteer\./);
  assert.match(html[3], /a few episodes into a history drama\.$/);
  assert.ok(
    html.every((p) => !p.includes('<')),
    'no markup in the committed story',
  );
});

test('an unreadable read (D1 down, or an error) serves the same fallback and logs it', async () => {
  for (const r of [reader({ throws: true }), reader({ error: new Error('boom') })]) {
    const { d, logs } = deps(r);
    const about = await getAboutPage({}, { deps: d });
    assert.equal(about.heading, 'A one-person studio for');
    assert.equal(logs.length, 1);
  }
});

// ── The CMS path ─────────────────────────────────────────────────────────────

test('a CMS entry is used, with its pictures as EmDash media and no bundled file', async () => {
  const { d, logs } = deps(reader({ page: cmsEntry() }));
  const about = await getAboutPage({}, { deps: d });
  assert.equal(logs.length, 0, 'no fallback line on the CMS path');
  assert.equal(about.headshot.image?.id, '01MEDIAHEADSHOT');
  assert.equal(about.headshot.file, undefined);
  assert.equal(about.headshot.alt, 'Nathan Nixon, smiling outdoors');
  assert.equal(about.outside.photos.length, 5);
  assert.deepEqual(
    about.outside.photos.map((p) => p.image?.id),
    [0, 1, 2, 3, 4].map((i) => `01MEDIAPHOTO${i}`),
  );
  assert.ok(about.outside.photos.every((p) => p.file === undefined));
});

test('the CMS path and the fallback path agree on every word', async () => {
  const fromFallback = await getAboutPage({}, { deps: deps(reader({})).d });
  const fromCms = await getAboutPage({}, { deps: deps(reader({ page: cmsEntry() })).d });
  const words = (a: typeof fromCms) => ({
    ...a,
    headshot: a.headshot.alt,
    outside: {
      ...a.outside,
      photos: a.outside.photos.map((p) => [p.caption, p.alt]),
    },
  });
  assert.deepEqual(words(fromCms), words(fromFallback));
});

// ── Alt text and the picture rules ───────────────────────────────────────────

test('a photo with no description is left out, never shipped bare', () => {
  const entry = cmsEntry();
  const photos = entry.photos as Raw[];
  photos[1] = { ...photos[1], alt: '   ' };
  const about = normalizeAboutPage(entry);
  assert.equal(about.outside.photos.length, 4);
  assert.ok(!about.outside.photos.some((p) => p.caption === 'Race day'));
});

test('a photo with no picture is left out', () => {
  const entry = cmsEntry();
  const photos = entry.photos as Raw[];
  photos[0] = { ...photos[0], image: null };
  assert.equal(normalizeAboutPage(entry).outside.photos.length, 4);
});

test('fewer than three usable photos makes the whole entry fall back', async () => {
  const entry = cmsEntry();
  entry.photos = (entry.photos as Raw[]).slice(0, 2);
  const { d, logs } = deps(reader({ page: entry }));
  const about = await getAboutPage({}, { deps: d });
  assert.equal(about.outside.photos.length, 5, 'the fallback has all five');
  assert.match(logs[0], /could not be read as the expected shape/);
});

test('more than six photos: the extras never render', () => {
  const entry = cmsEntry();
  const photos = entry.photos as Raw[];
  entry.photos = [...photos, ...photos, ...photos].slice(0, 9);
  assert.equal(normalizeAboutPage(entry).outside.photos.length, 6);
});

test('a headshot with no description (or no picture) falls back to the bundled headshot', () => {
  const noAlt = normalizeAboutPage({ ...cmsEntry(), headshot_alt: '' });
  assert.deepEqual(noAlt.headshot, BUNDLED_HEADSHOT);
  const noPicture = normalizeAboutPage({ ...cmsEntry(), headshot: null });
  assert.deepEqual(noPicture.headshot, BUNDLED_HEADSHOT);
});

test('picture(): CMS media, a bundled file reference, or nothing', () => {
  assert.deepEqual(picture(media('x')), { image: media('x') });
  assert.deepEqual(picture({ $file: 'src/assets/about/family.jpg', alt: 'a' }), {
    file: 'src/assets/about/family.jpg',
  });
  assert.deepEqual(picture(null), {});
  assert.deepEqual(picture('nope'), {});
  assert.deepEqual(picture({ $file: '' }), {});
});

// ── The quarterly edit: rewriting the Currently block ────────────────────────
// This is the job the page exists to make easy: Nathan opens the admin, rewrites
// the four lists, bumps the date, publishes. The page must show exactly that.

test('rewriting the Currently block shows the new lists, date and freshness', async () => {
  const edited: Raw = {
    ...cmsEntry(),
    currently_updated: '2027-01-15T00:00:00.000Z',
    working_on: [{ text: 'A new site for a food pantry.' }],
    booking: [
      { label: 'Web design', status: 'limited', detail: 'Two slots left for spring.' },
      { label: 'Photography', status: 'open', detail: 'Booking the summer now.' },
      { label: 'Brand work', status: 'open', detail: 'Open all year.' },
    ],
    reading: [
      { title: 'Dune', author: 'Frank Herbert', note: 'again' },
      { title: 'Walden', author: 'Henry David Thoreau' },
    ],
    learning: [{ text: 'Aperture-priority shooting' }, { text: 'Container gardening' }],
  };
  const { d, logs } = deps(reader({ page: edited }));
  const about = await getAboutPage({}, { deps: d });
  assert.equal(logs.length, 0, 'an edit never trips the fallback');
  const c = about.currently;
  assert.equal(c.updated, '2027-01-15');
  assert.deepEqual(c.workingOn, ['A new site for a food pantry.']);
  assert.deepEqual(
    c.booking.map((b) => [b.label, b.status, b.detail]),
    [
      ['Web design', 'limited', 'Two slots left for spring.'],
      ['Photography', 'open', 'Booking the summer now.'],
      ['Brand work', 'open', 'Open all year.'],
    ],
  );
  assert.deepEqual(
    c.reading.map((r) => [r.title, r.author, r.note]),
    [
      ['Dune', 'Frank Herbert', 'again'],
      ['Walden', 'Henry David Thoreau', undefined],
    ],
  );
  assert.deepEqual(c.learning, ['Aperture-priority shooting', 'Container gardening']);
  // The pill and the stamp follow the date: ten days after the edit.
  const tenDaysLater = new Date('2027-01-25T12:00:00').getTime();
  assert.equal(freshnessLabel(c.updated, tenDaysLater), 'Updated 10 days ago');
  assert.equal(updatedLabel(c.updated), 'January 15, 2027');
});

test('Currently lists are capped at the layout slots and tolerate sloppy rows', () => {
  const entry: Raw = {
    ...cmsEntry(),
    working_on: [{ text: 'a' }, { text: '' }, { text: 'b' }, { text: 'c' }, { text: 'd' }],
    booking: [
      { label: 'One', status: 'weird', detail: 'x' },
      { label: '', status: 'open', detail: 'dropped: no label' },
      { label: 'Two', status: 'open', detail: 'y' },
    ],
    learning: [{ text: '1' }, { text: '2' }, { text: '3' }, { text: '4' }, { text: '5' }],
  };
  const c = normalizeAboutPage(entry).currently;
  assert.deepEqual(c.workingOn, ['a', 'b', 'c'], 'blank row dropped, cut to 3');
  assert.deepEqual(
    c.booking.map((b) => [b.label, b.status]),
    [
      ['One', 'open'],
      ['Two', 'open'],
    ],
    'an unknown status reads as open; a row without a label is dropped',
  );
  assert.equal(c.learning.length, 4, 'cut to 4');
});

test('an emptied Currently list makes the whole entry fall back rather than show a hole', async () => {
  const { d, logs } = deps(reader({ page: { ...cmsEntry(), reading: [] } }));
  const about = await getAboutPage({}, { deps: d });
  assert.equal(about.currently.reading.length, 3, 'the fallback has its three books');
  assert.match(logs[0], /could not be read as the expected shape/);
});

test('exactly three principles, a story, and a valid date are required', () => {
  assert.throws(
    () =>
      normalizeAboutPage({ ...cmsEntry(), principles: (aboutRaw.principles as Raw[]).slice(0, 2) }),
    /principles needs 3/,
  );
  assert.throws(() => normalizeAboutPage({ ...cmsEntry(), story_body: [] }), /story_body is empty/);
  assert.throws(
    () => normalizeAboutPage({ ...cmsEntry(), currently_updated: 'not a date' }),
    /currently_updated is not a date/,
  );
  assert.throws(
    () => normalizeAboutPage({ ...cmsEntry(), lighthouse_seo: 140 }),
    /lighthouse_seo is not 0 to 100/,
  );
  assert.throws(() => normalizeAboutPage({ ...cmsEntry(), heading: ' ' }), /heading is empty/);
});

test('Lighthouse scores come from the fields as whole numbers', () => {
  const about = normalizeAboutPage({
    ...cmsEntry(),
    lighthouse_performance: '95',
    lighthouse_accessibility: 100,
    lighthouse_best_practices: 98.6,
    lighthouse_seo: 0,
  });
  assert.deepEqual(about.lighthouse, {
    performance: 95,
    accessibility: 100,
    bestPractices: 98,
    seo: 0,
  });
});

// ── Dates and the freshness pill ─────────────────────────────────────────────

test('dayOf takes the day as written, whatever the time of day or zone', () => {
  assert.equal(dayOf('2026-10-01'), '2026-10-01');
  assert.equal(dayOf('2026-10-01T23:59:00.000Z'), '2026-10-01');
  assert.equal(dayOf('2026-10-01T00:00:00-08:00'), '2026-10-01');
  assert.equal(dayOf(new Date('2026-10-01T12:00:00Z')), '2026-10-01');
  assert.equal(dayOf(''), undefined);
  assert.equal(dayOf('yesterday'), undefined);
  assert.equal(dayOf(undefined), undefined);
});

test('freshnessLabel matches the pill the page showed before', () => {
  const at = (day: string) => new Date(`${day}T09:00:00`).getTime();
  assert.equal(freshnessLabel('2026-10-01', at('2026-10-01')), 'Updated today');
  assert.equal(freshnessLabel('2026-10-01', at('2026-10-02')), 'Updated yesterday');
  assert.equal(freshnessLabel('2026-10-01', at('2026-10-03')), 'Updated 2 days ago');
  assert.equal(freshnessLabel('2026-10-01', at('2026-10-20')), 'Updated 3 weeks ago');
  assert.equal(freshnessLabel('2026-10-01', at('2027-01-01')), 'Updated 3 months ago');
  assert.equal(freshnessLabel('2026-10-01', at('2026-12-01')), 'Updated 2 months ago');
  assert.equal(freshnessLabel('2026-10-01', at('2025-01-01')), 'Updated today', 'never negative');
});

test('updatedLabel is the long US date', () => {
  assert.equal(updatedLabel('2026-10-01'), 'October 1, 2026');
});

// ── Title ────────────────────────────────────────────────────────────────────

test('aboutTitle adds the studio name once', () => {
  assert.equal(aboutTitle('About', 'Nixon Creative Studio'), 'About | Nixon Creative Studio');
  assert.equal(
    aboutTitle('About Nixon Creative Studio', 'Nixon Creative Studio'),
    'About Nixon Creative Studio',
  );
});

// ── JSON-LD: byte-equal to what /about emitted before this PR ────────────────
// The expected object is the Person schema as about.astro built it on main (the
// literal job title, the site settings' name, URL and social links). The key order
// matters: it is the order the page emitted.

const SITE = {
  url: 'https://nixoncreativestudio.com',
  ownerName: 'Nathan Nixon',
  social: {
    instagram: 'https://www.instagram.com/nixoncreativestudio/',
    linkedin: 'https://www.linkedin.com/in/nathanjnixon/',
  },
};
const siteFallback = fallbackFromFiles({ site_settings: readJson('site_settings') });

test('the Person JSON-LD is byte-equal to the page before the move', async () => {
  const { d } = deps(reader({}));
  const about = await getAboutPage({}, { deps: d });
  const site = siteFallback.entry('site_settings', 'site') as Raw;
  const built = buildPersonSchema(about, {
    url: SITE.url,
    ownerName: site.owner_name as string,
    social: {
      instagram: site.instagram_url as string,
      linkedin: site.linkedin_url as string,
    },
  });
  const before = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${SITE.url}/about/#person`,
    name: 'Nathan Nixon',
    jobTitle: 'Founder, Designer, Developer, Photographer',
    worksFor: { '@id': `${SITE.url}#organization` },
    url: `${SITE.url}/about/`,
    sameAs: [site.instagram_url, site.linkedin_url],
  };
  assert.equal(JSON.stringify(built), JSON.stringify(before));
});

test('the Person JSON-LD follows the job title field', () => {
  const about = normalizeAboutPage({ ...cmsEntry(), job_title: 'Owner and Designer' });
  const built = buildPersonSchema(about, SITE);
  assert.equal(built.jobTitle, 'Owner and Designer');
  assert.equal(built['@id'], 'https://nixoncreativestudio.com/about/#person');
});
