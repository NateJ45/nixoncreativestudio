# E: Conversion and discoverability audit

Date 2026-10-03. Live site https://nixoncreativestudio.com fetched with curl (HTML saved, head tags and JSON-LD parsed) and driven with an isolated Playwright Chromium at 1440x900 and 390x844 touch. Nothing was submitted (the empty-submit test was blocked by HTML validation: 7 invalid fields, no request). Screenshots: `E-shots/` (`*-fold.png` per page and viewport, `mob-menu-open.png`, `mob-contact-fold.png`). The `*-full.png` files show blank bands because reveal-gated sections do not render in full-page captures; use the fold shots.

Earlier critiques (2026-06-19, 2026-06-21) were about visuals and AI tells. This audit adds only conversion and search findings.

## Searches run

- "Cincinnati web design": winners are dedicated city landing pages by agencies (CyberOptik, Hook, BigDrop, CodeWCG) plus listicles and directories (DesignRush, OneLittleWeb). CyberOptik's page has a city-in-title H1, services, process, industries, 6-question FAQ, named testimonials, counts (750+ sites), "Get a Proposal" repeated, no price.
- "church website design Cincinnati": no Cincinnati studio ranks. Winners are national or other-state vendors with an industry page (TL Web Design "Web Design for Churches in Ohio": a price floor $1,497, features list, 4.9 stars, "40% more giving" proof, FAQ, phone and a "free strategy session" CTA) and Pushpay-style guides.
- "nonprofit website designer Cincinnati": directories (Semrush Agency Partners, DesignRush) and a Michigan vendor with city pages for every Ohio town (AppWT, from $3,497).
- "Cincinnati event photographer": marketplaces (Snappr, Thumbtack, Peerspace, Giggster, Fash) and a few solo photographers' pages.
- "nixoncreativestudio.com Nixon Creative Studio Cincinnati" and "site:nixoncreativestudio.com": nothing from this domain. The search tool is a weak index check, so treat as "no evidence of ranking, verify in Search Console", not as proof of non-indexing.

Page types that win: city plus service landing pages, industry landing pages with a price and proof numbers, directories. Nathan has one generic home page and one services page.

## Funnel (text)

```
Google "Cincinnati web design" / "church website Cincinnati" / "nonprofit website designer" / "Cincinnati photographer"
   -> (no matching landing page; lands on / or /services/ if at all)
Referral link (usually / or a case study)
   |
   v
/  (hero CTA "Start a project" in first fold, desktop and mobile)  ---- 1 click ---> /contact/
/services/ /work/ /about/ /photography/ /journal/ /work/<slug>/
   desktop: header "Start a project" visible in fold ------------ 1 click ---> /contact/
   mobile: no CTA in fold. Sticky header has only a hamburger. Hamburger tap -> "Start a project" = 2 taps
           (or scroll: first body CTA at y=10,949 of 12,169 on /services/, 8,797 of 10,017 on a case study)
   |
/contact/  10 visible fields, 5 required (name, email, org type, budget, 30+ char message)
   submit button at y=1,747 on mobile (about 2 screens of form)
   |
Web3Forms POST -> inline "Thanks, your message is in" (no /thanks/ URL, no analytics event)
```

Counts: referral to sent inquiry from the home page is 2 clicks (CTA, Send) desktop and mobile. From /services/ or a case study: 2 clicks desktop, 3 taps mobile. Page load to interactive in the test: about 2.6 to 3.4 s per page (networkidle-free load plus 2.5 s settle; `ms` in my probe includes that wait, so real load is faster). Estimated time to a sent inquiry for a motivated buyer: about 3 to 5 minutes (typing 30+ chars, 5 required choices); the form, not the navigation, is the main cost.

## Findings

Contact form: asks name, email, phone, org, org type, current site, budget, timeline, description, how-heard. Budget and org type are required decisions before sending. Budget has "Not sure yet", which is good. Timeline and phone optional. No calendar link and no "book a 30-minute call" path, though the process promises a half-hour call. Thank-you state is JS-only, so Cloudflare Web Analytics cannot count a conversion (only `cloudflareinsights` beacon found, no GA or Plausible event).

CTA wording: every CTA is "Start a project" (home 3, services 1 header plus 1 bottom). It assumes the buyer has a project; "Say hello" appears only on /journal/. Case study CTA is `/contact?org_type=church` (preselects org type, good) but lacks the trailing slash, so each click takes a 301 hop (verified: 301 to `/contact/?org_type=church`). The same no-slash `/contact` is in the CtaBanner on services, about, work, photography, journal (violates never-break rule 8). Pricing tiers on home and services have no per-tier CTA.

