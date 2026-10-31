// Safe to edit.
/* ============================================================================
   capture-cms.mjs: shoot each study's editing screen ("What you edit", 3.6)
   ============================================================================
   Usage (Nathan runs it on his own machine, never in CI):

     npm run capture:cms                         every site below, one by one
     npm run capture:cms -- --only stone-steps-50k
     npm run capture:cms -- --profile D:\somewhere\cms-profile

   A CMS that works well is part of the offer, so each study I built on one
   shows its editor: Sanity Studio (embedded at /studio on the client's own
   site) or WordPress (wp-admin), with a REAL document open, never the empty
   dashboard.

   How it works, per site:
     1. Opens a visible (headed) browser on a persistent profile that lives
        OUTSIDE this repo (default %LOCALAPPDATA%\ncs-cms-capture-profile), so
        a sign-in is remembered between runs and no cookie ever lands in git.
     2. Goes to the editor URL in SITES below.
     3. If a sign-in screen shows (or the editor does not appear in time), it
        prints "Sign in to <site> in the window, then press Enter here" and
        waits. YOU sign in, in the window. This script never types, reads or
        stores a password, and it never clicks a sign-in button.
     4. Hides avatars, user menus, email addresses, admin notices, plugin nags
        and update badges with injected CSS (and blanks any email address left
        in the text), so the shot shows the editor, not the people.
     5. Saves a 1440x900 screenshot (deviceScaleFactor 1, the same as the
        desktop captures in capture-case-study.mjs) to
        src/assets/case-studies/shots/{slug}-cms.png.

   Then look at every file before committing (a toast, a half-loaded pane or
   a name in a document list is easy to miss), and add to the study's MDX:

     cmsShot: ../../assets/case-studies/shots/{slug}-cms.png
     cmsShotAlt: The Home page open in Sanity Studio
     cmsName: Sanity Studio

   Where each URL came from (keep this true when a site changes):
   - Sanity sites embed one Studio in the site itself (each client repo's
     astro.config.mjs: "Embedded Sanity Studio at /studio"). Every repo's desk
     structure opens the Home singleton with documentId('homePage')
     (src/sanity/structure.ts), so the intent link
     intent/edit/id=homePage;type=homePage opens the real Home page form.
     MAS, Presbyterian Academy and Reid set studioBasePath '/studio' (path
     routing). Stone Steps and FBCM own their /studio page and run the Studio
     in hash history (src/lib/studio-route.ts), so their links carry "#/".
   - WordPress sites: the newest item of the type staff edit most is looked up
     on the site's public REST API at run time (no sign-in needed for that),
     then opened at wp-admin/post.php?post={id}&action=edit. Theology Matters:
     the newest article (posts, block editor). Foundation for Reformed
     Theology: the newest Resource (frt_resource, a classic edit screen with
     ACF fields in the staff look). If the lookup fails, the list screen opens
     instead and you can open a document yourself before pressing Enter.

   Browser: installed Google Chrome when there is one (Google's sign-in tends
   to refuse Playwright's bundled Chromium), else the bundled Chromium.
   ============================================================================ */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

/* ---- The sites ------------------------------------------------------------
   slug      the case study (its MDX file name)
   cms       'sanity' | 'wordpress' (picks the sign-in check and the CSS)
   url       Sanity: the editor URL with a real document open
   base      WordPress: the site root
   restType  WordPress: the REST base of the post type to open the newest of
   listPath  WordPress: the fallback list screen when the lookup fails       */
const SITES = [
  {
    slug: 'mas-monograms',
    cms: 'sanity',
    url: 'https://mas-monograms.com/studio/intent/edit/id=homePage;type=homePage',
  },
  {
    slug: 'presbyterian-academy',
    cms: 'sanity',
    url: 'https://www.presbyterianacademy.org/studio/intent/edit/id=homePage;type=homePage',
  },
  {
    slug: 'reid-design',
    cms: 'sanity',
    url: 'https://reiddesignllc.com/studio/intent/edit/id=homePage;type=homePage',
  },
  {
    slug: 'stone-steps-50k',
    cms: 'sanity',
    url: 'https://stonesteps50k.com/studio/#/intent/edit/id=homePage;type=homePage',
  },
  {
    slug: 'first-baptist-muncie',
    cms: 'sanity',
    url: 'https://www.fbcmuncie.org/studio/#/intent/edit/id=homePage;type=homePage',
  },
  {
    slug: 'theology-matters',
    cms: 'wordpress',
    base: 'https://theologymatters.com',
    restType: 'posts',
    listPath: '/wp-admin/edit.php',
  },
  {
    slug: 'foundation-for-reformed-theology',
    cms: 'wordpress',
    base: 'https://foundationrt.org',
    restType: 'frt_resource',
    listPath: '/wp-admin/edit.php?post_type=frt_resource',
  },
];

/* ---- Arguments ------------------------------------------------------------ */
const args = process.argv.slice(2);
const argValue = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const only = argValue('--only');
const profileDir = resolve(
  argValue('--profile') ??
    process.env.NCS_CMS_PROFILE ??
    join(
      process.env.LOCALAPPDATA ?? join(process.env.HOME ?? '.', '.cache'),
      'ncs-cms-capture-profile',
    ),
);

// The profile holds signed-in cookies. It must never sit inside the repo.
if (profileDir === root || profileDir.startsWith(root + sep)) {
  console.error(`The browser profile must live outside the repo (got ${profileDir}).`);
  process.exit(1);
}

