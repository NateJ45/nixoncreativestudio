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
   ============================================================================ */

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

/** Toggle .dark and the color-scheme style on <html>, the same way the bootstrap does. */
function applyTheme(theme: Theme): void {
  const dark = theme === 'dark' || (theme === 'system' && systemQuery().matches);
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
        applyTheme(next);
        render(next);
      });
    });
  render(current);
}
