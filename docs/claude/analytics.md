# Measuring the site

Read this when you want to know how the site is doing, or before you add or rename an event.
There are three sources, and each answers a different question.

## 1. Inquiries in D1: "which channel brings real leads?"

Every contact form send is stored in D1 (`nixoncreativestudio-contact`) before it is emailed.
Since 2026-11-10 each one also carries where that person **first** found the site, from
`src/lib/attribution.ts`:

| Field              | What it holds                                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `lead_source`      | one label: a `utm_source`, or `search-google`, `ai-chatgpt.com`, `social-instagram`, `referral-<host>`, `direct` |
| `first_referrer`   | the hostname that sent them on the first visit (never the full URL)                                              |
| `first_landing`    | the first page they saw                                                                                          |
| `utm_*`            | campaign tags from that first link                                                                               |
| `days_since_first` | days between that first visit and the send                                                                       |
| `pages_seen`       | pages viewed in the visit that sent the form                                                                     |

They are folded into the stored `message` as `Label: value` lines (`src/lib/inquiry.ts`) and shown
in the email under "Where they came from". Pull them out with:

```
npx wrangler d1 execute nixoncreativestudio-contact --remote --command "SELECT id, received_at, substr(message, instr(message, 'First found the site via:'), 60) AS source FROM contact_submissions ORDER BY id DESC LIMIT 50"
```

The note lives in the visitor's localStorage (`ncs-first-touch`), first touch wins, and a new
tagged visit after 90 days replaces it. /privacy describes it.

Tag every link you post yourself so it shows up by name: Instagram bio
`?utm_source=instagram&utm_medium=bio`, LinkedIn `?utm_source=linkedin&utm_medium=social`, email
signature `?utm_source=email-signature&utm_medium=email`, proposals
`?utm_source=proposal&utm_medium=pdf`.

The form also asks "How did you hear about me?", now with an "AI assistant" answer (`ai`) so
AI search (ChatGPT, Claude, Perplexity) shows up even when the referrer is stripped.

## 2. GA4 (property 532519109): "what do visitors do?"

Events, all sent through `track()` in `src/lib/track.ts` (a no-op off production and in test
browsers):

| Event               | When                                                 | Parameters                                                                                                                                    |
| ------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `generate_lead`     | the contact form went through (key event)            | `lead_source`, `landing_page`, `org_type`, `budget`, `timeline`, `heard_from`, `runs`, `value` + `currency` (floor of the chosen budget band) |
| `inquiry_start`     | first answer typed or picked                         | `form`                                                                                                                                        |
| `inquiry_step`      | a question reached going forward                     | `step_number`, `step_name`                                                                                                                    |
| `inquiry_error`     | a send failed                                        | `error_type`                                                                                                                                  |
| `contact_click`     | a mailto, sms or tel link, or Copy email (key event) | `method` (`mailto`, `text`, `call`, `copy`), `cta_location`                                                                                   |
| `book_call_click`   | the calendar link (key event)                        | `cta_location`                                                                                                                                |
| `visit_client_site` | a link out to a client's live site                   | `link_domain`, `cta_location`                                                                                                                 |
| `pricing_view`      | a pricing block came into view                       | `pricing_variant`                                                                                                                             |
| `tool_use`          | first touch of one of the site's tools, per page     | `tool_name`, `tool_result`                                                                                                                    |
| `cta_click`         | any other `data-cta`                                 | `cta_id`, `cta_location`                                                                                                                      |

`tool_name` comes from the `TOOLS` table in `src/lib/track.ts` (draw_card, first_sunday,
tier_picker, fit_quiz, live_receipt, cost_compare, faq, work_filter and so on). A new tool gets a
row there. Every parameter above is registered as an event-scoped custom dimension in GA4, so it
can be used in Explorations. A new parameter needs registering too (Admin > Custom definitions),
and a line on /privacy.

Useful views in GA4:

- **Funnel exploration**: `inquiry_start` > `inquiry_step` (step_name = budget) > `inquiry_step` (step_name
  = check) > `generate_lead`. Shows which question loses people.
- **Free form**: rows `lead_source` or the "Channels with AI" custom channel group (AI assistants sits above Referral; GA's default group has its own "AI Assistant" channel below Referral, which misses some), values key events
  and `value`. The AI channel group splits ChatGPT, Perplexity and friends out of Referral.
- **Events > tool_use** broken down by `tool_name`: which toys earn their place.

## 3. The visitor trail: "what did this person read before they wrote?"

Every real visitor's browser gets an anonymous id (`ncs-vid` in localStorage, made by
`src/components/analytics/TrailHead.astro` in the head). `src/lib/trail.ts` sends one small beacon
per page view to `POST /api/trail/` (`src/trail-endpoint.ts`, a `run_worker_first` path like the
contact endpoint), again whenever the tab is hidden or left; the Worker upserts on (visit, page),
so the last send wins. Table `trail_pages` in the same D1 database
(`migrations/0003_visitor_trail.sql`):

