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
