/* ============================================================================
   ThemeToggle
   ============================================================================
   Foundation, edit with care.

   React island that cycles the site theme through three states:
     light -> dark -> system -> light ...

   "System" means "follow the OS preference," and the toggle still listens
   for prefers-color-scheme changes while in that mode so the page updates
   live when the OS flips between day/night themes.

   Persistence:
     localStorage key "ncs-theme" with values "light" | "dark" | "system".
     The anti-FOUC script in BaseLayout.astro reads the same key on first
     paint, so the visitor's choice survives reloads with no flash.

   Render order:
     The component renders a placeholder icon during SSR and on the very
     first client render (before useEffect reads from localStorage). This
     avoids a hydration mismatch when the stored choice differs from the
     server-rendered default. Width is fixed via size-* so layout doesn't
     shift when the real icon swaps in.

   Used by:
     - Header.astro (desktop, after the nav <ul>)
     - MobileNav.tsx (inside the drawer)
   ============================================================================ */

import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';

import { Button } from './ui/button';

type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'ncs-theme';

/**
 * Resolve the effective theme (light/dark) given the user's choice and the
 * current system preference. "system" defers to matchMedia; "light"/"dark"
 * are explicit.
 */
function resolveEffective(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

/**
 * Apply a theme to <html>: toggle the .dark class and the color-scheme
 * inline style so native widgets (scrollbars, form controls) follow.
 */
function applyTheme(theme: Theme): void {
  const effective = resolveEffective(theme);
  const root = document.documentElement;
  root.classList.toggle('dark', effective === 'dark');
  root.style.colorScheme = effective;
}

/**
 * Read the stored choice. Defaults to "system" if the key is missing or
 * localStorage is blocked (private mode, cookies disabled).
 */
function readStored(): Theme {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'light' || value === 'dark' || value === 'system') return value;
  } catch {
    /* swallow: localStorage blocked. */
  }
  return 'system';
}

export default function ThemeToggle() {

  // Initial state matches the SSR placeholder. The useEffect below pulls
  // the real value from localStorage on the client. Until then we render
  // a neutral icon so hydration doesn't mismatch.
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState<boolean>(false);

  // On mount, hydrate state from localStorage. Don't re-apply the theme
  // here, the anti-FOUC script in BaseLayout already did that on first
  // paint; we just need to know what the current choice is so the icon
  // matches.
  useEffect(() => {
    setTheme(readStored());
    setMounted(true);
  }, []);

  // Listen for OS theme changes when in "system" mode so the page flips
  // live. Re-binds whenever the chosen theme changes; if the user moves
  // off "system," the listener becomes a no-op for the change handler.
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  /**
   * Cycle through the three states and persist + apply.
   * Order: light -> dark -> system -> light.
   */
  function cycle(): void {
    const next: Theme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* swallow: localStorage blocked. */
    }
    applyTheme(next);
  }

  // Icon and aria-label reflect what the toggle is CURRENTLY set to,
  // not what the next click will switch it to. The aria-label includes
  // the next state so screen reader users know what the click will do.
  const icon =
    !mounted     ? <Sun     className="size-5" /> :
    theme === 'light' ? <Sun     className="size-5" /> :
    theme === 'dark'  ? <Moon    className="size-5" /> :
                        <Monitor className="size-5" />;

  const label =
    !mounted     ? 'Toggle theme' :
    theme === 'light' ? 'Theme: light. Click to switch to dark.' :
    theme === 'dark'  ? 'Theme: dark. Click to switch to system.' :
                        'Theme: system. Click to switch to light.';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycle}
      aria-label={label}
      title={label}
      className="text-text hover:text-accent"
    >
      {icon}
    </Button>
  );
}
