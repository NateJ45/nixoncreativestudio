// Safe to edit. A quote as HTML, with its key phrase (when one is set) inside <mark class="hl">.
//
// Lifted out of QuoteBand.astro on 2026-11-15 so the case study chapter and the client sheet mark
// a review the same way. It picks words out, it never changes them: the characters that come out
// are the characters that went in, escaped. Built as one string so no white space can slip in
// around the mark. A paragraph break in the quote (a long review) becomes a <br><br>.

const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n\n?/g, '<br><br>');

export function markedQuote(quote: string, highlight?: string): string {
  const at = highlight ? quote.indexOf(highlight) : -1;
  if (!highlight || at === -1) return esc(quote);
  return (
    esc(quote.slice(0, at)) +
    '<mark class="hl">' +
    esc(highlight) +
    '</mark>' +
    esc(quote.slice(at + highlight.length))
  );
}

/** The one sentence that holds the key phrase, word for word, with an ellipsis where the quote
 *  goes on before or after it (added 2026-11-17). For an earlier quote on a slide that carries
 *  more than one from the same person (QuoteBand.astro), so that slide stays a sensible height;
 *  the whole quote stays on the study page. Without a phrase, or when the phrase is not found,
 *  the quote comes back whole. */
export function excerpt(quote: string, highlight?: string): string {
  const at = highlight ? quote.indexOf(highlight) : -1;
  if (!highlight || at === -1) return quote;
  const ends = [...quote.matchAll(/[.!?]+["'”’]?(\s+|$)/g)].map((m) => ({
    stop: m.index + m[0].trimEnd().length,
    next: m.index + m[0].length,
  }));
  const start = [...ends].reverse().find((e) => e.next <= at)?.next ?? 0;
  const stop = ends.find((e) => e.stop >= at + highlight.length)?.stop ?? quote.length;
  const body = quote.slice(start, stop);
  // A quote already cut with its own ellipsis there (Clark Remsburg's) gets no second one.
  const before = start > 0 && !body.startsWith('…') ? '… ' : '';
  const after = stop < quote.length && !body.endsWith('…') ? ' …' : '';
  return before + body + after;
}
