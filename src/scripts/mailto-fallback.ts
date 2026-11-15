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

   Copy on click (added with the elevate build): a mailto link that SHOWS the
   address as its words (the closing's email pill, the "Email" row in the top
   line's card, the address on /contact) also copies the address the moment it
   is clicked, and its words turn to "Copied" for two seconds. The mailto still
   fires, so a visitor with a mail app gets their composer AND the address on
   the clipboard. A link whose words are something else ("Email me") is left to
   the fallback alone. If nothing opened, the toast below still explains it,
   without copying a second time.
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

const COPIED_FOR = 2000; // ms the "Copied" label stays up

// The text node inside the link that holds the address, if the link shows it.
function addressNode(link: HTMLAnchorElement, email: string): Text | null {
  const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;
  while (node) {
    if ((node.nodeValue || '').trim().toLowerCase() === email.toLowerCase()) return node;
    node = walker.nextNode() as Text | null;
  }
  return null;
}

// One polite live region for "Copied", so a screen reader hears it once and the
// link keeps its own name (the address) the whole time.
let sayEl: HTMLSpanElement | null = null;
function say(message: string): void {
  if (!sayEl) {
    sayEl = document.createElement('span');
    sayEl.className = 'vh';
    sayEl.setAttribute('role', 'status');
    document.body.appendChild(sayEl);
  }
  sayEl.textContent = '';
  // A fresh text node a beat later, so the same words are announced a second time too.
  window.setTimeout(() => {
    if (sayEl) sayEl.textContent = message;
  }, 50);
}

// Links that copied on this click, so the fallback toast does not copy again.
const justCopied = new WeakSet<HTMLAnchorElement>();
const restoring = new WeakMap<HTMLAnchorElement, number>();

// Copy now, inside the click (a clipboard write is most reliable while the click
// is still the user's gesture), and turn the address into "Copied" for two
// seconds. The link is held at its own width so nothing beside it moves, and it
// keeps the address as its accessible name while the words are swapped.
function copyOnClick(link: HTMLAnchorElement, email: string): void {
  const node = addressNode(link, email);
  // Mid-swap the words are "Copied", so there is no address node: copy again, quietly.
  const swapped = restoring.has(link);
  if (!node && !swapped) return;
  if (!navigator.clipboard?.writeText) return;
  navigator.clipboard.writeText(email).then(
    () => {
      justCopied.add(link);
      say('Copied my email address');
      if (!node) return;
      const hadLabel = link.getAttribute('aria-label');
      const hadWidth = link.style.minWidth;
      link.style.minWidth = link.getBoundingClientRect().width + 'px';
      if (hadLabel === null) link.setAttribute('aria-label', (link.textContent || '').trim());
      node.nodeValue = 'Copied';
      link.dataset.copied = '';
      restoring.set(
        link,
        window.setTimeout(() => {
          node.nodeValue = email;
          link.style.minWidth = hadWidth;
          if (hadLabel === null) link.removeAttribute('aria-label');
          delete link.dataset.copied;
          restoring.delete(link);
        }, COPIED_FOR),
      );
    },
    () => {
      /* Clipboard blocked: the mailto and its fallback toast still stand. */
    },
  );
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

async function offerFallback(email: string, already = false): Promise<void> {
  let copied = already;
  try {
    if (!already && navigator.clipboard?.writeText) {
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

  // A link that shows the address copies it at once and says so in its own words.
  justCopied.delete(link);
  copyOnClick(link, email);

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
    void offerFallback(email, justCopied.has(link));
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

init();
init();

export {};
