/* ============================================================================
   MobileNav
   ============================================================================
   Foundation, edit with care.

   The small-viewport navigation: a hamburger Button that opens a full-screen
   panel (a shadcn Sheet under the hood, so focus-trap, Escape-to-close,
   scroll-lock, and the dialog ARIA all come for free).

   Theme-aware to match the rest of the site: a light surface with dark type,
   NCS-blue links, and a soft brand glow in light mode; navy with white type,
   sky links, and the drifting aurora in dark. Either way it reads as a "big
   moment" brand surface, far more like a design studio's menu than the default
   side-drawer. The brand-blue CTA and the theme toggle carry across both.

   The flat six-item nav is given body the way a church mega-menu leans on
   sub-items: each big Bebas label carries a short, honest descriptor, the
   rows are hairline-divided like an editorial index, and they cascade in on
   open. No 01-06 numbering: that marker is reserved for the genuinely ordered
   Process band, and a numbered nav would read as scaffolding here.

   Rendered inside Header.astro (hidden at >= md). The nav links come from
   Header so the desktop nav and this panel never drift; add a link there and
   it appears in both. Descriptors live in the DESCRIPTIONS map below; a link
   with no entry simply renders its label, so adding a nav item never breaks
   this menu.
   ============================================================================ */

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Menu, X } from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetClose,
} from './ui/sheet';
import { Button } from './ui/button';

// Social glyphs as inline SVG. lucide-react dropped its brand/logo icons in
// recent versions (trademark reasons), so these are the classic Feather
// stroke marks, drawn in currentColor so they inherit the link's text color.
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

export interface MobileNavLink {
  label: string;
  href: string;
  /**
   * Short line shown under the big label: the menu item's "Title attribute" in
   * the EmDash menu editor. Honest and tight, it names what the page actually
   * is. Missing means the label renders alone.
   */
  descriptor?: string;
  /** "_blank" opens the item in a new tab. */
  target?: string;
}

// Every value below is passed in by Header.astro from the Site settings entry in
// the CMS. This file is a React island, so it must not import the site module
// (that would pull the CMS reader into the browser bundle); props are the pattern.
export interface MobileNavProps {
  links: MobileNavLink[];
  /** Accessible label announced to assistive tech when the panel opens. */
  studioName: string;
  /** Text of the "Start a project" button. */
  ctaLabel: string;
  email: string;
  emailHref: string;
  phone: string;
  phoneHref: string;
  instagramUrl: string;
  linkedinUrl: string;
}

// Shared focus ring for the custom links inside the panel. Theme-aware so the
// ring + offset stay visible on either surface: an accent (NCS blue) ring on a
// light offset in light mode, a sky ring on a navy offset in dark.
const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-soft';

