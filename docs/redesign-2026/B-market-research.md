# B. Market research for the NCS redesign

Date of capture: 2026-10-03/04. Researcher: market-research agent B (read-only; no forms filled, nothing submitted).

Method in one paragraph: each site below was opened in a private Playwright Chromium context, once at 1440x900 and once at 390x844 (mobile emulation, 2x), and the first viewport was saved as a PNG in `B-shots/`. Naming: `<slug>-d.png` (desktop) and `<slug>-m.png` (mobile). I looked at every desktop shot and 14 of the mobile shots (marked M below); the other mobile shots were captured the same way but I did not inspect them one by one. For most mission-driven sites I also opened the pricing, portfolio or one case-study page and read the headings. Load numbers (LCP, transfer size, request count) were measured on this PC with no network throttling, so treat them as relative, not as field data.

Honest limits:

- "Sites that win work" cannot be verified from outside. I used proxies: stated client counts, years in business, and whether a buyer-facing structure exists. No site below gave me revenue or win-rate data.
- Sunday Best (a leading church web specialist) would not load (connection timeout, then a certificate name error), so it is not in the set. Its prices come only from a search summary and are marked unverified.
- True solo designers who also serve churches and nonprofits and publish good case studies were hard to find. The "small studio" group below is mostly 1 to 5 person shops with thin portfolios. That gap is itself a finding: a solo with real case studies and a price would stand out.
- Mission Web Agency started returning a bot check ("Checking your browser") after my first visit, so its pricing and case-study pages were not read and its load numbers are missing.

---

## 1. Sites opened (32 with screenshots; 24 buyer-relevant, 8 ceiling)

### 1a. Mission-driven and local-market sites (22)

