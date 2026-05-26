/* ============================================================================
   MobileNav
   ============================================================================
   Foundation, edit with care.

   React island that handles the small-viewport nav: a hamburger Button
   that triggers a shadcn Sheet drawer with the same nav links as the
   desktop Header.

   Rendered inside Header.astro and hidden at >= sm via Tailwind classes
   on the wrapper. The desktop <nav> in Header.astro is hidden below sm
   so only one nav is visible at any width.

   The nav model is passed in from Header.astro so both surfaces stay
   in sync. Add a link there and both the desktop nav and this drawer
   pick it up.
   ============================================================================ */

import { useState } from 'react';
import { Menu } from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet';
import { Button } from './ui/button';
import ThemeToggle from './ThemeToggle';

export interface MobileNavLink {
  num:   string;
  label: string;
  href:  string;
}

export interface MobileNavProps {
  links:      MobileNavLink[];
  /** Accessible label announced to assistive tech when the drawer opens. */
  studioName: string;
}

export default function MobileNav({ links, studioName }: MobileNavProps) {

  // Sheet controls its own open state via this React state. Closing on
  // link click is done by setting open back to false in the link's
  // onClick handler, so the drawer doesn't linger after navigation.
  const [open, setOpen] = useState<boolean>(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>

      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Open menu"
          className="text-heading"
        >
          <Menu className="size-6" />
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="bg-bg p-l">
        <SheetHeader className="flex flex-row items-center justify-between gap-m border-b border-border pb-m">
          <SheetTitle className="font-display text-2xl tracking-[0.01em] text-heading">
            {studioName}
          </SheetTitle>

          {/* Theme toggle inside the drawer so touch users can switch
              modes without a separate header control. Sits next to the
              wordmark, mirroring the desktop placement. */}
          <ThemeToggle />
        </SheetHeader>

        {/*
          Nav links. Vertical stack with comfortable padding so each link
          is a generous tap target on touch screens.
        */}
        <nav aria-label="Mobile primary" className="mt-l flex flex-col">
          {links.map(({ num, label, href }) => (
            <a
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-baseline gap-s rounded-md px-2 py-3 font-body text-lg text-text no-underline transition-colors duration-150 hover:text-accent focus-visible:bg-bg-soft focus-visible:text-accent focus-visible:outline-none"
            >
              {/* Section number prefix, same visual pattern as the
                  desktop nav. */}
              <span className="font-mono text-sm text-text-muted">{num}</span>
              {label}
            </a>
          ))}
        </nav>
      </SheetContent>

    </Sheet>
  );
}
