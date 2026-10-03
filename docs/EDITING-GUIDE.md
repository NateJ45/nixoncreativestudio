# Editing the site without Claude

Written 2026-10-03 for Nathan. Everything on nixoncreativestudio.com that is words, prices, pictures, menus or entries can be changed from the admin, with no developer and no code. This guide says where each thing lives and how to change it, one step at a time. The few things that stay in code are listed near the end, with a way to change them yourself if Claude is not around.

The admin is at **https://www.nixoncreativestudio.com/\_emdash/admin**. You sign in with your passkey.

---

The admin also explains itself: a short tour opens the first time you open the dashboard, the **Help** item in the sidebar keeps the same guide (with an "I want to change X, go to Y" table), and every entry editor has an **About this screen** note. The words for all three live in `cms/help/tour.json` in the repo.

---

## 1. The two rules

1. **Save keeps a draft. Publish makes it live.** Nearly every mistake comes from saving and forgetting to publish. After you change something, press **Publish** (or **Publish changes** on an entry that is already live), and wait for the confirmation.
2. **Never delete or unpublish an entry under Site settings or Pages.** Those entries (Home page, About page, Site settings, and so on) are the words the site is built from. If one goes missing, the site falls back to a built-in copy of the old words and logs a warning, so nothing breaks, but your edits stop showing until you publish the entry again. Edit them as much as you like; just never remove them.

**How long until it shows.** Publishing is almost instant: a changed page is refreshed on the live site within a few seconds. If a page still looks old after a minute, reload with Ctrl+Shift+R. The page keeps a built-in five-minute timer as a backup, so in the worst case the old version is gone after five minutes, never later.

**The box limits are on purpose.** A box that stops at 40 characters is protecting a layout that would break at 41. Some fields count rows (exactly four process steps, one to three "Working on" lines). The label of each field says its limit.

---

## 2. I want to change X, so I go to Y

Everything is in the left sidebar. The groups are Site, Pages, Pricing & services, then Case Studies, Journal and Photography, with Media below them.

| I want to change                                                    | Go to (sidebar)                           | Then                                                                   |
| ------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------- |
| My email, phone, location, social links, tagline                    | **Site settings**                         | Open the one entry, change the box, Publish.                           |
| The footer "Currently" line (seasonal)                              | **Site settings**                         | Box "Footer Currently line".                                           |
| The default closing banner ("Tell me what you are building")        | **Site settings**                         | The three "Closing banner" boxes. A page can override its own.         |
| The homepage headline, section headings, process steps              | **Pages, Home page**                      | The headline is two boxes: the plain part and the coloured part.       |
| A price (Launch, Signature, Flagship)                               | **Pricing & services, Pricing tiers**     | Open the tier, "Starting price", Publish. Then do the price checklist. |
| An add-on card ("Add to any project")                               | **Pricing & services, Add-ons**           | Name, price as it reads, what it covers.                               |
| A Services question and answer (FAQ)                                | **Pages, Services page**                  | Box "Questions and answers": 3 to 10 rows.                             |
| The Strategy, Web design and Photography chapters on Services       | **Pricing & services, Service offerings** | One entry per chapter.                                                 |
| The About text, the headshot, the Currently block                   | **Pages, About page**                     | See practice edit 3.                                                   |
| The Contact page words, budget and timeline choices                 | **Pages, Contact page**                   | Renaming a choice changes what arrives in your inquiry email.          |
| The Work, Photography, Journal or not-found page words              | **Pages**, the page with that name        | Headline, intro, empty-state texts.                                    |
| Privacy, Accessibility or Colophon text and the "Last updated" date | **Pages, Other pages**                    | Three entries. Set "Last updated" to today when the text changes.      |
| A case study (add, edit, hide, feature on the homepage)             | **Case Studies**                          | See 4.1.                                                               |
| A Journal entry                                                     | **Journal**                               | See 4.2.                                                               |
| A photo on the Photography page                                     | **Photography, Photos**                   | See 4.3.                                                               |
| The header or footer links                                          | **Menus** (under Manage in the sidebar)   | See 4.5.                                                               |
| A redirect for an old or renamed address                            | **Redirects** (Admin login only)          | See 4.4.                                                               |
| Which sites rotate in the homepage hero                             | **Case Studies**, the case study          | Tick "Show in the homepage device scene" and give it a number.         |
| A picture's file (swap the headshot, replace a cover)               | The entry that holds it                   | Upload a new one in the picture field and rewrite its description.     |
| Page search titles and descriptions                                 | The same page entry                       | "Search and tab title" and "Search description" at the top.            |

**The "live view" button** at the top of an entry opens the public page where that entry shows. For the page entries it opens that page; for Pricing tiers, Add-ons and Service offerings it opens Services; for Photos it opens Photography; for Site settings it opens the homepage. Save and publish first, since it shows what is live.

