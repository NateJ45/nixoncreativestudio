/* ============================================================================
   Theme toggle behaviour
   ============================================================================
   Foundation, edit with care.

   Drives every [data-theme-toggle] button (ThemeToggle.astro). Runs on each
   astro:page-load, which fires on the first load and after every View
   Transitions navigation (the header is swapped, so the buttons are new);
   a data-bound guard stops a button being wired twice.

   Contract shared with the anti-FOUC bootstrap in BaseLayout.astro:
   localStorage["ncs-theme"] = "light" | "dark" | "system", missing = system.

   Circular reveal (overhaul 4.5): when a click changes the visible theme, the
   new theme grows out of the button in a circle. It is a same-document View
   Transition: html.theme-reveal is set for the length of the swap only, and
   the ::view-transition styles in ThemeToggle.astro hang off that class, so
   the page-navigation transitions (the root fade, the 3.1 reel morph, the
   static header and footer) never see it. The swap is instant, with no
   transition at all, under prefers-reduced-motion, while the visitor has
   paused motion (html[data-motion-paused]), and where startViewTransition is
   missing.
   ============================================================================ */

import { isMotionPaused, prefersReducedMotion } from './motion';

type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'ncs-theme';
const ORDER: Theme[] = ['light', 'dark', 'system'];

// The aria-label names the current state and what a click will do next.
const LABELS: Record<Theme, string> = {
  light: 'Theme: light. Click to switch to dark.',
  dark: 'Theme: dark. Click to switch to system.',
  system: 'Theme: system. Click to switch to light.',
};

/** Stored choice, or "system" when missing or when storage is blocked. */
function readStored(): Theme {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'light' || value === 'dark' || value === 'system') return value;
  } catch {
    /* localStorage blocked (private mode, cookies off). */
  }
  return 'system';
}

const systemQuery = (): MediaQueryList => window.matchMedia('(prefers-color-scheme: dark)');

/** Whether a theme choice resolves to dark right now. */
const resolvesDark = (theme: Theme): boolean =>
  theme === 'dark' || (theme === 'system' && systemQuery().matches);

/** Toggle .dark and the color-scheme style on <html>, the same way the bootstrap does. */
function applyTheme(theme: Theme): void {
  const dark = resolvesDark(theme);
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
}

/** Point every toggle on the page at the current choice (icon and label). */
function render(theme: Theme): void {
  document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((button) => {
    button.dataset.themeChoice = theme;
    button.setAttribute('aria-label', LABELS[theme]);
    button.title = LABELS[theme];
  });
}

// One OS-theme listener for the life of the tab (module scripts run once, so
// this never stacks up across navigations). It only acts while the visitor's
// choice is "system".
/** Class on <html> that scopes the reveal styles to the theme swap. */
const REVEAL_CLASS = 'theme-reveal';

type ViewTransitionDoc = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void> };
};

/** Apply a theme, revealing it in a circle from the button when motion is allowed. */
function switchTheme(theme: Theme, button: HTMLElement): void {
  const doc = document as ViewTransitionDoc;
  const root = document.documentElement;
  const changes = resolvesDark(theme) !== root.classList.contains('dark');
  const swap = () => {
    applyTheme(theme);
    render(theme);
  };
  if (
    !changes ||
    !doc.startViewTransition ||
    prefersReducedMotion() ||
    isMotionPaused() ||
    root.classList.contains(REVEAL_CLASS)
  ) {
    swap();
    return;
  }
  // The circle starts at the button's centre and ends just past the farthest
  // corner of the viewport.
  const box = button.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  root.style.setProperty('--reveal-x', `${x}px`);
  root.style.setProperty('--reveal-y', `${y}px`);
  root.style.setProperty('--reveal-r', `${Math.ceil(radius)}px`);
  root.classList.add(REVEAL_CLASS);
  const done = () => {
    root.classList.remove(REVEAL_CLASS);
    ['--reveal-x', '--reveal-y', '--reveal-r'].forEach((prop) => root.style.removeProperty(prop));
  };
  doc.startViewTransition(swap).finished.then(done, done);
}

let listening = false;
function listenToSystem(): void {
  if (listening) return;
  listening = true;
  systemQuery().addEventListener('change', () => {
    if (readStored() === 'system') applyTheme('system');
  });
}

export function initThemeToggles(): void {
  listenToSystem();
  const current = readStored();
  document
    .querySelectorAll<HTMLButtonElement>('[data-theme-toggle]:not([data-bound])')
    .forEach((button) => {
      button.dataset.bound = 'true';
      button.addEventListener('click', () => {
        const now = readStored();
        const next = ORDER[(ORDER.indexOf(now) + 1) % ORDER.length];
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch {
          /* Storage blocked: the theme still changes for this page view. */
        }
        switchTheme(next, button);
      });
    });
  render(current);
}
