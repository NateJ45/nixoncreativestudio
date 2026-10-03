/* ============================================================================
   Site Data | Contact and identity values, read from the CMS
   ============================================================================
   Foundation, edit with care.

   Anywhere on the site that shows an email address, phone number, name, studio
   name, location, social URL, tagline or the shared footer / banner copy reads
   it through getSite(). The values live in the EmDash admin, under Site
   settings (the `site_settings` collection, entry slug `site`, schema in
   cms/schema/site_settings.mjs). If that entry is missing, unpublished or
   unreadable, getSite() serves the committed copy in cms/content/site_settings.json
   (the literal values this file used to hold) and logs a `[cms]` line, so a
   broken edit never blanks the footer.

   What stays in code, on purpose (docs/CMS-DESIGN.md section 0 item 8): the bare
   domain and the canonical URL. They are bound to the deployment and to the
   admin passkey origin, so changing them is a deploy, not an edit.

   Usage in an .astro file:
     const site = await getSite(Astro);       // Astro.cache tags the page, Astro.request memoises
   In a plain endpoint (rss.xml.js):
     const site = await getSite(context);
   Only need the URL or domain? Import SITE_URL / SITE_DOMAIN and skip the read.
   ============================================================================ */

import { getSingleton, text, type CmsOptions, type Raw } from '../lib/cms.ts';
import type { RouteCache } from '../lib/routeCache.ts';

/** Bare host, e.g. for the contact form subject line. Code, not content. */
export const SITE_DOMAIN = 'nixoncreativestudio.com';

/** Canonical origin, used in meta tags and structured data. Code, not content. */
export const SITE_URL = `https://${SITE_DOMAIN}`;

/**
 * A tel: target. Strips everything that is not a digit so the OS dialer can
 * read the number cleanly. For US numbers this is fine; an international number
 * would need a leading + and country code.
 */
export const phoneHref = (phone: string): string => `tel:${phone.replace(/\D/g, '')}`;

/** A mailto: target. */
export const emailHref = (email: string): string => `mailto:${email}`;

export interface Site {
  // Identity
  ownerName: string; // Person who owns the studio.
  studioName: string; // Brand / business name.

  // Reach
  email: string; // Primary inbox for inquiries.
  phone: string; // Display number (formatted for humans).
  address: string; // Public-facing locale, not a street address ("Cincinnati, OH").

  // Web (code constants, repeated here so a consumer needs one object)
  domain: string;
  url: string;

  // Social
  social: {
    instagram: string;
    linkedin: string;
  };

  // Marketing
  tagline: string; // One-line studio positioning.

  // External scheduling. Empty string disables the "Book a call" CTAs.
  bookingUrl: string;

  // Newsletter signup target. Empty string disables the Newsletter block.
  newsletterUrl: string;

  // Shared copy
  headerCtaLabel: string; // Header and phone-menu "Start a project" button.
  footerCurrently: string; // The footer "Currently" line.
  ctaDefault: { title: string; sub: string; label: string }; // CtaBanner defaults.
  defaultDescription: string; // Meta description for a page that passes none.
  rssTitle: string;
  rssDescription: string;

  // Derived link targets, so consumers do not repeat the string handling.
  phoneHref: string;
  emailHref: string;
}

/** A required string field; a blank one makes the entry unusable (the reader then falls back). */
function must(raw: Raw, key: string): string {
  const v = text(raw[key]);
  if (v === undefined) throw new Error(`site_settings.${key} is empty`);
  return v;
}

/**
 * Build the typed Site from a raw `site_settings` entry (or the fallback JSON).
 * Throws when a required field is blank, which makes getSingleton() serve the
 * committed fallback instead of a half-empty footer.
 */
export function normalizeSite(raw: Raw): Site {
  const email = must(raw, 'email');
  const phone = must(raw, 'phone');
  return {
    ownerName: must(raw, 'owner_name'),
    studioName: must(raw, 'studio_name'),
    email,
    phone,
    address: must(raw, 'location'),
    domain: SITE_DOMAIN,
    url: SITE_URL,
    social: {
      instagram: must(raw, 'instagram_url'),
      linkedin: must(raw, 'linkedin_url'),
    },
    tagline: must(raw, 'tagline'),
    bookingUrl: text(raw.booking_url) ?? '',
    newsletterUrl: text(raw.newsletter_url) ?? '',
    headerCtaLabel: must(raw, 'header_cta_label'),
    footerCurrently: must(raw, 'footer_currently'),
    ctaDefault: {
      title: must(raw, 'cta_default_title'),
      sub: must(raw, 'cta_default_sub'),
      label: must(raw, 'cta_default_label'),
    },
    defaultDescription: must(raw, 'default_description'),
    rssTitle: must(raw, 'rss_title'),
    rssDescription: must(raw, 'rss_description'),
    phoneHref: phoneHref(phone),
    emailHref: emailHref(email),
  };
}

/** What getSite() needs from the caller: `Astro` in a page, `context` in an endpoint. */
export interface SiteContext {
  /** Route cache; the read adds its tag so publishing the entry purges the page. */
  cache?: RouteCache;
  /** Memo key: one read per request even though the header, footer and page all ask. */
  request?: Request;
}

const perRequest = new WeakMap<Request, Promise<Site>>();

/**
 * The site settings. One D1 read per request (the Header, Footer, StructuredData,
 * CtaBanner and the page itself all call this and share the result), tagged for
 * the route cache. Falls back to cms/content/site_settings.json when the entry is
 * missing or unreadable.
 */
export function getSite(ctx: SiteContext = {}, opts: Pick<CmsOptions, 'deps'> = {}): Promise<Site> {
  const read = async (): Promise<Site> =>
    (await getSingleton('site_settings', 'site', normalizeSite, { cache: ctx.cache, ...opts }))
      .data;
  if (!ctx.request) return read();
  let memo = perRequest.get(ctx.request);
  if (!memo) {
    memo = read();
    perRequest.set(ctx.request, memo);
  }
  return memo;
}