| Slug (shots)      | URL                                | Serves                                                      | What it does well (observed)                                                                                                                                                                                                                                                                                                               |
| ----------------- | ---------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| constructive (M)  | https://constructive.co            | Nonprofits, foundations (national)                          | Hero is a collage of real client sites and brand boards under a plain statement. Case studies come straight after the hero. Contact form asks budget bands and "how did you hear about us" including an AI search option. Weak: 8.4 MB page.                                                                                               |
| mighty-citizen    | https://www.mightycitizen.com      | Associations, higher ed, nonprofits, government             | Clear "who we help" nav, one green Contact button, real laptop mockup of a university site in the first viewport. Wave divider is template-y.                                                                                                                                                                                              |
| kanopi            | https://kanopi.com                 | Higher ed, healthcare, nonprofits                           | Mission line plus named clients (Gilder Lehrman, UCSF, PEN America) scrolling in. Dark green hero wastes the first viewport on a theatre photo.                                                                                                                                                                                            |
| cornershop (M)    | https://cornershopcreative.com     | Nonprofits                                                  | Most human personality in the set: a mascot, a seasonal brick-wall hero. A red banner directly under the hero says "600+" organizations. Clients page is sorted by cause (including Faith Based Institutions, Educational Organizations). Case-study titles are plain-English stories.                                                     |
| wholewhale        | https://wholewhale.com             | Nonprofits, social impact                                   | Real team photo above the fold; B Corp mention; single Contact pill. Wave and blob shapes are stock-template.                                                                                                                                                                                                                              |
| newmedia (M)      | https://www.newmediacampaigns.com  | Nonprofits, public schools, retail                          | Work-as-hero: three named client tiles (Fleet Feet, New Visions for Public Schools, Aspen Global Change Institute) with "View Case Study". Only 93 KB, 25 requests.                                                                                                                                                                        |
| elevationweb (M)  | https://www.elevationweb.org       | Nonprofits                                                  | Best case-study page I found (see 2.2). Two CTAs, "Book a Call" primary, "Explore our Work" secondary, header CTA stays on mobile. 139 KB, 12 requests, LCP 388 ms. Soft pink gradient behind the hero is a template tell.                                                                                                                 |
| austinblu (M)     | https://austinblu.com              | Cincinnati small business and nonprofits                    | Local and affordable promise stated in plain words. Weak: stock photo of a couple at a laptop, generic "digital experiences" line, LCP 4.2 s.                                                                                                                                                                                              |
| elliebrands (M)   | https://www.elliebrands.com        | Cincinnati small business, nonprofits                       | Hero is a real brand board for a named client (a CPA firm). Black "Work with us" button. Weak: 11 MB, 191 requests, chat bubble over content.                                                                                                                                                                                              |
| genesis (M)       | https://genesiswebstudio.com       | Cincinnati/Milford small business                           | Names the place in the H1 and offers a free growth audit. Weak: cookie bar plus chat popup plus notification badge cover the hero at 390 px.                                                                                                                                                                                               |
| stepout           | https://stepoutwebdesigns.com      | Churches, nonprofits (Texas)                                | Christian identity clear in the logo. Weak: stock light-bulb slider, the subtitle was cut off mid-animation in my capture, no proof above the fold, 5.9 MB.                                                                                                                                                                                |
| reachright (M)    | https://reachrightstudios.com      | Churches (800+ in 47 states, per the site)                  | Strongest first viewport for a church buyer: an animated "church near me" search showing a #1 result, then "89% client retention", "800+ churches", and a price ("from $97/mo") in the first screen of copy. Pricing page lists every price. Different product (marketing plus website), so copy the clarity, not the offer.               |
| rackphoto         | https://rackphoto.com              | Cincinnati commercial and portrait photography              | Phone and email in the header; the nav is organised by buyer need (Portraits, Architecture, Products, Virtual Tours, Churches). A photographer with a Churches category is a direct comparison for NCS. Looks like an older theme.                                                                                                         |
| ministrydesigns   | https://ministrydesigns.com        | Churches (template platform)                                | Clear offer and demo CTA. Weak: floating circle avatars, five stars with no source, blob background. Typical template-vendor look.                                                                                                                                                                                                         |
| designtlc (M)     | https://designtlc.com              | Small schools, preschools, nonprofits                       | Names the exact audience, hero photo of real kids and a teacher, one bold CTA ("Get some TLC"), a named testimonial (a school) on the services page, and an assessment as step one. Closest to NCS's audience.                                                                                                                             |
| smallsteeple      | https://www.smallsteeple.com       | Small churches (founded 2013 by two pastors)                | Mood is right for churches. Weak: the pricing page shows tiers "Free / Plus / Premium" at $0, $7.99 and $19.99 per month with "Month of Free", which looks like unedited template text. Buyers will read that as neglect.                                                                                                                  |
| missionweb        | https://missionwebagency.us        | Nonprofits, mosques, faith-based groups                     | Clean offer page: a banner with a founding-client price ($199), then three buyer-fear answers under the CTA ("You own your site", "No long contracts", "Built on WordPress"), then an icon strip (Donation-ready, Accessible, Easy to update). Real nonprofit site shown in the mockup. Pricing and case-study pages not read (bot check). |
| kingandlord       | https://www.kingandlorddesigns.com | Schools, nonprofits, small business (St. Louis)             | Speed and process promise in the H1. Weak: black screen with neon text and an empty first viewport, 211 requests, LCP 3.5 s. The "Pricing" nav link exists but the /pricing path I guessed gave a 404, so I did not verify it.                                                                                                             |
| mushaboom         | https://mushaboom.studio           | Small business (brand + photography + Squarespace)          | Calm layout, photography-led, one "Inquire Today" CTA. Cookie box covers the hero on desktop and mobile.                                                                                                                                                                                                                                   |
| localcreative     | https://localcreative.co           | Small creative businesses                                   | Two real client sites flank the headline. Consent dialog covers the bottom left of the first viewport and most of the mobile screen. Only 343 KB.                                                                                                                                                                                          |
| christianinternet | https://www.christian-internet.com | Christian small business, churches, nonprofits (since 1998) | Phone number and "Schedule a call" in the header; "Request a quote" and "See Google reviews" as the two hero CTAs (review proof as a CTA). Care plans are in the nav. Portfolio page lists clients by name.                                                                                                                                |
| ekklesia360       | http://www.ekklesia360.com         | Churches (platform)                                         | Claims 8,500 churches, offers a free demo, pricing in the nav. Dated card grid; consent bar covers the bottom.                                                                                                                                                                                                                             |

### 1b. Peer references named in PRODUCT.md (2)

