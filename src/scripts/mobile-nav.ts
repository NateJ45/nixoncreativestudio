/* ============================================================================
   Mobile nav behaviour
   ============================================================================
   Foundation, edit with care.

   Upgrades MobileNav.astro's link-to-the-footer-nav into a modal panel.
   Runs on every astro:page-load (the header is swapped on each View
   Transitions navigation, so the elements are new each time); a data-bound
   guard stops the same trigger being wired twice.

   What the native <dialog> already gives us through showModal(): the rest of
   the page goes inert, Escape closes it, and focus moves inside. On top of
   that this adds: a Tab wrap so focus cycles within the panel instead of
   leaving for the browser chrome, focus back on the menu button after a
   close, and a close on astro:before-swap so a navigation never carries an
   open modal (or its scroll lock) onto the next page.
   ============================================================================ */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** The dialog on the current page, if any. */
const currentDialog = (): HTMLDialogElement | null =>
  document.querySelector<HTMLDialogElement>('dialog[data-mnav]');

/** Close without moving focus (used when the page is about to be replaced). */
function closeQuietly(): void {
  const dialog = currentDialog();
  if (dialog?.open) {
    dialog.dataset.quietClose = 'true';
    dialog.close();
  }
}

// Registered once for the tab's life: module scripts run a single time.
document.addEventListener('astro:before-swap', closeQuietly);

export function initMobileNav(): void {
  const trigger = document.querySelector<HTMLAnchorElement>('a[data-mnav-open]:not([data-bound])');
  const dialog = currentDialog();
  if (!trigger || !dialog || typeof dialog.showModal !== 'function') return;
  trigger.dataset.bound = 'true';

  // From here on the link behaves as a button that opens a dialog.
  trigger.setAttribute('role', 'button');
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-controls', dialog.id);
  trigger.setAttribute('aria-expanded', 'false');

  const open = (event: Event): void => {
    event.preventDefault();
    if (dialog.open) return;
    dialog.showModal();
    trigger.setAttribute('aria-expanded', 'true');
    // Start on the close button, the first control, like the old Sheet.
    dialog.querySelector<HTMLElement>('[data-mnav-close]')?.focus();
  };
  trigger.addEventListener('click', open);
  // role="button" promises Space works too, not only Enter.
  trigger.addEventListener('keydown', (event) => {
    if (event.key === ' ') open(event);
  });

  dialog.querySelector('[data-mnav-close]')?.addEventListener('click', () => dialog.close());

  // Fires for every close: the close button, Escape, a link, before-swap.
  dialog.addEventListener('close', () => {
    trigger.setAttribute('aria-expanded', 'false');
    if (dialog.dataset.quietClose) {
      delete dialog.dataset.quietClose;
      return;
    }
    trigger.focus();
  });

  // A link inside the panel closes it straight away (the next page loads
  // behind it); before-swap covers any navigation that starts elsewhere.
  dialog.addEventListener('click', (event) => {
    const link = (event.target as Element).closest('a[href]');
    if (
      link &&
      !link.getAttribute('href')?.startsWith('mailto:') &&
      link.getAttribute('target') !== '_blank'
    ) {
      dialog.dataset.quietClose = 'true';
      dialog.close();
    }
  });

  // Keep Tab inside the panel: wrap from the last control to the first and back.
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    );
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}
