# Landing pages brief: church, nonprofit, school, event photography

Written 2026-10-04 by the content agent for a later agent that builds the pages. Source: E's ranked fix #3 (`E-conversion-seo.md`), D's proof gap list and honest limits (`D-copy-positioning.md`), the committed prices in `cms/content/`. Content only: no route, template or CMS collection exists for these yet. Building them needs a new route per page in `src/pages`, a line in `tests/routes.ts`, a line in the sitemap `customPages` in `astro.config.mjs`, a `lighthouserc.json` URL and a `generate-og.mjs` entry (see the memory note on page-list configs), and, if the words should be editable, a CMS collection (a `page_landing` list keyed by slug is the natural shape).

## Rules for every page

- **Only proven facts.** Every claim below is marked with its source. Do not add a number, a quote, a client or an outcome that is not in this file or in D's proof table marked "Proven". Never use the Crestview form-submissions figure (no source exists), any testimonial (none exists), "most projects land at $7k to $11k" (never transacted), or "sites that score 100" in general (only accessibility 100 is gated).
- **Work that is not live is not proof.** Second Presbyterian Chicago (built, not launched), Presbyterian Academy (in progress, placeholder content) and First Baptist Church Muncie (finished, launching soon) may appear only with their status label, never as "live" or with an outcome.
- Voice: first person singular, warm and plain, no em-dashes, no banned words (CLAUDE.md "Working with Nathan").
- Prices come from the CMS (`getPricingTiers()`, `getPricingAddons()`, `getServiceOfferings()`), never typed into the template, so a price edit moves every page. The figures below are today's values for the copy.
- CTA: `/contact/?org_type=<sector>` with the trailing slash (rule 8). Valid sectors: `church`, `school`, `nonprofit`, `small-business`.
- Each page carries a `Service` and a `FAQPage` JSON-LD block (shape: `buildServiceSchemas()` in `src/lib/servicesPage.ts`, `provider` pointing at `https://nixoncreativestudio.com#organization`), plus a `BreadcrumbList` (Home, then the page).

## Today's price floors (from `cms/content/`)

| Item                | Floor                                     | Source                   |
| ------------------- | ----------------------------------------- | ------------------------ |
| Launch website      | from $4,000 (typically $4,000 to $6,500)  | `pricing_tiers.json`     |
| Signature website   | from $7,000 (typically $7,000 to $11,000) | `pricing_tiers.json`     |
| Flagship website    | from $12,000                              | `pricing_tiers.json`     |
| Strategy on its own | from $1,500 (included in every website)   | `service_offerings.json` |
| Photography         | half day from $900, full day about $1,200 | `pricing_addons.json`    |
| Care plan           | from $100 a month, optional               | `pricing_addons.json`    |

## 1. Church websites (`/church-websites-cincinnati/`)

- **Title (max 60):** "Church Website Design in Cincinnati | Nixon Creative Studio" (the studio name is appended by the title helper if the stored title omits it).
- **H1:** "Church websites a volunteer can keep current."
- **Meta description:** "Church websites planned, designed and built by one person in Cincinnati: service times entered once, staff who edit pages themselves, prices published from $4,000."
- **Outline:** hero (H1, one sentence, CTA "Plan your church website"); what a church site needs (service time and address entered once so they never disagree; staff edit pages in place with a preview; old links and posts kept when moving off Wix or Squarespace); proof; price; FAQ; CTA.
- **Proof (honest):** First Baptist Church Muncie, labelled **Launching soon**: 142 posts carried across from Wix at their original addresses; staff edit pages in place with a live preview; the service time, address and main links entered once; the design drawn from the church's own building (source: `clients/fbcm` README and PRODUCT.md, vault `first-baptist-muncie`). Second Presbyterian Chicago may appear only as "the church reference build, not launched". **Gap:** there is no live custom church site yet. Recommend building this page after the FBCM cutover, or launching it with FBCM labelled honestly and no outcome claims.
- **Price:** Launch from $4,000 for most churches; Signature from $7,000 for a church with events, ministries and a content library.
- **FAQ (true answers only):** "What does it cost?" (the floors above, payment plans available); "Can our volunteers update it?" (yes: editing in place, a written guide at handoff); "What happens to our old posts and links?" (moved at their original addresses, as on FBCM); "Do you work with churches outside Cincinnati?" (yes for web work; photography stays regional).
- **JSON-LD draft:**

```json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "Church website design",
  "serviceType": "Web design",
  "provider": { "@id": "https://nixoncreativestudio.com#organization" },
  "areaServed": ["Greater Cincinnati region", "United States"],
  "audience": { "@type": "Audience", "audienceType": "Churches" },
  "offers": {
    "@type": "Offer",
    "priceSpecification": {
      "@type": "PriceSpecification",
      "minPrice": 4000,
      "priceCurrency": "USD"
    }
  }
}
```

