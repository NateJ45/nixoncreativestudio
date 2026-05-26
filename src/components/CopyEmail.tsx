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
}

export default function CopyEmail({ email, className }: CopyEmailProps) {

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

  return (
    <span className={`inline-flex items-center gap-xs ${className ?? ''}`}>
      <a
        href={`mailto:${email}`}
        className="text-link transition-colors duration-150 hover:underline hover:underline-offset-2 focus-visible:underline focus-visible:underline-offset-2"
      >
        {email}
      </a>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? 'Email copied to clipboard' : 'Copy email address'}
        title={copied ? 'Copied' : 'Copy email address'}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors duration-150 hover:bg-bg-soft hover:text-link focus-visible:bg-bg-soft focus-visible:text-link focus-visible:outline-none"
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
