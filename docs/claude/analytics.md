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

## 3. Search Console: "how do people find it?"

Queries, impressions and positions for nixoncreativestudio.com. Linked to GA4, so Reports >
Search Console shows queries next to landing pages. The `ncs-studio:search-console` skill reads
it. Bing Webmaster Tools matters as well: Bing's index feeds ChatGPT search and Copilot.

## Findability (SEO, GEO, AEO), what is in place

- Titles carry the phrases people search: "Cincinnati web design", "church website design",
  "website design pricing". Sector titles live in `src/data/sector-pages.ts`.
- One connected JSON-LD `@graph` per page (`src/lib/schema.ts`): ProfessionalService +
  LocalBusiness with `knowsAbout`, Person with headshot and `knowsAbout`, Offers with real prices,
  FAQPage on /services, CreativeWork per case study, breadcrumbs.
- `/llms.txt` for AI tools: who, prices, studies, plus "good fit" and "common questions" blocks
  built from `site.ts` and `pricing.ts`.
- robots.txt names and allows the AI crawlers.
- Not yet on: Cloudflare Crawler Hints (IndexNow pings to Bing when pages change), Bing Webmaster Tools and a Google Business Profile. See docs/PENDING.md item 0b.