## 2. Nonprofit web design (`/nonprofit-web-design-cincinnati/`)

- **Title:** "Nonprofit Web Design in Cincinnati | Nixon Creative Studio"
- **H1:** "Nonprofit websites that keep their own facts straight."
- **Meta description:** "Websites for Cincinnati nonprofits and event organizers, built so each fact is entered once and stays right without a webmaster. Prices published from $4,000."
- **Outline:** hero; the one thing (each fact entered once, so the site never contradicts itself); proof; what you get at handoff (an editor your team can use, a written guide, you own the site); price; FAQ; CTA "Ask about a nonprofit site".
- **Proof (all proven in D's table):** Stone Steps 50K: 2,188 checked finishes from 2003 to 2025, records calculated from them, a nightly import the morning after a race, the climb measured by LiDAR at about 5,200 ft (vault `stone-steps-50k`, the live case study). Foundation for Reformed Theology: a recorded Lighthouse 100 in all four categories on 2026-09-17 and a font payload cut 34% (282 KB to 186 KB) (vault `foundation-reformed-theology`). Theology Matters: an AI-narrated audio version (ElevenLabs) on every article (vault `theology-matters`). Do not cite FRT's traffic rise: it is on record but not attributable to the build.
- **Price:** Launch from $4,000; Signature from $7,000 for a content-heavy site.
- **FAQ:** "What does it cost?"; "Who keeps it up to date after launch?" (your team, with the editor and guide; optional care plan from $100 a month); "Do we own it?" (yes, outright); "Is it accessible?" (custom-coded builds are checked against WCAG AA on every change).
- **JSON-LD:** as the church draft, with `"name": "Nonprofit web design"` and `"audienceType": "Nonprofit organizations"`.

## 3. School websites (`/school-websites/`)

- **Title:** "School Website Design | Nixon Creative Studio"
- **H1:** "School websites your office can run, with a plan for who runs them next."
- **Meta description:** "School websites planned, designed and built by one person in Cincinnati, handed over with an editor, a written guide and backups. Prices published from $4,000."
- **Outline:** hero; continuity first (D: schools ask "what if you disappear"; answer with the handoff guide, backups, you own the site, the optional care plan); what the site does (tuition and term dates entered once, staff edit in place); proof; price; FAQ; CTA "Plan your school website".
- **Proof:** **none public today.** Presbyterian Academy is in progress with placeholder faculty, tuition and term content (vault `presacademy`, 2026-10-03) and must not be cited as proof. West Chester Preschool is not public (the board declined the cutover; written permission and a demo URL are needed). Recommend holding this page until the Academy launches with confirmed content, or until Nathan has permission to show the WCP build.
- **Price:** Launch from $4,000; Signature from $7,000.
- **FAQ:** "What if you are not around next year?" (the handoff guide, backups, the site is yours, any developer can pick it up; care plan optional); "Can we publish tuition?" (yes, many schools do on purpose); "What does it cost?".
- **JSON-LD:** as the church draft, with `"name": "School website design"` and `"audienceType": "Schools"`.

## 4. Event photography (`/cincinnati-event-photography/`)

- **Title:** "Cincinnati Event Photography | Nixon Creative Studio"
- **H1:** "Event photography in Cincinnati, shot for the web."
- **Meta description:** "Event, portrait and space photography for Cincinnati organizations, from $900 for a half day, often paired with the website I am building."
- **Outline:** hero; what is covered (events, team headshots, spaces; regional only); how it pairs with web work; a gallery; price; FAQ; CTA "Book a photo day" (`/contact/` with no org preset, or the matching sector).
- **Proof:** **the gallery is the proof, and it does not exist yet.** The /photography page is empty (D, E). This page must not ship without 12 to 20 real frames from client or community shoots, used with permission (a Nathan-only task). Until then it is a thin page that would hurt more than help.
- **Price:** half day from $900, full day about $1,200 (`pricing_addons.json`).
- **FAQ:** "Where do you shoot?" (the greater Cincinnati region); "How fast do we get the photos?" (Nathan to supply a real turnaround; do not invent one); "Do you only shoot for your web clients?" (no, photo days are booked on their own too).
- **JSON-LD:** `Service` with `"name": "Event photography"`, `"areaServed": "Greater Cincinnati region"`, `minPrice` 900.

## Order to build

Nonprofit first (the only segment with three proven, live case studies), then church after the FBCM cutover, then school and photography once their proof exists. Each page links back to `/services/` and to the case studies it cites, and each cited case study should link to its landing page (E #14).