Case studies (9): all have brief, approach, what we built, what changed, a designer's note, previous/next, and a CTA at the very bottom. Only Stone Steps has numbers, and those are data facts (since 2003, 1:58:36), not business outcomes. No case study states an outcome number (inquiries, load time, hours saved) or a client quote in the extracted text. The PRODUCT.md-cited Crestview "doubled visit-planning form submissions" is absent from /work/. The CTA sits after about 6,000 characters with no mid-page CTA.

Pricing: clear and strong (Launch from $4,000, Signature from $7,000, Flagship from $12,000, photography from $900, strategy $500 to $2,000, care plan $100/mo, FAQ, payment plans). Defect: Service JSON-LD says Strategy minPrice 1500 while the page says $500 to $2,000.

Local SEO, live head tags:

- Home title "Nixon Creative Studio | Strategy-led design and photography": no Cincinnati, no "web design". H1 "I make websites that pull their weight." has no city or service noun. Only 8 mentions of Cincinnati on home, none in H1/title.
- Titles on every page are "Page | Nixon Creative Studio" with no keywords. Meta descriptions exist and are unique, but /about/, /contact/ and /work/ are generic ("Get in touch about a web design, brand, or photography project").
- Case study titles are just the client name; descriptions are good prose but no "church website" or city in titles. Case studies for churches in Chicago, Muncie, Orangeburg are out-of-region, which dilutes "Cincinnati" proof; the local work (Stone Steps, Presbyterian Academy of Cincinnati) is there.
- JSON-LD: Organization+LocalBusiness on every page with @id, address (city/region only), telephone, sameAs, areaServed. Missing: `image`/`logo`, `priceRange`, `geo`, street/postal code, `hasMap`, `ProfessionalService` type, `knowsAbout`, `serviceType`, reviews. Person on /about/. Service x3 and FAQPage on /services/. Case studies use `["Article","CreativeWork"]` (reasonable). No BreadcrumbList.
- NAP: phone (256) is an Alabama area code on a Cincinnati business; consistent across footer, contact, JSON-LD. No street address (acceptable for a home studio; set a service-area business profile). No Google Business Profile or Maps link anywhere on the site.
- No location or industry landing pages (church, nonprofit, school, small business, event photography). Homepage text mentions all four audiences but no page targets any of them.
- Sitemap: index with case_studies, posts (empty), pages. `/coming-soon/` is in the sitemap and should not be. Case study `lastmod` is fine. Pages list has no lastmod. robots.txt allows all and points to the sitemap. OG image per page (`/og/*.png`) and twitter card present; no `og:image:alt`.
- Thin pages in nav and sitemap: /photography/ shows only "The photography portfolio is coming together" (empty gallery, a hero and CTA); /journal/ shows "The first entry is being drafted." Both are indexable thin pages and dead ends for the Cincinnati photographer query.
- Internal linking: home links to all 9 case studies; the case studies link back only to prev/next and a generic CTA. No case study links to /services/ or its related service; /about/ has one link. Main nav omits Photography and Journal (only reachable from the footer or inline).

Dead ends: /photography/ and /journal/ (empty states), the case study page after the CTA (no related-service link).

## Ranked fix list