| Column                        | What it holds                                                                                                                                                                      |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `visitor_id`, `visit_id`      | the anonymous ids; a visit ends after 30 minutes without a page view                                                                                                               |
| `page_index`, `path`, `title` | the page, in order within the visit                                                                                                                                                |
| `visit_source`                | on a visit's first page only: a `lead_source` label for this visit (`search-google`, `social-instagram`)                                                                           |
| `engaged_ms`, `scroll_pct`    | time the page was visible and in use (stops after 30s idle), furthest scroll                                                                                                       |
| `events`                      | JSON labels: every `track()` event (`tool:tier_picker`, `form:budget`), `click:<button words>` for buttons and FAQ questions opened, `search:<words>` typed into the Ctrl+K search |
| `city`, `region`, `device`    | from Cloudflare and the user agent ("iPhone, Safari"); never the IP                                                                                                                |

The contact form sends the id as `visitor_id` (stored on `contact_submissions`), flushing the
current page first, and the inquiry email gets a **Before they wrote** section
(`src/lib/visitor-profile.ts`): first seen and from where, visits and reading time, each later
visit's source, site searches, what they used, device and place, the pages they spent longest on,
and visit by visit. A daily cron (`17 7 * * *`, `pruneTrails`) deletes trails older than 13 months
that never became a lead.

Same rules as GA4 for who counts: production hostname only, never WebDriver or headless browsers
(Playwright forces it with `window.__ncsTrailForce`, `tests/trail.spec.ts`). Nothing typed into the
contact form is ever read.

**Mark your own browsers:** open `https://nixoncreativestudio.com/?me=1` once on each phone and
computer. That browser then sends nothing: GA4 is switched off with `ga-disable-<id>`, and the trail
and Clarity skip it. `?me=0` undoes it.

Useful queries:

```
npx wrangler d1 execute nixoncreativestudio-contact --remote --command "SELECT path, COUNT(*) views, ROUND(AVG(engaged_ms)/1000) avg_s, ROUND(AVG(scroll_pct)) avg_scroll FROM trail_pages WHERE started_at > date('now','-30 day') GROUP BY path ORDER BY views DESC LIMIT 25"
npx wrangler d1 execute nixoncreativestudio-contact --remote --command "SELECT value AS label, COUNT(*) n FROM trail_pages, json_each(trail_pages.events) WHERE value LIKE 'search:%' GROUP BY value ORDER BY n DESC LIMIT 30"
npx wrangler d1 execute nixoncreativestudio-contact --remote --command "SELECT visitor_id, COUNT(DISTINCT visit_id) visits, MAX(started_at) last FROM trail_pages GROUP BY visitor_id HAVING visits > 1 ORDER BY last DESC LIMIT 20"
```

The same visitor id goes to GA4 as `user_id` (Explore > User explorer finds a lead) and to Clarity
as its custom id.

## 4. Microsoft Clarity: "where do people get stuck?"

Session recordings, heatmaps, rage and dead clicks (`src/components/analytics/Clarity.astro`, only
when `PUBLIC_CLARITY_ID` is set). Production hostname, real browsers, not before the first
interaction or 6 seconds after load, never with Global Privacy Control or `?me=1`. The contact form
has `data-clarity-mask`. Each session carries the visitor id (Recordings > Filters > Custom user ID)
and tags `first_landing`, `first_source`. With `CLARITY_ID` set on the Worker, the inquiry email
links to the recordings.

## 5. Search Console: "how do people find it?"

Queries, impressions and positions for nixoncreativestudio.com. Linked to GA4, so Reports >
Search Console shows queries next to landing pages. The `ncs-studio:search-console` skill reads
it. Bing Webmaster Tools (set up 2026-11-10 by GSC import) matters as well: Bing's index feeds ChatGPT search and Copilot.

## Findability (SEO, GEO, AEO), what is in place

- Titles carry the phrases people search: "Cincinnati web design", "church website design",
  "website design pricing". Sector titles live in `src/data/sector-pages.ts`.
- One connected JSON-LD `@graph` per page (`src/lib/schema.ts`): ProfessionalService +
  LocalBusiness with `knowsAbout`, Person with headshot and `knowsAbout`, Offers with real prices,
  FAQPage on /services, CreativeWork per case study, breadcrumbs.
- `/llms.txt` for AI tools: who, prices, studies, plus "good fit" and "common questions" blocks
  built from `site.ts` and `pricing.ts`.
- robots.txt names and allows the AI crawlers.
- Cloudflare Crawler Hints is on (since 2026-04-11), so changed pages are pinged to Bing and
  others through IndexNow.
- Google Business Profile (studio Google account): services and prices match `src/data/pricing.ts`
  as of 2026-11-10; update both together. Its website link carries
  `utm_source=google&utm_medium=organic&utm_campaign=gbp`, so profile leads show as `google` in
  `lead_source`. Reviews are the open item (docs/PENDING.md 0b).
