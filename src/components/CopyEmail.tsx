/* ============================================================================
   CopyEmail
   ============================================================================
   Safe to edit.

   Renders an email address that doubles as a "copy to clipboard" control.
   Click the address or the icon next to it: address is copied, the icon
   swaps to a check mark for 2 seconds with a "Copied" tooltip-style label.

   Used in Footer.astro and Contact sidebar. The mailto: link stays the
   primary affordance for users who want to compose an email right now;
   the copy button is for the "I want to grab this into a colleague's
   message" pattern that email clients handle poorly.

   Falls back gracefully when navigator.clipboard isn't available (older
   browsers, insecure context): clicking the button still opens mailto.
   ============================================================================ */

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export interface CopyEmailProps {
  /** Email address shown and copied to clipboard. */
  email: string;
  /** Optional className forwarded to the wrapping element. Lets the
      parent control spacing without this component making assumptions. */
  className?: string;
  /** Surface the component sits on. 'dark' (the navy footer) switches the
      link + icon to sky --secondary, which clears WCAG AA on navy; the
      darker --link token does not. 'light' (default, e.g. the Contact
      sidebar) keeps --link, which flips with the page theme on light
      surfaces. */
  tone?: 'light' | 'dark';
}

export default function CopyEmail({ email, className, tone = 'light' }: CopyEmailProps) {

  // Stores the "Copied" toast state. Cleared after 2 seconds so the
  // icon returns to the copy state.
  const [copied, setCopied] = useState<boolean>(false);

  async function handleCopy(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API blocked (insecure context, permissions). The mailto:
      // link beside this is still operable so the user has a fallback.
    }
  }

  // Token choice depends on the surface (see the `tone` prop doc). On navy
  // the darker --link fails AA, so the dark tone uses --secondary (sky), the
  // same token the footer's other links use; the icon goes to a legible
  // white so it does not vanish on the dark band.
  const linkClass =
    'transition-colors duration-150 hover:underline hover:underline-offset-2 ' +
    'focus-visible:underline focus-visible:underline-offset-2 ' +
    (tone === 'dark' ? 'text-secondary' : 'text-link');

  const buttonClass =
    'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors duration-150 focus-visible:outline-none ' +
    (tone === 'dark'
      ? 'text-primary-foreground/70 hover:bg-white/10 hover:text-secondary focus-visible:bg-white/10 focus-visible:text-secondary'
      : 'text-text-muted hover:bg-bg-soft hover:text-link focus-visible:bg-bg-soft focus-visible:text-link');

  return (
    <span className={`inline-flex items-center gap-xs ${className ?? ''}`}>
      <a
        href={`mailto:${email}`}
        className={linkClass}
      >
        {email}
      </a>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? 'Email copied to clipboard' : 'Copy email address'}
        title={copied ? 'Copied' : 'Copy email address'}
        className={buttonClass}
      >
        {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
      </button>
      {/* Visually-hidden status update for screen readers. role=status
          announces the change without stealing focus. */}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? 'Copied' : ''}
      </span>
    </span>
  );
}
