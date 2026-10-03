/* ============================================================================
   journalBody | A journal entry's Portable Text body as HTML
   ============================================================================
   Foundation, edit with care.

   /journal/[slug] prints this string inside its `.journal-prose` wrapper
   (CMS-DESIGN PR 12). It is a small renderer of our own, not EmDash's
   `PortableText` from emdash/ui, for the reason PR 8 and PR 10 found: importing
   that component makes Astro add a 9.5 KB stylesheet to every page that shares
   its chunk, including the homepage, /services and /work. A pure function that
   returns markup adds no CSS, no script and no bundle to any other page, and
   `node --test` can run it (src/lib/journalBody.test.ts).

   THE VOCABULARY (everything else renders nothing, text kept where there is any):
     - paragraphs, and h2 / h3 headings with an id from their text (the same slug
       rule as the case studies, so the heading anchors in enhance.ts work);
       h4 to h6 render as plain paragraphs
     - blockquotes (consecutive quote blocks become one quote)
     - bullet and numbered lists, nested by level
     - marks: bold, italic, inline code and links (http, https, mailto, tel,
       site-relative or fragment hrefs only)
     - code blocks (a `code` node): plain monospace in a keyboard-focusable box, no
       syntax colouring. The old MDX journal used expressive-code; Portable Text has
       no such step and a highlighter was not worth adding for an empty journal
   NOT SUPPORTED YET: pictures in the body, tables, embeds, galleries. They render
   nothing (the cover image is the picture a journal entry has). Supporting body
   images means resolving EmDash's media references here, or accepting emdash/ui's
   PortableText and its stylesheet; both are decisions for a later PR.

   Every piece of text is escaped. A link's href must pass isSafeLink, a code
   block's language becomes a class name only when it is a plain word.
   ============================================================================ */

import {
  blockHtml,
  blockText,
  restrictPortableText,
  slugify,
  type PTNode,
  type RestrictOptions,
} from './portableText.ts';

/** HTML-escape text for a text node. */
const esc = (t: string): string =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Classes for the code box. Theme tokens only, so it clears contrast in both themes. */
const PRE_CLASSES =
  'overflow-x-auto border border-border bg-bg-soft px-5 py-4 font-mono text-[0.9rem] leading-[1.6] text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const CAPTION_CLASSES =
  'rounded-t-xl border border-b-0 border-border bg-bg px-4 py-2 font-mono text-[0.75rem] text-text-muted';

/** What the block-level restriction keeps: h2, h3, quotes, lists, bold, italic, code, links. */
const RESTRICT: RestrictOptions = {
  headings: ['h2', 'h3'],
  blockquote: true,
  lists: true,
  code: true,
};

/** One `code` node as a code box ('' when it holds no code). */
export function codeBlockHtml(node: PTNode): string {
  const code = typeof node.code === 'string' ? node.code : '';
  if (!code.trim()) return '';
  const filename = typeof node.filename === 'string' && node.filename ? node.filename : undefined;
  const language =
    typeof node.language === 'string' && /^[a-z0-9+#-]{1,24}$/i.test(node.language)
      ? node.language.toLowerCase()
      : undefined;
  const cls = language ? ` class="language-${language}"` : '';
  // The <pre> is one string with no whitespace inside it, so the first line is not indented.
  const radius = filename ? 'rounded-b-xl' : 'rounded-xl';
  return (
    '<div class="my-l">' +
    (filename ? `<p class="${CAPTION_CLASSES}">${esc(filename)}</p>` : '') +
    `<pre tabindex="0" class="${PRE_CLASSES} ${radius}"><code${cls}>${esc(code)}</code></pre>` +
    '</div>'
  );
}

interface ListItem {
  listItem: string;
  level: number;
  html: string;
}

/** Consecutive list items as nested <ul> / <ol>. */
function listHtml(items: ListItem[]): string {
  let out = '';
  const stack: ('ul' | 'ol')[] = [];
  for (const item of items) {
    const tag = item.listItem === 'number' ? 'ol' : 'ul';
    // A list cannot start deeper than level 1, nor jump more than one level at a time.
    const level = Math.min(Math.max(item.level, 1), stack.length + 1);
    while (stack.length > level) out += `</li></${stack.pop()}>`;
    if (stack.length === level) {
      if (stack[level - 1] === tag) {
        out += '</li>';
      } else {
        // Same depth, other kind of list: close the old list and open the new one.
        out += `</li></${stack.pop()}><${tag}>`;
        stack.push(tag);
      }
    } else {
      out += `<${tag}>`;
      stack.push(tag);
    }
    out += `<li>${item.html}`;
  }
  while (stack.length > 0) out += `</li></${stack.pop()}>`;
  return out;
}

/**
 * The HTML of a journal body. '' for anything that is not an array or holds
 * nothing drawable. Never throws.
 */
export function renderJournalBody(value: unknown): string {
  if (!Array.isArray(value)) return '';
  const out: string[] = [];
  let list: ListItem[] = [];
  let quote: string[] = [];

  const flushList = () => {
    if (list.length > 0) out.push(listHtml(list));
    list = [];
  };
  const flushQuote = () => {
    if (quote.length > 0)
      out.push(`<blockquote>${quote.map((p) => `<p>${p}</p>`).join('')}</blockquote>`);
    quote = [];
  };

  for (const node of value as PTNode[]) {
    if (!node || typeof node !== 'object') continue;

    if (node._type === 'code') {
      flushList();
      flushQuote();
      out.push(codeBlockHtml(node));
      continue;
    }

    // Anything that is not a text block (images, tables, embeds) renders nothing.
    const [block] = restrictPortableText([node], RESTRICT);
    if (!block) continue;
    const html = blockHtml(block);

    if (block.listItem) {
      flushQuote();
      list.push({ listItem: block.listItem, level: block.level ?? 1, html });
      continue;
    }
    flushList();

    if (block.style === 'blockquote') {
      quote.push(html);
      continue;
    }
    flushQuote();

    if (block.style === 'h2' || block.style === 'h3') {
      const tag = block.style;
      out.push(`<${tag} id="${slugify(blockText(block))}">${html}</${tag}>`);
    } else {
      out.push(`<p>${html}</p>`);
    }
  }
  flushList();
  flushQuote();
  return out.join('');
}