const sites = only ? SITES.filter((s) => s.slug === only) : SITES;
if (!sites.length) {
  console.error(`No site called "${only}". Pick one of: ${SITES.map((s) => s.slug).join(', ')}`);
  process.exit(1);
}

/* ---- What a signed-in editor looks like, and what to hide ----------------- */

// The editor is ready when one of these is on the page.
const READY = {
  sanity: '[data-testid="document-panel-scroller"], [data-testid="form-view"]',
  wordpress: '#post-body, .editor-styles-wrapper, .edit-post-layout, .editor-editor-interface',
};

// Hidden before the shot: people (avatars, user menus, presence), admin
// notices, plugin nags and update badges. visibility keeps the layout still.
const HIDE_CSS = {
  sanity: `
    [data-ui="Avatar"], [data-ui="AvatarStack"], [data-ui="AvatarCounter"],
    [data-testid*="presence"], [data-testid*="avatar"], [data-testid="user-menu"],
    [data-testid="user-menu-button"], [aria-label*="user menu" i], [aria-label*="profile" i],
    [data-ui="Toast"], [data-testid*="toast"] { visibility: hidden !important; }
  `,
  wordpress: `
    #wp-admin-bar-my-account, #wp-admin-bar-updates, #wp-admin-bar-comments,
    .avatar, img[src*="gravatar"], .update-plugins, .awaiting-mod, .update-count,
    .plugin-count, .theme-count, .notice, .update-nag, .updated, div.error,
    .components-notice-list, .components-snackbar-list, .rank-math-notice,
    #screen-meta-links, .edit-post-welcome-guide, .editor-welcome-guide
      { visibility: hidden !important; }
    .notice, .update-nag, .updated, div.error { display: none !important; }
  `,
};

/* ---- Helpers --------------------------------------------------------------- */

const rl = createInterface({ input: process.stdin, output: process.stdout });
const waitForEnter = (message) => rl.question(`${message} `);

// WordPress: the newest item of a type, from the public REST API.
async function wordpressTarget(site) {
  try {
    const res = await fetch(`${site.base}/wp-json/wp/v2/${site.restType}?per_page=1&_fields=id`);
    const [first] = res.ok ? await res.json() : [];
    if (first?.id) return `${site.base}/wp-admin/post.php?post=${first.id}&action=edit`;
  } catch {
    // Fall through to the list screen.
  }
  console.warn(`  Could not look up a ${site.restType} item; opening the list instead.`);
  return `${site.base}${site.listPath}`;
}

// Is a sign-in screen showing? Only reads the page; never fills anything in.
async function signInShowing(page, cms) {
  if (cms === 'wordpress') {
    return page.url().includes('wp-login.php') || (await page.locator('#loginform').count()) > 0;
  }
  const text = (
    await page
      .locator('body')
      .innerText()
      .catch(() => '')
  ).toLowerCase();
  return /choose login provider|sign in|log in/.test(text) && !(await editorReady(page, cms, 1));
}

async function editorReady(page, cms, timeout) {
  try {
    await page.locator(READY[cms]).first().waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

// Blank any email address left in the visible text (a byline, a "last edited
// by" line). Text nodes only; inputs are covered by the CSS above.
async function blankEmails(page) {
  await page.evaluate(() => {
    const email = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (email.test(node.nodeValue ?? '')) node.nodeValue = node.nodeValue.replace(email, '');
      email.lastIndex = 0;
    }
  });
}

/* ---- Run ------------------------------------------------------------------- */

mkdirSync(profileDir, { recursive: true });
const contextOptions = {
  headless: false,
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
};
let context;
try {
  context = await chromium.launchPersistentContext(profileDir, {
    ...contextOptions,
    channel: 'chrome',
  });
} catch {
  console.log('No installed Chrome found; using the bundled Chromium.');
  context = await chromium.launchPersistentContext(profileDir, contextOptions);
}
console.log(`Browser profile: ${profileDir}`);

const page = context.pages()[0] ?? (await context.newPage());
const outDir = join(root, 'src/assets/case-studies/shots');
mkdirSync(outDir, { recursive: true });

for (const site of sites) {
  const target = site.cms === 'wordpress' ? await wordpressTarget(site) : site.url;
  const host = new URL(target).hostname;
  console.log(`\n${site.slug}: ${target}`);
  await page.goto(target, { waitUntil: 'domcontentloaded' });

  // Give the editor a moment; a signed-in Studio takes a few seconds to boot.
  let ready = await editorReady(page, site.cms, 20000);
  if (!ready) {
    const why = (await signInShowing(page, site.cms))
      ? `Sign in to ${host} in the window, then press Enter here.`
      : `The editor did not appear on ${host}. Sign in or open a document in the window, then press Enter here.`;
    await waitForEnter(why);
    // After a sign-in the CMS may have sent the window elsewhere: go back.
    if (!page.url().startsWith(target.split('#')[0])) {
      await page.goto(target, { waitUntil: 'domcontentloaded' });
    }
    ready = await editorReady(page, site.cms, 30000);
    if (!ready) {
      await waitForEnter('Still no editor. Get the document on screen, then press Enter to shoot.');
    }
  }

  await page.addStyleTag({ content: HIDE_CSS[site.cms] });
  await blankEmails(page);
  // Let images and fonts settle after the CSS change.
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);

  const file = join(outDir, `${site.slug}-cms.png`);
  writeFileSync(file, await page.screenshot({ fullPage: false }));
  console.log(`  Saved ${file}`);
}

rl.close();
await context.close();
console.log('\nDone. Look at every file before committing it.');