| #   | Fix                                                                                                                                                                                                                                         | Impact                 | Effort | Expected effect                                                                                              | Where                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------ | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| 1   | Add a sticky or fold-level mobile CTA (a "Start a project" button beside the hamburger or a bottom bar) on every page                                                                                                                       | High                   | S      | Mobile visitors on inner pages currently need 2 taps or ~9,000 px of scroll; likely the largest inquiry leak | `Header` / `MobileNav.tsx`                                                             |
| 2   | Rewrite home title, H1 and meta to include "Cincinnati web design" plus audiences, e.g. title "Cincinnati Web Design for Churches, Schools and Nonprofits                                                                                   | Nixon Creative Studio" | High   | Ranking for query family 1 and 2; today no page contains the target phrase in title or H1                    | Home page CMS entry (`page_home`, SEO title/description)                               |
| 3   | Build 4 landing pages: `/church-websites-cincinnati/`, `/nonprofit-web-design-cincinnati/`, `/school-websites/`, `/cincinnati-event-photography/`, each with H1, price floor, 2 to 3 relevant case studies, FAQ, CTA with `org_type` preset | High                   | L      | These are the page types that win the four query families                                                    | New routes in `src/pages`, `tests/routes.ts`, sitemap, new CMS singleton pages         |
| 3b  | Fill /photography/ or noindex it until it has images; link it from the main nav only when real                                                                                                                                              | High                   | M      | Removes a thin-page dead end for the photographer query                                                      | Photography page CMS entry, photos collection                                          |
| 4   | Add one outcome line and one number to each case study (inquiries, load time, hours saved, or a client quote), restore the Crestview figure, add a mid-page CTA and a "more church/school work" link                                        | High                   | M      | Moves visitors from "pretty" to "proved"; gives a CTA near the proof                                         | `case_studies` entries in EmDash admin; `src/pages/work/[slug].astro` for mid-page CTA |
| 5   | Add a "Book a 30-minute call" link (calendar) beside the form and in the final CTA                                                                                                                                                          | Med                    | S      | Lower-effort path for buyers who will not write 30 characters; matches the process promise                   | `page_contact`, CtaBanner                                                              |
| 6   | Shorten the form: make budget optional or move it after a first send; keep name, email, message                                                                                                                                             | Med                    | S      | Fewer required decisions before sending (now 5); budget is already clear on the page                         | `contact.astro`, `page_contact` lists                                                  |
| 7   | Fix `/contact` no-slash links (CtaBanner on 5 pages, case study CTA) with `withTrailingSlash()`                                                                                                                                             | Med                    | S      | Removes a 301 per click, restores rule 8                                                                     | `CtaBanner.astro`, `work/[slug].astro`                                                 |
| 8   | Add a thank-you URL or a dataLayer/Cloudflare Web Analytics custom event on a successful send                                                                                                                                               | Med                    | S      | Without it no inquiry can be attributed to a page or source; the "how heard" field is the only signal        | Contact form script                                                                    |
| 9   | Vary CTA wording by context: "Plan your church website", "Ask about pricing", "Book a photo day"; add a CTA under each pricing tier                                                                                                         | Med                    | S      | Lifts clicks on pricing and service sections                                                                 | PricingTeaser, services page CMS                                                       |
| 10  | Create and link a Google Business Profile (service-area business, Cincinnati), put its Maps link in the footer and `sameAs`; collect 3 reviews                                                                                              | Med                    | M      | Local pack for "Cincinnati photographer" and brand search; Nathan-only task                                  | Footer, JSON-LD (`site.ts`), GBP                                                       |
| 11  | Improve JSON-LD: add `logo`, `image`, `priceRange`, `knowsAbout`, `ProfessionalService`, BreadcrumbList; fix Strategy minPrice 1500 vs visible $500; consider a Cincinnati-area phone number                                                | Med                    | S      | Cleaner rich results, consistent NAP; Alabama (256) number weakens local signal                              | `src/lib/*` schema builders, services CMS                                              |
| 12  | Remove `/coming-soon/` from the sitemap; add lastmod to page URLs                                                                                                                                                                           | Low                    | S      | Hygiene                                                                                                      | sitemap config in `astro.config.mjs`                                                   |
| 13  | Distinct titles and descriptions for /work/, /about/, /contact/, and case studies (add type and city: "Church website case study, Chicago")                                                                                                 | Low                    | S      | Better snippets and long-tail terms                                                                          | CMS page entries, case study SEO fields                                                |
| 14  | Add Photography and Journal to nav only when populated; link each case study to its related service                                                                                                                                         | Low                    | S      | Internal link equity and fewer dead ends                                                                     | `site.ts` menu, `work/[slug].astro`                                                    |

## Already good

- Pricing is published with tiers, floors, "most land between" ranges, payment plans, FAQ with a cost answer, and Service plus FAQPage JSON-LD.
- Desktop CTA is in the fold on every page; the home hero has two CTAs. Mobile home has a hero CTA.
- Hamburger menu holds the CTA, email and tap-to-call; the form has honeypot, "Not sure yet" budget, an "email me instead" fallback and a clear "what happens next".
- Case study CTA preselects `org_type`; each case study has brief, approach, build and outcome, plus previous/next.
- Unique titles, descriptions, canonicals and per-page OG cards on every page; sitemap index and robots.txt correct; Organization/LocalBusiness and Person JSON-LD present; fast responses (home 0.12 s from curl).
- Honest voice and a clear four-step process.

## Unverified

- Actual Google indexing and rankings (no Search Console access; the search tool returned nothing for the domain).
- Whether form submission works end to end (not submitted by instruction).
