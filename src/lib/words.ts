/* ============================================================================
   Words | The headline reveal, in the markup
   ============================================================================
   Turns a small HTML string (text and <b>) into the word spans the `.w`
   animation in kit.css drives, with `--n` numbering them, so a headline never
   flashes whole before a script splits it. The H1 carries the plain sentence as
   its aria-label, because a screen reader would otherwise stop on every span.
   ============================================================================ */

const TAG = /(<[^>]+>)/;

export function wordSpans(html: string, start = 0): string {
  let n = start;
  return html
    .split(TAG)
    .map((part) => {
      if (!part || TAG.test(part)) return part;
      return part
        .split(/(\s+)/)
        .map((w) => {
          if (!w) return '';
          if (/^\s+$/.test(w)) return ' ';
          return `<span class="w" style="--n:${n++}">${w}</span>`;
        })
        .join('');
    })
    .join('');
}

/** The sentence without its tags, for aria-label. */
export const plainText = (html: string) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
