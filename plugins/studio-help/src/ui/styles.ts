// Safe to edit. The plugin's stylesheet, injected once into the admin page as a
// <style> tag (the admin's own Tailwind build only contains the classes the admin
// itself uses, so a plugin cannot rely on utility classes). Colours come from the
// admin's own theme variables (`--color-kumo-*`, which follow its light/dark switch
// on <html data-mode>), each with a plain fallback, so the tour matches both themes
// without a theme check of its own. Motion is opt-in: transitions only exist inside
// `prefers-reduced-motion: no-preference`.
import { useEffect } from 'react';

const STYLE_ID = 'studio-help-css';

export const css = `
.sh-root, .sh-root * { box-sizing: border-box; }
.sh-root {
  --sh-bg: var(--color-kumo-base, #ffffff);
  --sh-bg-soft: var(--color-kumo-elevated, #f6f7f9);
  --sh-text: var(--text-color-kumo-default, #16181d);
  --sh-muted: var(--text-color-kumo-subtle, #5b6270);
  --sh-line: var(--color-kumo-line, rgba(20, 22, 28, 0.14));
  --sh-brand: var(--color-kumo-brand, #2457d6);
  --sh-brand-hover: var(--color-kumo-brand-hover, #1b45b0);
  --sh-on-brand: #ffffff;
  color: var(--sh-text);
  font: inherit;
}

/* ---- the tour ---- */
.sh-backdrop {
  position: fixed; inset: 0; z-index: 10000;
  background: rgba(8, 10, 16, 0.55);
}
.sh-backdrop[data-spot="true"] { background: transparent; }
.sh-spot {
  position: fixed; z-index: 10000; pointer-events: none; border-radius: 10px;
  box-shadow: 0 0 0 9999px rgba(8, 10, 16, 0.58), 0 0 0 3px var(--sh-brand);
}
.sh-card {
  position: fixed; z-index: 10001;
  width: min(26rem, calc(100vw - 1.5rem));
  max-height: calc(100vh - 1.5rem); overflow: auto;
  background: var(--sh-bg); color: var(--sh-text);
  border: 1px solid var(--sh-line); border-radius: 14px;
  padding: 1.25rem 1.25rem 1rem;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
}
.sh-card:focus { outline: none; }
.sh-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.sh-step { font-size: 0.8125rem; color: var(--sh-muted); margin: 0 0 0.35rem; }
.sh-title { font-size: 1.25rem; line-height: 1.25; font-weight: 650; margin: 0 0 0.6rem; color: var(--sh-text); font-family: inherit; text-transform: none; letter-spacing: normal; }
.sh-page h1, .sh-page h2, .sh-topic h3 { color: var(--sh-text); font-family: inherit; text-transform: none; letter-spacing: normal; }
.sh-body p { margin: 0 0 0.7rem; line-height: 1.5; font-size: 0.9375rem; }
.sh-body p:last-child { margin-bottom: 0; }
.sh-open { display: inline-block; margin-top: 0.75rem; font-size: 0.9375rem; color: var(--text-color-kumo-link, var(--sh-brand)); text-decoration: underline; text-underline-offset: 2px; }
.sh-dots { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 1rem 0 0.9rem; }
.sh-dot { width: 0.75rem; height: 0.75rem; border-radius: 999px; border: 1px solid var(--sh-muted); background: transparent; padding: 0; cursor: pointer; }
.sh-dot[aria-current="step"] { background: var(--sh-brand); border-color: var(--sh-brand); }
.sh-actions { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.sh-actions-right { display: flex; gap: 0.5rem; }

/* ---- buttons (used by the tour, the widget and the Help page) ---- */
.sh-btn {
  font: inherit; font-size: 0.9375rem; font-weight: 550; line-height: 1.2;
  min-height: 2.5rem; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer;
  border: 1px solid var(--sh-line); background: var(--sh-bg-soft); color: var(--sh-text);
}
.sh-btn:hover { border-color: var(--sh-muted); }
.sh-btn-primary { background: var(--sh-brand); border-color: var(--sh-brand); color: var(--sh-on-brand); }
.sh-btn-primary:hover { background: var(--sh-brand-hover); border-color: var(--sh-brand-hover); }
.sh-btn-link { background: transparent; border-color: transparent; color: var(--sh-muted); text-decoration: underline; text-underline-offset: 2px; padding-left: 0.25rem; padding-right: 0.25rem; }
.sh-btn:disabled { opacity: 0.45; cursor: default; }
.sh-root :focus-visible { outline: 3px solid var(--sh-brand); outline-offset: 2px; }

/* ---- the dashboard widget ---- */
.sh-widget p { margin: 0 0 0.75rem; line-height: 1.5; }
.sh-links { list-style: none; margin: 1rem 0 0; padding: 0; display: grid; gap: 0.5rem; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); }
.sh-links a { display: block; padding: 0.6rem 0.75rem; border: 1px solid var(--sh-line); border-radius: 8px; color: var(--sh-text); text-decoration: none; min-height: 2.75rem; }
.sh-links a:hover { border-color: var(--sh-brand); }
.sh-links strong { display: block; font-weight: 600; }
.sh-links span { display: block; font-size: 0.8125rem; color: var(--sh-muted); }

/* ---- the Help page ---- */
.sh-page { max-width: 54rem; }
.sh-page h1 { font-size: 1.75rem; font-weight: 650; margin: 0 0 0.5rem; }
.sh-page h2 { font-size: 1.2rem; font-weight: 650; margin: 2rem 0 0.6rem; }
.sh-page p { line-height: 1.55; margin: 0 0 0.75rem; }
.sh-table { width: 100%; border-collapse: collapse; font-size: 0.9375rem; }
.sh-table th, .sh-table td { text-align: left; vertical-align: top; padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--sh-line); }
.sh-table th { font-weight: 600; color: var(--sh-muted); font-size: 0.8125rem; }
.sh-table a { color: var(--text-color-kumo-link, var(--sh-brand)); text-decoration: underline; text-underline-offset: 2px; }
.sh-note { font-size: 0.8125rem; color: var(--sh-muted); display: block; margin-top: 0.2rem; }
.sh-topic { border: 1px solid var(--sh-line); border-radius: 10px; padding: 0.85rem 1rem; margin: 0 0 0.75rem; background: var(--sh-bg-soft); }
.sh-topic h3 { font-size: 1rem; margin: 0 0 0.35rem; font-weight: 650; }
.sh-topic p { margin: 0 0 0.5rem; }
.sh-topic p:last-child { margin-bottom: 0; }
.sh-steps { padding-left: 1.25rem; margin: 0 0 1rem; }
.sh-steps li { margin: 0 0 0.6rem; line-height: 1.5; }
.sh-steps a { color: var(--text-color-kumo-link, var(--sh-brand)); text-decoration: underline; text-underline-offset: 2px; white-space: nowrap; }
.sh-steps a::before { content: "\\2192\\00a0"; }

/* ---- the per-screen panel in the editor ---- */
.sh-panel p { margin: 0 0 0.6rem; line-height: 1.5; font-size: 0.875rem; }
.sh-panel p:last-child { margin-bottom: 0; }
.sh-panel strong { font-weight: 650; }

@media (prefers-reduced-motion: no-preference) {
  .sh-card, .sh-spot { transition: top 160ms ease, left 160ms ease; }
}
@media (max-width: 640px) {
  .sh-table thead { display: none; }
  .sh-table tr { display: block; border-bottom: 1px solid var(--sh-line); padding: 0.4rem 0; }
  .sh-table td { display: block; border: 0; padding: 0.2rem 0.25rem; }
}
`;

/** Insert the stylesheet once. Safe to call from every component. */
export function useStudioHelpStyles(): void {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = css;
    document.head.appendChild(el);
  }, []);
}
