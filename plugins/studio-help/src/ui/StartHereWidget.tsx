// Safe to edit. The dashboard widget "Start here": a short welcome, a Take-the-tour
// button, and a few quick links. It is also what opens the tour on its own the first
// time a person lands on the dashboard (which is where EmDash sends everyone after
// sign-in). EmDash gives a plugin no global slot that runs on every admin screen, so
// "first sign-in" is implemented as "first time this user's dashboard shows this
// tour id". The decision is the pure `shouldAutoStart` in engine.ts.
import { useCallback, useEffect, useRef, useState } from 'react';
import { adminHref, shouldAutoStart } from '../engine.ts';
import { HELP_PAGE_URL } from '../constants.ts';
import { fetchState, readLocalSeen } from './api.ts';
import { useStudioHelpStyles } from './styles.ts';
import { TourModal } from './TourModal.tsx';
import { useHelpContent, useRecordSeen } from './useHelp.ts';

/** Per-tab guard: once the tour auto-opened in this tab session it will not again. */
const SESSION_KEY = 'studio-help:auto-opened';

/**
 * Resolve true once no other dialog is open (checked twice a second), false if the
 * widget went away or something stayed open for two minutes. On false nothing is
 * recorded, so the tour simply shows on the next dashboard visit.
 */
function whenNoOtherDialog(isAlive: () => boolean, maxMs = 120_000): Promise<boolean> {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      if (!isAlive()) return resolve(false);
      const other = document.querySelector('[role="dialog"]:not(.sh-card), dialog[open]');
      if (!other) return resolve(true);
      if (Date.now() - started > maxMs) return resolve(false);
      setTimeout(tick, 500);
    };
    tick();
  });
}

export function StartHereWidget() {
  useStudioHelpStyles();
  const { content, error } = useHelpContent();
  const [open, setOpen] = useState(false);
  const decided = useRef(false);
  const mounted = useRef(true);
  const recordSeen = useRecordSeen(content?.tour.id);

  // Track unmounting separately from the decision effect, so React StrictMode's
  // mount, unmount, mount cycle in development cannot cancel the pending decision.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // First-visit check, once the content has loaded.
  useEffect(() => {
    if (!content || decided.current) return;
    decided.current = true;
    const alive = () => mounted.current;
    (async () => {
      let effective = null;
      try {
        // The server record is the truth when it can be reached (it also makes a
        // "reset" work). Only if it cannot be reached do we use this browser's copy,
        // so a server hiccup cannot make the tour loop or vanish.
        effective = (await fetchState()).seen;
      } catch {
        const local = readLocalSeen();
        effective = local && local.tourId === content.tour.id ? local : null;
      }
      let already = false;
      try {
        already = window.sessionStorage.getItem(SESSION_KEY) === content.tour.id;
      } catch {
        // sessionStorage blocked
      }
      if (alive() && !already && shouldAutoStart(effective, content.tour)) {
        // EmDash shows its own "Welcome" dialog on a brand-new account's first sign-in.
        // Wait for it to be dismissed so two modals never fight over focus.
        const clear = await whenNoOtherDialog(alive);
        if (!clear) return;
        try {
          window.sessionStorage.setItem(SESSION_KEY, content.tour.id);
        } catch {
          // ignore
        }
        recordSeen('auto');
        setOpen(true);
      }
    })();
  }, [content, recordSeen]);

  const onClose = useCallback(
    (how: 'done' | 'skipped') => {
      recordSeen(how);
      setOpen(false);
    },
    [recordSeen],
  );

  if (error) {
    return (
      <div className="sh-root sh-widget">
        <p>The help tour could not be loaded just now. Reload the page to try again.</p>
        <p>
          <a href={HELP_PAGE_URL}>Open the Help page</a>
        </p>
      </div>
    );
  }
  if (!content) return <div className="sh-root sh-widget" aria-busy="true" />;

  const { tour, help } = content;
  return (
    <div className="sh-root sh-widget">
      <p>{tour.intro || help.intro}</p>
      <p>
        <button type="button" className="sh-btn sh-btn-primary" onClick={() => setOpen(true)}>
          Take the tour
        </button>{' '}
        <a className="sh-btn" href={HELP_PAGE_URL} style={{ display: 'inline-block' }}>
          Open the Help page
        </a>
      </p>
      {help.quickLinks.length > 0 && (
        <ul className="sh-links">
          {help.quickLinks.map((l) => (
            <li key={l.path}>
              <a href={adminHref(l.path)}>
                <strong>{l.label}</strong>
                {l.description && <span>{l.description}</span>}
              </a>
            </li>
          ))}
        </ul>
      )}
      {open && <TourModal title={tour.title} steps={tour.steps} onClose={onClose} />}
    </div>
  );
}