---

## 3. Three practice edits

Do these once, in this order, so the screens feel familiar. Each ends with an undo, so nothing stays changed.

### Practice edit 1: a price

1. In the sidebar open **Pricing & services**, then **Pricing tiers**.
2. Open **Launch**. Find "Starting price in whole dollars". It says 4000. Change it to 4100.
3. Press **Publish**.
4. Open https://www.nixoncreativestudio.com/services/ in a new tab. Launch now says $4,100. The homepage "What it costs" band changed too.
5. Undo it: back in the entry, set the price to 4000 and publish again.

**The price checklist.** Whenever a price changes for real, three sentences elsewhere may quote the old number. Check each one:

1. **Pages, Services page**, the FAQ answer "What does it cost?".
2. **Pages, Services page**, the note under the tier cards, and each tier's "Typical range" line in Pricing tiers.
3. **Pages, Contact page**, the first Budget choice. It should start at your lowest tier price.

### Practice edit 2: a FAQ answer

1. Open **Pages**, then **Services page**. Scroll to "Questions and answers".
2. Open the first row and add a word to the answer, such as "typically".
3. Press **Publish** at the top.
4. Open /services/ and find the question. The new word is there. Google reads these answers too, so keep them true.
5. Undo it: remove the word and publish again. (You can also use History, see section 6.)

To add a question, use the add-row button at the bottom of the list (three to ten rows are allowed). To reorder, drag the row.

### Practice edit 3: the Currently block

This is the quarterly job. It lives on the About page.

1. Open **Pages**, then **About page**. Scroll to the "Currently" boxes.
2. Rewrite **Working on** (one to three lines), **Booking** (one to three rows; status Open or Limited), **Reading** (one to four books) and **Learning** (one to four lines).
3. Set **Currently last updated** to today. It drives the "Updated N days ago" pill on the page.
4. Publish, then check https://www.nixoncreativestudio.com/about/#now.

The four Lighthouse numbers on the same page are measured facts. Change them only after a real re-measure.

---

## 4. Everyday jobs

### 4.1 Add a case study

1. Open **Case Studies** and press **Add new**.
2. Fill the required boxes: Title, Client, Sector, Summary (200 characters at most), Cover image, Year and Published (the case study date). Cover images work best as a real screenshot of the finished site, at least 1600 px wide.
3. Add the Outcome line (one honest sentence, 160 characters at most), the live URL, the services, topics and stack tags, and the body text.
4. For the animated "live site" frame, upload the full-page desktop capture under "Showcase: desktop" and write its description.
5. To feature it on the homepage Selected Work strip, tick **Featured on the homepage**. The three newest featured studies show, so untick an older one if you want room.
6. To put the site in the rotating homepage hero scene, tick **Show in the homepage device scene** and give it the next order number. It only joins if it also has both a desktop and a mobile capture and a live URL.
7. Press **Publish**. The page appears at /work/ and /work/your-slug/. The share image for social previews is built at the next deploy, so it may not appear straight away.

Never invent a testimonial. The quote boxes stay empty until a client has actually said it.

### 4.2 Write a Journal entry

1. Open **Journal** and press **Add new**.
2. Write the Title and the Body. A "Heading 2" starts a section, a "Heading 3" a subsection.
3. **Fill in the Summary. It is required.** It is one sentence, about 200 characters at most. It is the card text on the Journal page, the search description and the share text. **An entry with an empty Summary is silently hidden from the whole site**, even when it is published, which is the single most common reason a Journal entry seems to vanish.
4. Add a Cover image if you like, and Tags.
5. **Save** keeps it as a draft that nobody can see. **Publish** puts it on /journal/. The Journal link appears in the menus on its own once one entry is live, and goes away if none is.
6. A share image for the entry is built at the next deploy.

Pictures inside the body are not drawn yet. A cover image is.

### 4.3 Add a photo

1. Open **Photography**, then **Photos**, and press **Add new**.
2. Upload the Photo (at least 1600 px on the long side) and write the **Alt text** (what the photo shows, as if describing it to someone on the phone). **A photo without alt text is left out of the page on purpose.**
3. Choose the Group (Events, Portraits or Environments), the Year, and optionally a Caption and an Order number (1 is first).
4. Tick "Use as the opening picture" on the one photo that should sit behind the Photography headline.
5. Publish. The gallery fills in on its own.

### 4.4 Add a redirect

Use this when you retire or rename a page, so old links and search results still land somewhere.

1. Sign in as **Admin** (the Editor login cannot see Redirects). Open **Redirects** in the sidebar.
2. Add a redirect: **Source** is the old address, starting with a slash (for example `/old-page`). **Destination** is where it should go (for example `/services/`). Leave the type at 301 (permanent).
3. Save, then open the old address in a new tab to check it lands in the right place.

Renaming a case study's address (slug) creates its redirect for you.