export default function MobileNav({
  links,
  studioName,
  ctaLabel,
  email,
  emailHref,
  phone,
  phoneHref,
  instagramUrl,
  linkedinUrl,
}: MobileNavProps) {
  // Social destinations. A network change is an edit in Site settings.
  const socials = [
    { label: 'Instagram', href: instagramUrl, Icon: InstagramIcon },
    { label: 'LinkedIn', href: linkedinUrl, Icon: LinkedinIcon },
  ];

  // Sheet owns its open state; link clicks set it back to false so the panel
  // doesn't linger over the next page.
  const [open, setOpen] = useState<boolean>(false);

  // Server-render only the trigger button; mount the Radix Sheet after hydration.
  // The Sheet's portal does not render cleanly inside Astro's SSR, which used to
  // force client:only on this island, and client:only fetched React at page load
  // on every phone view (measured 2026-09-04: React + this bundle downloaded at
  // high priority inside the LCP window). With the button as plain SSR markup the
  // island can hydrate at idle instead; the button markup below is identical
  // before and after, so nothing shifts.
  const [mounted, setMounted] = useState<boolean>(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Current path, read when the panel opens so the active item is right even
  // after a View Transitions navigation (which doesn't remount this island).
  const [path, setPath] = useState<string>('');
  useEffect(() => {
    if (open) setPath(window.location.pathname.replace(/\/+$/, ''));
  }, [open]);

  const isActive = (href: string): boolean => {
    const h = href.replace(/\/+$/, '');
    if (h === '') return path === '';
    return path === h || path.startsWith(`${h}/`);
  };

  // Stagger helper: each row animates in a beat after the previous one.
  const delay = (ms: number): CSSProperties => ({ '--mnav-delay': `${ms}ms` }) as CSSProperties;

  const trigger = (
    <Button
      variant="ghost"
      size="icon-lg"
      aria-label="Open menu"
      className="mobile-trigger size-11 text-heading"
    >
      <Menu className="size-6" />
    </Button>
  );

  if (!mounted) return trigger;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>

      {/* Full-screen panel, theme-aware: a light surface with dark type in light
          mode, navy with white type in dark. showCloseButton off so we place our
          own close control in the top bar; overflow-y-auto so a short phone in
          landscape can still scroll the whole menu.

          The !w-full / !max-w-full / !border-0 important modifiers are
          deliberate: the Sheet primitive sets its width and a left border via
          data-[side=right]: variants, whose attribute selector outranks a plain
          utility, so only !important reliably makes this go full-screen. */}
      <SheetContent
        side="right"
        showCloseButton={false}
        className="!w-full !max-w-full overflow-y-auto !border-0 bg-bg-soft p-0 text-text"
      >
        {/* Entrance cascade, kept in-file so the whole menu lives in one place.
            The opacity:0 start sits inside the no-preference query, so with
            reduced motion every row is simply visible from the first frame. */}
        <style>{`
          @keyframes mnav-in {
            from { opacity: 0; transform: translateY(14px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @media (prefers-reduced-motion: no-preference) {
            .mnav-item {
              opacity: 0;
              animation: mnav-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
              animation-delay: var(--mnav-delay, 0ms);
            }
          }
          /* Panel padding carries the safe-area insets so the wordmark + close
             button clear the notch and the bottom contact block clears the home
             indicator when the page runs under viewport-fit=cover. env() is 0 on
             non-notched devices, so this reads as a flat --spacing-l there. */
          .mnav-shell {
            padding-top: calc(var(--spacing-l) + env(safe-area-inset-top));
            padding-bottom: calc(var(--spacing-l) + env(safe-area-inset-bottom));
            padding-left: calc(var(--spacing-l) + env(safe-area-inset-left));
            padding-right: calc(var(--spacing-l) + env(safe-area-inset-right));
          }
        `}</style>

        <div className="mnav-shell relative isolate flex min-h-full flex-col">
          {/* Atmosphere, theme-aware: a soft static brand glow in light mode, the
              drifting navy aurora in dark. Decorative; the aurora freezes under
              reduced motion via the global rule, the light glow is static. */}
          <div
            className="bg-mesh-soft pointer-events-none absolute inset-0"
            aria-hidden="true"
          ></div>

          {/* Top bar: wordmark (doubles as the dialog's accessible name) + close. */}
          <div className="relative z-10 flex items-center justify-between gap-m">
            <SheetTitle className="font-display text-2xl tracking-[0.02em] text-heading">
              {studioName}
            </SheetTitle>
            {/* Visually hidden, but wired to the dialog via aria-describedby by
                Radix so screen readers announce what this panel contains. */}
            <SheetDescription className="sr-only">
              Site navigation and contact details.
            </SheetDescription>
            <SheetClose asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label="Close menu"
                className="size-11 text-heading hover:text-link"
              >
                <X className="size-6" />
              </Button>
            </SheetClose>
          </div>

          {/* Positioning line, echoing the hero so the brand voice carries in. */}
          <p
            className="mnav-item relative z-10 mt-m max-w-[34ch] font-body text-base leading-[1.5] text-text-muted"
            style={delay(60)}
          >
            For churches, schools, nonprofits, and small businesses, wherever you are.
          </p>

          {/* Big editorial nav. Hairline dividers give the flat list structure. */}
          <nav
            aria-label="Mobile primary"
            className="relative z-10 mt-l flex flex-col divide-y divide-border border-y border-border"
          >
            {links.map(({ label, href, descriptor, target }, i) => {
              const active = isActive(href);
              const desc = descriptor;
              return (
                <a
                  key={href}
                  href={href}
                  target={target}
                  rel={target === '_blank' ? 'noopener noreferrer' : undefined}
                  onClick={() => setOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={`mnav-item group flex items-center justify-between gap-m rounded-md py-4 no-underline ${focusRing}`}
                  style={delay(140 + i * 55)}
                >
                  <span className="flex flex-col gap-0.5">
                    <span
                      className={
                        'font-display text-4xl leading-[0.95] tracking-[0.01em] transition-colors duration-150 group-hover:text-link group-focus-visible:text-link ' +
                        (active ? 'text-link' : 'text-heading')
                      }
                    >
                      {label}
                    </span>
                    {desc && <span className="font-body text-sm text-text-muted">{desc}</span>}
                  </span>

                  {/* Arrow is the non-color focus/hover cue: it slides in from
                      the left. On the active row it stays put, in amber. */}
                  <span
                    aria-hidden="true"
                    className={
                      'text-2xl transition-all duration-200 ' +
                      (active
                        ? 'translate-x-0 text-link opacity-100'
                        : '-translate-x-2 text-link opacity-0 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100')
                    }
                  >
                    &rarr;
                  </span>
                </a>
              );
            })}
          </nav>

          {/* Primary conversion action, matching the hero's amber CTA. */}
          <div className="mnav-item relative z-10 mt-l" style={delay(140 + links.length * 55 + 40)}>
            <Button asChild variant="brand" size="cta" className="shine w-full">
              <a href="/contact/" onClick={() => setOpen(false)}>
                {ctaLabel}
              </a>
            </Button>
          </div>

          {/* Get in touch: direct contact, socials, and the theme toggle.
              mt-auto pins this to the bottom when the menu is shorter than the
              viewport, and it scrolls naturally when it isn't. */}
          <div
            className="mnav-item relative z-10 mt-auto pt-l"
            style={delay(140 + links.length * 55 + 100)}
          >
            <p className="font-mono text-xs tracking-[0.18em] text-text-muted uppercase">
              Get in touch
            </p>
            <div className="mt-s flex flex-col gap-1">
              <a
                href={emailHref}
                className={`inline-flex min-h-11 w-fit items-center rounded-sm text-link no-underline transition-colors duration-150 hover:underline hover:underline-offset-2 ${focusRing}`}
              >
                {email}
              </a>
              <a
                href={phoneHref}
                className={`inline-flex min-h-11 w-fit items-center rounded-sm text-link no-underline transition-colors duration-150 hover:underline hover:underline-offset-2 ${focusRing}`}
              >
                {phone}
              </a>
            </div>

            <div className="mt-m flex items-center justify-between">
              <div className="flex items-center gap-xs">
                {socials.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-md text-text-muted transition-colors duration-150 hover:bg-heading/5 hover:text-heading ${focusRing}`}
                  >
                    <Icon className="size-5" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