| Slug           | URL                              | What it does well                                                                                                                                                                                                               |
| -------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| brittanychiang | https://brittanychiang.com       | Hierarchy: name, role, one sentence, sticky section nav. 31 requests, LCP 992 ms. Not a sales page: no services, no price, no CTA. Good type system to study, wrong job for NCS.                                                |
| gradogna (M)   | https://www.gianlucagradogna.com | Split-screen type, restrained palette, photography as personality. At 390 px the first viewport is a near-black hair photo with the headline card cut off at the bottom edge. 11 MB, LCP 3.4 s. A caution for NCS, not a model. |

### 1c. Ceiling-setting craft sites (8)

| Slug           | URL                       | What sets the ceiling                                                                                                             | Cost                                                   |
| -------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| basement (M)   | https://basement.studio   | A 3D studio room as the hero, with a Human/Machine toggle and a studio status light. Personality through a place, not a headline. | 14 MB, headline sits below the fold on mobile          |
| locomotive (M) | https://locomotive.ca     | Full-bleed colour photo, huge serif, tiny nav. Very confident type.                                                               | LCP 288 ms, 2.4 MB; consent box covers the mobile hero |
| lusion         | https://lusion.co         | Real-time 3D objects in a framed hero. The screenshot caught it mid-load.                                                         | 501 KB initial, 106 requests                           |
| 14islands      | https://www.14islands.com | Two-word headline set at poster size, almost no chrome.                                                                           | 1.7 MB, LCP 608 ms                                     |
| studiofreight  | https://studiofreight.com | One sentence in the middle of a field of project thumbnails; the work is the interface.                                           | 1 MB, 113 requests                                     |
| rauno          | https://rauno.me          | Oversized plain statement over a hard yellow circle, horizontal scroll of projects.                                               | 628 KB, LCP 560 ms                                     |
| resn           | https://resn.co.nz        | Caught on its preloader (black screen, one droplet) after 4.5 s.                                                                  | 23.6 MB transferred                                    |
| paco           | https://paco.me           | Almost no design: one column of text and links. Voice carries it ("everything around me is someone's life work").                 | 368 KB                                                 |

Ceiling lesson: these studios sell to brands that buy spectacle. They also transfer 0.5 to 24 MB, and several fail the mobile first viewport test. Take the type confidence (14islands, Locomotive, Rauno) and the "work is the interface" idea (Studio Freight, NMC), not the WebGL.

### 1d. Extra evidence pages saved