### 4.5 Change a menu link

1. Open **Menus**. There are two: **primary** (the header) and **footer**.
2. Open one. Change a label or address, add an item, or drag items into a new order.
3. The **Title attribute** box on an item is the short description shown under its name in the phone menu. Keep it to a few words.
4. Save the menu. Contact is not in the header menu because the "Start a project" button covers it.

If you point a link at a Journal address while no entry is published, the site hides that link for you.

### 4.6 Privacy, Accessibility and Colophon

Each is an entry under **Pages, Other pages**. Each "Heading 2" in the body becomes a section and a line in the "On this page" list. Set "Last updated" to today when you change the text. The facts in them (what the site collects, which tools it uses, how it is hosted) have to stay true, so ask for a check before changing a claim about the code or the hosting.

**When your email changes.** Change it in Site settings, then also in the Privacy and Accessibility entries, because the address is typed into their links.

---

## 5. What stays in code, and how to change it yourself

Some things are not in the admin on purpose: button and menu link targets that would break the main inquiry path if mistyped, small interface words (Back to top, the filter "All", the form's error messages, the contact success message), the page layouts, the order of the homepage sections, the case-study page template, the Open Graph share-card titles, analytics IDs and tokens, and the brand colours and fonts.

If Claude is not around and one of these needs changing:

1. Open the repo on GitHub: **github.com/NateJ45/nixoncreativestudio**.
2. Find the file (press `.` on the repo page, or use the search box), then press the pencil icon to edit it in the browser.
3. Change only the words between quotes or tags. Leave the surrounding code alone.
4. Press **Commit changes**, choose **Create a new branch and start a pull request**, and open the pull request.
5. Wait for the three checks (CI build, CI tests and Lighthouse) to turn green. That takes a few minutes. If one is red, do not merge; open it and read the message, or ask Claude.
6. Press **Merge**. The live site updates a minute or two later.

**Never edit production directly.** Everything reaches the live site by merging a pull request, so a mistake is one click to undo (see section 6) and a bad change never skips the checks.

---

## 6. When something looks wrong

Try these in order, smallest first.

1. **A page looks wrong after an edit.** Open that entry and use **History** (or Revisions) to see the earlier versions. Restore the last good one and publish it.
2. **A page looks old after publishing.** Reload with Ctrl+Shift+R. If it is still old after five minutes, check the entry really says Published and not "Published with changes".
3. **A code change broke the site.** In the Cloudflare dashboard open **Workers & Pages**, then **nixoncreativestudio**, then **Deployments**. Find the last good deployment and choose **Roll back**. Then open the pull request that caused it on GitHub and press **Revert**.
4. **Content was lost or badly overwritten.** The database can be restored to a point in time. In a terminal in the project folder, `npx wrangler d1 time-travel info ncs-emdash-prod` shows the current point, and `npx wrangler d1 time-travel restore ncs-emdash-prod --timestamp <iso time>` restores it to just before the mistake. The window is 30 days on the paid Workers plan and 7 on the free one. A restore replaces everything after that moment, so ask for a second opinion first.
5. **A monthly backup is the safety net behind all of this:** `npx emdash site export backup.emdash` saves everything to a file (restore with `emdash site import`). It is worth doing once a month and keeping the file in 1Password or a drive.

---

## 7. Screens to ignore, and ones not to touch

- **Comments, Widgets, Sections, Bylines:** these screens are part of EmDash and cannot be hidden. They are empty and the site does not use them. Ignore them.
- **Settings, General:** the site reads **Site settings** instead, so editing the title or tagline here changes nothing on the public site.
- **Settings, API tokens:** only needed when Claude runs a data load. Revoke a token when the job is done.
- **Content Types: do not edit anything here.** Deleting a field, or changing its type, deletes the words stored in it, and History does not bring them back. The fields and their limits are defined in the code (`cms/schema`), and the recovery for a mistake is a database restore (section 6, step 4).
- **Users, Plugins, Import:** admin tooling, nothing to do day to day.

### A safer second login (recommended)

Signed in as Admin you can see Content Types and Users, which is where the one costly mistake lives. EmDash has an **Editor** role that cannot see Content Types, Users, Plugins or Redirects. The recommendation is to make a second user, for example "Nathan (editing)", with the Editor role and use that for everyday edits, signing in as Admin only to add a redirect or a user. Setting it up needs a second email address for the invitation (Users, Invite). If one login is easier, that is fine too: just never open Content Types.

---

## 8. New pages

A new plain text page (say "Terms") is not possible from the admin yet, because every page has its own template in code. The three text pages that exist (Privacy, Accessibility and Colophon) are fully editable. A new page takes a short code change, so it is a job for a Claude session; a catch-all route that would let any new "Other pages" entry go live by itself was designed and left unbuilt until you decide you want it (docs/CMS-DESIGN.md, question 8).
