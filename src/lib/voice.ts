/* ============================================================================
   voice | split a headline so its last words can take the italic second voice
   ============================================================================
   DESIGN.md "Typography": every big Bebas headline turns into the serif italic,
   in china-marker red, for its last phrase. Headlines that come from the CMS are
   one string, so this splits off the last few words when an entry does not carry
   its own accent field (the Photography page does, and uses that instead).
   ============================================================================ */

export interface VoiceSplit {
  /** The words set in Bebas caps. May be empty when the headline is very short. */
  lead: string;
  /** The words set in the italic voice. */
  voice: string;
}

/**
 * Split off the last `words` words (default 2). A headline of `words` words or
 * fewer is returned whole as `lead` with no voice, so a one-word title such as
 * "Journal" is never reduced to just an italic.
 */
export function splitVoice(headline: string, words = 2): VoiceSplit {
  const parts = headline.trim().split(/\s+/);
  if (parts.length <= words) return { lead: parts.join(' '), voice: '' };
  return {
    lead: parts.slice(0, parts.length - words).join(' '),
    voice: parts.slice(parts.length - words).join(' '),
  };
}
