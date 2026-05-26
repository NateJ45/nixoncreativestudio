/* ============================================================================
   readingTime
   ============================================================================
   Foundation, edit with care.

   Tiny utility: estimate how long a chunk of prose takes to read at an
   average pace. Used in case study detail pages to render a "5 min read"
   stamp next to the publish date.

   200 wpm is the widely-cited average for adult silent reading. Medium,
   Pocket, and friends all use roughly this number. We round up to the
   nearest minute so short reads still say "1 min" instead of "0 min".

   Input is the raw MDX body string from Astro's content collection
   render. We strip MDX/Markdown syntax tokens lightly (code fences, link
   syntax, image tags) so the word count reflects prose, not punctuation.
   ============================================================================ */

const WORDS_PER_MINUTE = 200;

/**
 * Estimate reading time for a chunk of MDX/Markdown text.
 * Returns the minutes rounded up. Always at least 1.
 */
export function readingTime(body: string): number {
  if (!body) return 1;

  const cleaned = body
    // Strip fenced code blocks; readers skim past them.
    .replace(/```[\s\S]*?```/g, ' ')
    // Strip inline code.
    .replace(/`[^`]*`/g, ' ')
    // Strip image markdown.
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    // Reduce links [text](url) to their text.
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    // Strip MDX/HTML tags.
    .replace(/<[^>]+>/g, ' ')
    // Strip non-word characters that wouldn't separate words on read.
    .replace(/[#*_>~|=-]/g, ' ');

  const words = cleaned
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