`reachright-pricing-d.png`, `smallsteeple-pricing-d.png`, `cornershop-case-d.png` (Cornershop's portfolio index), `elevation-case-d.png`, `constructive-case-d.png`, `designtlc-svc-d.png`, `constructive-contact-d.png`.

---

## 2. Pattern library

### 2.1 How they open (first viewport: promise and proof)

| Pattern                                                 | Examples                                                                                                                           | Verdict                                                                                                                         |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| A. "[Service] for [audience]" headline, nothing else    | Constructive, Mighty Citizen, Elevation, Cornershop, Whole Whale, Design TLC, CIDesign, Mission Web                                | The default. 8 of 22. Names the audience, proves nothing. Overused.                                                             |
| B. Work as the hero (real client sites or brand boards) | NMC, Constructive, Mighty Citizen, Local Creative, Ellie Brands, Mission Web, Studio Freight                                       | Best proof per pixel. The laptop-plus-phone mockup version is overused; real screenshots on a plain background are not.         |
| C. Outcome demo plus numbers plus price                 | Reachright                                                                                                                         | Rare and effective for churches: a specific promise, 800+ churches, 89% retention, "from $97/mo", all in the first two screens. |
| D. Real people                                          | Whole Whale (team), Design TLC (kids, teacher), Cornershop (mascot)                                                                | Warm and memorable. Stock people (Austin Blu) do the opposite.                                                                  |
| E. Atmosphere or stock                                  | Small Steeple (stained glass), Step Out (light bulbs), Austin Blu, Genesis                                                         | Says nothing about the work. Template-y.                                                                                        |
| F. Offer first                                          | Genesis (free growth audit), Mission Web (free website audit, $199 founding offer), Ministry Designs (free demo), CIDesign (quote) | Gives a next step, but "free audit" appears on 3 sites and reads as a funnel.                                                   |
| G. Type statement                                       | 14islands, Rauno, Paco, Gradogna, Brittany Chiang                                                                                  | Peer-facing. Works when the reader already trusts the person.                                                                   |
| H. Immersive 3D                                         | Basement, Lusion, Resn, Locomotive                                                                                                 | Ceiling only. Heavy and awkward on mobile.                                                                                      |

Proof placed directly under the hero: Cornershop's "600+ organizations" band; Reachright's stat pair; Mission Web's three plain-spoken assurances (owns site, no long contracts, built on WordPress); CIDesign's "See Google reviews" button; Ministry Designs' unsourced stars (weak).

### 2.2 How they present case studies

- Strongest structure (Elevation, Junior Achievement of Southern California page): client name and category, an outcome headline ("The chapter site that became a blueprint"), a one-sentence summary, then a metadata block (Services, Launch year, Key deliverables), About the client, The Challenge, Our Approach, Why It Worked, The Results, a CTA, More Work. The result is told as adoption ("other JA chapters now license it"), not a percentage. I found no hard numbers on that page.
- Story titles with a before and after (Cornershop): "From Drupal to WordPress...", "From All Faiths to Unica: A Full Rebrand and Website Launch". Subheads are process steps ("Turning Retainer Insights Into a Focused Action Plan", "A Short Timeline, a Long List of Wins"), a "See it Live" button, and related projects. Titles are long but plain.
- Tile grid with a "View Case Study" link (NMC), and image-led case-study sections with abbreviations (Constructive: EDF, CFRNY). Fast to scan; thin on problem and decision.
- Name list or thumbnail wall (CIDesign, Austin Blu portfolio): 14 client names or a gallery, no problem or result. Proves you have clients, not that you solve anything.
- Missing across the set: price paid, timeline in weeks, what the client's own staff can now do without help. Cornershop's own RFP guide lists that last point as a pain (new staff cannot edit the back end), so it is worth showing.

### 2.3 How they show price

- Full price page: Reachright ("Four services. Straight prices.": $97/mo web design, $297/mo local SEO, $397/mo Ad Grant, social from $497/mo, custom website quoted per project with a $2,500 deposit).
- Price in the banner or nav: Mission Web ($199 founding offer), nav "Pricing" on Ministry Designs, Ekklesia360, King and Lord, Small Steeple.
- Budget bands in the contact form instead of on the page: Constructive ($50,000 up to $250,000 and higher).
- Unverified, from a search summary only: Sunday Best $7,500 / $15,000 / $25,000.
- Template risk: Small Steeple's pricing page.
- Nobody among the nonprofit agencies (Constructive, Mighty Citizen, Kanopi, Cornershop, Whole Whale, NMC, Elevation) shows a project price on the home page. A published $4k floor would stand out in that group; it would be normal among church template vendors that show monthly prices.

### 2.4 Social proof

Client counts (Cornershop 600+, Reachright 800+, Ekklesia360 8,500; all self-reported), named client tiles (NMC, Kanopi), a named testimonial with the person's school (Design TLC), a Google Reviews link as a CTA (CIDesign), a clients page sorted by cause (Cornershop), B Corp badge (Whole Whale). Weakest: unsourced stars and floating avatars (Ministry Designs).

### 2.5 Process

Design TLC puts an assessment first. Mission Web answers fears in three phrases. Reachright has a "Before you ask" block on the pricing page and a "Which one first?" chooser. Most agencies hide process in a Services dropdown. No site showed a week-by-week timeline in what I read.

### 2.6 Personality

Cornershop's mascot and seasonal hero (a pumpkin and cobwebs on 3 October) is the standout warm touch among agencies. Design TLC uses real faces. Whole Whale uses its team. Ceiling sites use voice (Paco), irreverence (basement, "cool sh*t"; Locomotive's emoji), or place (basement's 3D room). Stock photography (Austin Blu, Small Steeple, Step Out) removes personality.

### 2.7 Calls to action

Single primary CTA with a quiet secondary (Elevation, Mission Web, Reachright) is the clearest. CTA in the header that survives on mobile (Elevation's "Contact Us" pill beside the menu button) is the best mobile behaviour I saw. Phone number in the header (CIDesign, Rack Photography, Elevation in the menu) suits older, phone-first buyers. Constructive's "how did you hear about us" list including AI search is a cheap way to see where leads come from.

### 2.8 Mobile experience (390 px)

- Good: Elevation (headline, both CTAs and header CTA in one screen), Reachright (the search demo survives intact), Mission Web, Design TLC (headline, CTA, photo; a chat bubble overlaps the next heading), NMC (headline plus first client tile).
- Poor: Gradogna (dark photo, headline pushed to the bottom), Locomotive (consent box over the image, no headline visible), Genesis (cookie bar, chat popup and badge stacked over the headline), Local Creative (privacy dialog covers about half the screen), Mushaboom (cookie box over the intro copy), Basement (3D scene fills the screen, headline below the fold).
- Pattern: consent boxes and chat widgets are the most common first-viewport killer. 5 of the 14 mobile shots I inspected had a consent box or chat bubble over content (Mushaboom, Locomotive, Genesis, Local Creative, Design TLC), and 2 more (Gradogna, Basement) pushed the headline below the fold.

### 2.9 Page weight and speed (unthrottled desktop, this PC, 2026-10-03)

| Site                              | LCP          | Transfer    | Requests |
| --------------------------------- | ------------ | ----------- | -------- |
| Elevation                         | 388 ms       | 139 KB      | 12       |
| NMC                               | 1596 ms      | 93 KB       | 25       |
| Reachright                        | 368 ms       | 338 KB      | 43       |
| Local Creative                    | 1060 ms      | 343 KB      | 86       |
| Mighty Citizen                    | 644 ms       | 5.6 MB      | 73       |
| Constructive                      | 820 ms       | 8.5 MB      | 85       |
| Cornershop                        | 728 ms       | 10.0 MB     | 56       |
| Ellie Brands                      | 492 ms       | 11.2 MB     | 191      |
| Austin Blu                        | 4192 ms      | 2.7 MB      | 46       |
| King and Lord                     | 3548 ms      | 1.8 MB      | 211      |
| Small Steeple                     | 3452 ms      | 1.7 MB      | 85       |
| Gradogna                          | 3400 ms      | 11.0 MB     | 205      |
| Basement                          | 1272 ms      | 14.2 MB     | 201      |
| Resn                              | not reported | 23.6 MB     | 130      |
| **NCS (nixoncreativestudio.com)** | **252 ms**   | **1.35 MB** | **47**   |

On this test the current NCS home page is faster than every mission-driven competitor above except the very light ones, and lighter than all but Elevation, NMC, Reachright and Local Creative. So "slow" is not shown by this measurement. It may be perceived slowness (preloader or WebGL start, reveal-gated sections) or a mobile and throttled-network problem. A throttled mobile run is needed before design decisions are based on speed.

### 2.10 Overused or template-y (avoid)

1. Laptop plus phone mockup triptych on a coloured block (Mission Web, Mighty Citizen, NMC, Constructive).
2. Wave or curve dividers and gradient blobs (Mighty Citizen, Whole Whale, Genesis, Elevation, Ministry Designs).
3. "Digital experiences" and "mission forward" phrasing; "[X] for nonprofits" with nothing under it.
4. Stock people at laptops, stained glass, light bulbs.
5. Floating circle avatars and unsourced five-star rows.
6. Free-audit or free-demo as the only CTA.
7. Cookie bar plus chat bubble over the hero.
8. Unedited pricing-table templates.

---

## 3. What the buyers want (published evidence)

Quotes are limited to one short phrase per source. Where a source is a vendor (most are), I say so; vendor content shows what buyers are told to look for, not a neutral survey.

1. **GoDaddy "What Clients Want" survey** (https://www.godaddy.com/garage/what-clients-want/). 204 US small business owners surveyed plus 18 interviews, published April 2022 by GoDaddy Pro (a vendor selling to web pros). Findings: 59% would choose a personal acquaintance over anyone, with or without a portfolio; 24% would choose a provider backed by online recommendations and a portfolio; 0% would choose a provider with neither. Reviews and a portfolio were top priorities for 71% of those interviewed. Low pricing was never decisive ("weren't a deciding factor"). 76% of interviewees tried to look for help to improve their web presence, and valued providers who also did branding, SEO and marketing. Reading for NCS: referral and in-person trust (chamber, church network) outranks any site, and the site's job is to confirm what the referral said.
2. **Pushpay, "Designing a church website" (2026)** (https://pushpay.com/blog/designing-a-church-website-a-step-by-step-guide). Vendor of church software. Advice to churches: pick a designer with church experience, ask to see their portfolio, ask what is included in hosting, updates and ongoing support, check the site is easy to update without a tech person, and design for phone first because most visitors browse on phones.
3. **Sharefaith, "Church website design for pastors and church administrators"** (https://www.sharefaith.com/blog/2011/04/church-website-design-pastors-church-administrators/). Vendor article from 2011, so dated. Says budget shortages and schedule concerns quickly push a website off a church's list, and that updating should be "simple, straightforward, and easy".
4. **New Media Campaigns, nonprofit website RFP tips** (https://www.newmediacampaigns.com/non-profit-web-design/nonprofit-website-request-for-proposal-tips). Agency article. Nonprofit sites carry impact reports, financial documents, donation tools, events and sometimes member logins; those requirements change the cost estimate and timeline, so the buyer should state them up front.
5. **Cornershop Creative, "How to create a nonprofit RFP"** (https://cornershopcreative.com/blog/rfps-for-nonprofits/). Agency article. Recommends stating the budget so vendors can self-select out, preferring vendors who have worked with nonprofits, requiring WCAG 2.1 accessibility, asking for estimates that include hosting, licences and ongoing maintenance and support, and describing the pain of staff who cannot find or edit content. The sample RFP uses a $7,000 budget.
6. **Whole Whale, "How to find a great vendor for your web RFP"** (https://wholewhale.com/resources/how-to-find-a-great-vendor-for-your-web-rfp/). Agency checklist. Talk to at least two references; ask whether recent projects all look alike; ask whether the agency explains things in language you understand; ask about staff training implications of the platform, mobile, accessibility, and what happens if the budget is exceeded.
7. **Morweb, "5 RFP must-haves for nonprofit website design"** (https://morweb.org/post/RFP-Nonprofit-Website-Design). Vendor article. Says top agencies may decline to bid without a stated budget, buyers can state a preference for a local vendor, and the buyer should send example sites they like. Advises against "spec work". Shortlist 10, then 3 to 5.
8. **Search-summary only (not opened in full)**: REACHRIGHT's "How to choose the right church web design company" (https://reachrightstudios.com/?p=1955) and Sunday Best's published tiers (via https://faith.tools/app/443-sunday-best). The first is a vendor piece that recommends churches pick a company with church experience; the second shows church-specialist pricing from $7,500 (unverified). I did not read either page text, so I do not rely on them below.

### Synthesis by buyer need

- Proof from similar organisations: church and nonprofit buyers are told to ask for a portfolio and church or nonprofit experience (Pushpay, Cornershop, Whole Whale) and to call references (Whole Whale). Small business owners rank reviews and portfolio first (GoDaddy, 71% of interviewees). Several vendors say they prefer vendors who "have worked with nonprofits".
- Clear price: buyers are advised to state their budget (Cornershop, Morweb), and asked to expect estimates that include hosting and support. Low price was not decisive for GoDaddy's respondents. So a visible floor filters, but does not hurt a serious lead.
- Speed: mobile load and phone-first design are named by Pushpay and Whole Whale; a church or nonprofit has volunteers on phones. Timeline is a standard RFP field (Cornershop, Morweb, NMC).
- Ease of working together: plain language (Whole Whale), training on the platform (Whole Whale, Pushpay), staff who can edit (Cornershop, Sharefaith), a stated budget-overrun policy (Whole Whale).
- Ongoing support: hosting, updates and support are named in Pushpay and in Cornershop's RFP template, and the church-platform vendors sell monthly plans (Reachright, Ministry Designs) for exactly this reason.
- Local and personal: personal acquaintance beat everything in GoDaddy; Morweb says buyers can ask for local. NCS's in-person and chamber channel fits.

Caveat: none of these is a neutral buyer survey. Only GoDaddy's has a stated sample, and it is from 2022. I could not reach Reddit (login wall) or paid research, so there is no direct church-administrator quote set in this brief.

---

## 4. Implications for NCS (ranked)

1. **Open with real, named local client work and one plain sentence, at both 390 and 1440 px.** Evidence: the work-as-hero sites (NMC, Constructive, Local Creative) carry the most proof per pixel; GoDaddy: 71% put reviews and portfolio first and 0% would hire a provider with neither; Pushpay and Whole Whale tell churches and nonprofits to ask for portfolios. Skip the audience-only headline (8 of 22 sites) and the device-mockup triptych.
2. **Publish the price floors ($4k / $7k / $12k) with what each includes, and a monthly support price next to them.** Evidence: Cornershop and Morweb tell buyers to state budgets; Reachright's straight pricing page is the clearest in the set; no mission-driven agency shows project prices on its home page, so this differentiates; GoDaddy found low price was not decisive, so a floor does not scare serious leads.
3. **Make every case study Challenge, Decision, Result, in the client's words, with a named person and a live link.** Use Elevation's structure plus Cornershop's plain-English titles. Add what the client's staff can now do without help, the timeline in weeks, and the price band. Evidence: 2.2; Cornershop's RFP names staff who cannot edit content as the pain.
4. **Show references as checkable, not decorative.** Named people and organisations, a Google Reviews link, and a line offering two reference contacts. Evidence: Whole Whale (talk to at least two references), CIDesign (reviews as a hero CTA), GoDaddy (59% prefer someone they know). Avoid unsourced stars and floating avatars.
5. **Show ease of working together as a short, dated process.** Four to six steps with durations, what the client provides, who updates what, training at handoff, and that the client owns the site and accounts. Evidence: Mission Web's "You own your site / No long contracts" strip, Design TLC's assessment first step, Whole Whale's staff-training question, Pushpay's easy-to-update advice.
6. **Make ongoing support a visible plan with a price.** Evidence: Pushpay and Cornershop list hosting, updates and support; CIDesign has care plans in its nav; Reachright, Ministry Designs and Ekklesia360 sell monthly plans.
7. **Give church, school, nonprofit and small-business buyers their own entry points.** Evidence: Cornershop's clients page sorted by cause, Design TLC's schools-and-nonprofits focus, Reachright's churches-only focus. A church administrator should see churches in the first scroll. Cincinnati and the photography service stay visible (Rack Photography lists Churches as a category).
8. **Protect the mobile first viewport: headline, CTA and one proof item, with no consent or chat box on top.** Evidence: 7 of 14 inspected mobile shots had a consent box, chat bubble or pushed-down headline in the way (Genesis, Local Creative, Locomotive, Mushaboom, Design TLC, Gradogna, Basement). Copy Elevation's header CTA that stays on mobile. If NCS analytics set no cookies, drop the banner.
9. **Treat speed as a measured claim, and test before assuming it is a problem.** NCS measured LCP 252 ms and 1.35 MB desktop unthrottled, lighter than most competitors (Cornershop 10 MB, Constructive 8.5 MB). Run a throttled mobile test and look at the preloader, WebGL start and reveal-gated sections. Then publish the numbers on the site, as the pitch "fast" is only believable if shown. Do not copy ceiling sites' weight (Basement 14 MB, Resn 23.6 MB).
10. **Carry personality with specific human details, not effects.** Evidence: Cornershop's mascot, Design TLC's real faces, Paco's one-line voice, Rack Photography's Churches category; against Austin Blu's stock couple. Use Nathan's own photography of real clients, plain-spoken copy, type confidence from 14islands, Locomotive and Rauno, and one small recurring detail. Avoid wave dividers, gradient blobs, "mission forward" phrasing and a free-audit-only CTA (2.10). Add a "how did you hear about us" field with an AI-search option, as Constructive does, to see where leads come from.

---

## 5. Gates

- Sites opened with screenshots: 32 (22 mission/local, 2 peer references, 8 ceiling). NCS itself was only measured, not screenshotted. Sunday Best, Louder Agency (parked domain), Hoodzpah (domain for sale), Winston.design (domain for sale), Elliott Mangham (domain did not resolve), TLB Web Design (did not resolve), Olia Gozha (blank page), Pentagram and Build in Amsterdam (opened, dropped as off-brief) were tried and excluded.
- Screenshots saved in `B-shots/`: 64 first-viewport shots (32 desktop, 32 mobile) plus 7 extra evidence pages. I visually inspected all 32 desktop first viewports and 14 mobile ones.
- Sources used for section 3: GoDaddy survey, Pushpay, Sharefaith, New Media Campaigns, Cornershop Creative, Whole Whale, Morweb, plus search summaries for REACHRIGHT and Sunday Best (not relied on).
- Tools note: WebSearch and WebFetch hit a usage limit partway through; the buyer-source text was then read by opening each page directly in the browser.
