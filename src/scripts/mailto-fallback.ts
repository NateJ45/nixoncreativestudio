/* ============================================================================
   Mailto graceful fallback
   ============================================================================
   Safe to edit.

   The problem this solves: a mailto: link only does anything if the visitor's
   device has an app registered to handle it. On a desktop with no configured
   mail client (common on Windows without Outlook or Mail set as the default),
   clicking "Email me" or an email address does nothing at all, a silent
   dead-end on the page whose whole job is to start a conversation.

   What this does: it lets the click proceed normally (so visitors who DO have a
   mail app still get their composer), then a beat later checks whether anything
   actually took over. If the browser still has focus, nothing launched, so it
   copies the address to the clipboard and shows a small confirmation toast with
   the address. The click always produces something useful instead of nothing.

   How "did an app open?" is detected: launching a desktop mail app, or opening
   a webmail tab, moves focus away from this document. So if the window never
   blurred and still has focus after a short delay, nothing handled the link.
   This is a heuristic, not perfect, but it only ever ADDS a helpful toast in
   the failure case; it never blocks or delays the real mailto.

   Progressive + idempotent: one delegated listener on document, registered once
   (guarded by a window flag) so it survives View Transitions navigations
   without double-binding. With this script absent, the mailto links behave
   exactly as before for anyone who has a mail app.
   ============================================================================ */

const FOCUS_CHECK_DELAY = 800; // ms to wait before deciding nothing opened
const TOAST_DURATION = 6000; // ms the confirmation stays up

// Pull the bare address out of a mailto: href, dropping any ?subject=... params
// and decoding %20 and friends so the copied value is the clean address.
function emailFromHref(href: string): string {
  const raw = href.replace(/^mailto:/i, '').split('?')[0];
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

// A single reused toast element. role=status + aria-live=polite so a screen
// reader announces it without stealing focus.
let toastEl: HTMLDivElement | null = null;
let toastTimer: number | undefined;

function showToast(message: string): void {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'ncs-toast';
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = message;
  // Force a reflow so the hidden starting state is committed, then reveal. This
  // runs the CSS transition without depending on requestAnimationFrame (which is
  // paused on hidden/background tabs and would leave the toast stuck invisible).
  void toastEl.offsetWidth;
  toastEl.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastEl?.classList.remove('is-visible');
  }, TOAST_DURATION);
}

async function offerFallback(email: string): Promise<void> {
  let copied = false;
  try {
    if (navigator.clipboard?.writeText) {
      // Race the write against a short timeout so a hung or blocked clipboard
      // (no user activation, denied permission) can never swallow the toast.
      await Promise.race([
        navigator.clipboard.writeText(email),
        new Promise<never>((_, reject) =>
          window.setTimeout(() => reject(new Error('clipboard timeout')), 500),
        ),
      ]);
      copied = true;
    }
  } catch {
    /* clipboard blocked (insecure context / permissions / timeout); fall through
       to the no-copy message so the address is at least shown in the toast. */
  }
  showToast(
    copied
      ? `No mail app opened, so I copied my email to your clipboard: ${email}`
      : `No mail app opened. Email me at ${email}`,
  );
}

function onClick(event: MouseEvent): void {
  // Skip modified clicks (open-in-new-tab etc.) and non-primary buttons, and
  // anything a prior handler already cancelled.
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }

  const target = event.target as Element | null;
  const link = target?.closest?.('a[href^="mailto:"]') as HTMLAnchorElement | null;
  if (!link) return;

  const email = emailFromHref(link.getAttribute('href') || '');
  if (!email) return;

  // Let the default mailto fire. Then decide whether anything handled it: a mail
  // app or a webmail tab moves focus off this document. Watch for that blur
  // explicitly (more reliable than a single hasFocus() snapshot) and also check
  // hasFocus() at the deadline as a backstop.
  let focusLeft = false;
  const markLeft = () => {
    focusLeft = true;
  };
  window.addEventListener('blur', markLeft, { once: true });

  window.setTimeout(() => {
    window.removeEventListener('blur', markLeft);
    if (focusLeft || !document.hasFocus()) return; // an app/tab took over: all good
    void offerFallback(email);
  }, FOCUS_CHECK_DELAY);
}

function init(): void {
  const w = window as unknown as { __ncsMailtoBound?: boolean };
  if (w.__ncsMailtoBound) return;
  w.__ncsMailtoBound = true;
  // Delegated on document, which is never swapped by View Transitions, so this
  // one listener covers every page and every navigation.
  document.addEventListener('click', onClick);
}

document.addEventListener('astro:page-load', init);
init();

export {};
