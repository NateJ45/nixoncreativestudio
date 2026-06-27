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
import ThemeToggle from './ThemeToggle';
import { site } from '../data/site';

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
}

export interface MobileNavProps {
  links: MobileNavLink[];
  /** Accessible label announced to assistive tech when the panel opens. */
  studioName: string;
}

// Short descriptor shown under each big nav label, keyed by the exact href
// from Header. Honest and tight: it names what the page actually is, never a
// page we don't have. A missing key just renders the label with no descriptor.
const DESCRIPTIONS: Record<string, string> = {
  '/work/': 'Selected client projects',
  '/services': 'What I build, and how',
  '/about': 'The studio, and me',
  '/journal/': 'Notes on the work',
  '/contact': 'Email, phone, or the form',
};

// Social destinations, driven from site.ts so a network change flows here.
const socials = [
  { label: 'Instagram', href: site.social.instagram, Icon: InstagramIcon },
  { label: 'LinkedIn', href: site.social.linkedin, Icon: LinkedinIcon },
];

// Shared focus ring for the custom links inside the panel. Theme-aware so the
// ring + offset stay visible on either surface: an accent (NCS blue) ring on a
// light offset in light mode, a sky ring on a navy offset in dark.
const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-soft ' +
  'dark:focus-visible:ring-secondary dark:focus-visible:ring-offset-primary';

export default function MobileNav({ links, studioName }: MobileNavProps) {
  // Sheet owns its open state; link clicks set it back to false so the panel
  // doesn't linger over the next page.
  const [open, setOpen] = useState<boolean>(false);

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

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Open menu"
          className="mobile-trigger size-11 text-heading"
        >
          <Menu className="size-6" />
        </Button>
      </SheetTrigger>

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
        className="!w-full !max-w-full overflow-y-auto !border-0 bg-bg-soft p-0 text-text dark:bg-primary dark:text-primary-foreground"
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
            className="bg-mesh-soft pointer-events-none absolute inset-0 dark:hidden"
            aria-hidden="true"
          ></div>
          <div
            className="bg-aurora pointer-events-none absolute inset-0 hidden opacity-60 dark:block"
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
              Site navigation, contact details, and theme options.
            </SheetDescription>
            <SheetClose asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label="Close menu"
                className="size-11 text-heading hover:text-link dark:text-primary-foreground dark:hover:text-secondary"
              >
                <X className="size-6" />
              </Button>
            </SheetClose>
          </div>

          {/* Positioning line, echoing the hero so the brand voice carries in. */}
          <p
            className="mnav-item relative z-10 mt-m max-w-[34ch] font-body text-base leading-[1.5] text-text-muted dark:text-primary-foreground/70"
            style={delay(60)}
          >
            For churches, schools, nonprofits, and small businesses, wherever you are.
          </p>

          {/* Big editorial nav. Hairline dividers give the flat list structure. */}
          <nav
            aria-label="Mobile primary"
            className="relative z-10 mt-l flex flex-col divide-y divide-border border-y border-border dark:divide-white/10 dark:border-white/10"
          >
            {links.map(({ label, href }, i) => {
              const active = isActive(href);
              const desc = DESCRIPTIONS[href];
              return (
                <a
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={`mnav-item group flex items-center justify-between gap-m rounded-md py-4 no-underline ${focusRing}`}
                  style={delay(140 + i * 55)}
                >
                  <span className="flex flex-col gap-0.5">
                    <span
                      className={
                        'font-display text-4xl leading-[0.95] tracking-[0.01em] transition-colors duration-150 group-hover:text-link group-focus-visible:text-link dark:group-hover:text-secondary dark:group-focus-visible:text-secondary ' +
                        (active ? 'text-link dark:text-tertiary' : 'text-heading dark:text-primary-foreground')
                      }
                    >
                      {label}
                    </span>
                    {desc && (
                      <span className="font-body text-sm text-text-muted dark:text-primary-foreground/65">{desc}</span>
                    )}
                  </span>

                  {/* Arrow is the non-color focus/hover cue: it slides in from
                      the left. On the active row it stays put, in amber. */}
                  <span
                    aria-hidden="true"
                    className={
                      'text-2xl transition-all duration-200 ' +
                      (active
                        ? 'translate-x-0 text-link opacity-100 dark:text-tertiary'
                        : '-translate-x-2 text-link opacity-0 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 dark:text-secondary')
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
              <a href="/contact" onClick={() => setOpen(false)}>
                Start a project
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
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-text-muted dark:text-primary-foreground/60">
              Get in touch
            </p>
            <div className="mt-s flex flex-col gap-1">
              <a
                href={site.emailHref}
                className={`inline-flex min-h-11 w-fit items-center rounded-sm text-link dark:text-secondary no-underline transition-colors duration-150 hover:underline hover:underline-offset-2 ${focusRing}`}
              >
                {site.email}
              </a>
              <a
                href={site.phoneHref}
                className={`inline-flex min-h-11 w-fit items-center rounded-sm text-link dark:text-secondary no-underline transition-colors duration-150 hover:underline hover:underline-offset-2 ${focusRing}`}
              >
                {site.phone}
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
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-md text-text-muted transition-colors duration-150 hover:bg-heading/5 hover:text-heading dark:text-primary-foreground/70 dark:hover:bg-white/10 dark:hover:text-primary-foreground ${focusRing}`}
                  >
                    <Icon className="size-5" />
                  </a>
                ))}
              </div>

              {/* Theme toggle. It paints itself text-text by default, which reads
                  fine on the light panel but would vanish on navy, so force the
                  icon white (and sky on hover) in dark mode only, via a descendant
                  override on its .theme-toggle hook. */}
              <div className="dark:[&_.theme-toggle:hover]:text-secondary dark:[&_.theme-toggle]:text-primary-foreground">
                <ThemeToggle className="size-11" />
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
