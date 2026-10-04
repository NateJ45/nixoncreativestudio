/* ============================================================================
   voiceSplit | where a Bebas headline turns into the italic second voice
   ============================================================================
   DESIGN.md section 3: every big Bebas headline turns into the Newsreader
   italic (`.voice`) for its last phrase, so no headline is a block of caps.
   Headlines on /services come from the CMS, so the turn has to be found in
   the text rather than written into it:

     - at the last comma, when there is one ("Strategy, web design and
       photography," / "built so your team can run the site for years.")
     - otherwise the last half of the words, rounded up ("What a" /
       "website costs")
     - a one-word headline stays all caps (nothing to turn).

   The two parts joined with one space are always the original text, so a test
   that reads the heading's text still sees exactly the CMS words.
   ============================================================================ */

export interface VoiceSplit {
  /** The Bebas caps part (the whole headline when it is a single word). */
  head: string;
  /** The italic turn. Empty when the headline is a single word. */
  tail: string;
}

export function voiceSplit(text: string): VoiceSplit {
  const clean = text.trim().replace(/\s+/g, ' ');
  const comma = clean.lastIndexOf(', ');
  // A comma in the first or last few characters is not a phrase boundary.
  if (comma > 3 && comma < clean.length - 6) {
    return { head: clean.slice(0, comma + 1), tail: clean.slice(comma + 2) };
  }
  const words = clean.split(' ');
  if (words.length < 2) return { head: clean, tail: '' };
  const cut = words.length - Math.ceil(words.length / 2);
  return { head: words.slice(0, cut).join(' '), tail: words.slice(cut).join(' ') };
}
