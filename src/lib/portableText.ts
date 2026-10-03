/* ============================================================================
   portableText (restricted rendering helpers)
   ============================================================================
   Foundation, edit with care.

   Pure helpers for the Portable Text fields the CMS design keeps on designed
   pages (docs/CMS-DESIGN.md sections 1.7 and 1.10): the About story and the
   prose pages (privacy, accessibility, colophon).

   Why a restricted pass at all: a Portable Text field lets an editor add
   anything EmDash supports, headings of every level, images, code, embeds. On
   a designed page that would let the story column grow a huge heading or a
   stray image. restrictPortableText() runs BEFORE the stock `PortableText`
   renderer (see src/components/emdash/RestrictedPortableText.astro) and
   reduces the value to the vocabulary the page allows:

     - `block` nodes only; every other node type renders nothing.
     - styles: `normal`, plus the heading styles the caller lists (the prose
       pages allow h2 and h3 so the table of contents works; the About story
       allows none, so any heading renders as a paragraph).
     - marks: `strong`, `em`, and `link` (http, https, mailto, tel, site-relative
       or fragment hrefs only). Anything else is dropped, text kept.
     - lists only when the caller opts in.

   Pure and dependency-free so `node --test` can run it (src/lib/portableText.test.ts).
   ============================================================================ */

/** A Portable Text span or block, kept loose on purpose; the renderer does the work. */
export type PTNode = {
  _type?: string;
  _key?: string;
  style?: string;
  listItem?: string;
  level?: number;
  text?: string;
  marks?: string[];
  markDefs?: { _key?: string; _type?: string; href?: string; [key: string]: unknown }[];
  children?: PTNode[];
  [key: string]: unknown;
};

export interface RestrictOptions {
  /** Heading styles that survive; any other heading style becomes `normal`. Default: none. */
  headings?: ('h2' | 'h3')[];
  /** Keep bulleted and numbered lists. Default false (list items become paragraphs). */
  lists?: boolean;
}

/** Heading slug, matching what Astro's MDX pipeline produced (the old TOC ids). */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-');
}

/** Plain text of one block (its spans joined). */
export function blockText(block: PTNode): string {
  return (block.children ?? []).map((c) => c.text ?? '').join('');
}

/** Plain text of a whole value, blocks separated by newlines. */
export function plainText(blocks: unknown): string {
  return Array.isArray(blocks)
    ? (blocks as PTNode[])
        .filter((b) => b && b._type === 'block')
        .map(blockText)
        .join('\n')
    : '';
}

/** True for hrefs a rendered link may carry: http(s), mailto, tel, site-relative, fragment. */
export function isSafeLink(href: unknown): href is string {
  if (typeof href !== 'string') return false;
  const h = href.trim();
  if (!h || /[\u0000-\u001f\u007f\s]/.test(h)) return false;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(h)) return true;
  // Site-relative ("/about/") but not protocol-relative ("//evil.example"), or a fragment.
  return (h.startsWith('/') && !h.startsWith('//')) || h.startsWith('#');
}

/**
 * Reduce a Portable Text value to the restricted vocabulary above. Always
 * returns an array: a missing, null or non-array value gives []. Blocks with
 * no text are dropped.
 */
export function restrictPortableText(value: unknown, opts: RestrictOptions = {}): PTNode[] {
  if (!Array.isArray(value)) return [];
  const headings = new Set<string>(opts.headings ?? []);
  const out: PTNode[] = [];
  for (const node of value as PTNode[]) {
    if (!node || node._type !== 'block') continue;

    // Keep only link definitions with a safe href; remember their keys.
    const linkDefs = (node.markDefs ?? []).filter(
      (d) => d && d._type === 'link' && isSafeLink(d.href),
    );
    const linkKeys = new Set(linkDefs.map((d) => d._key));

    const children = (node.children ?? [])
      .filter((c) => c && typeof c.text === 'string')
      .map((c) => ({
        ...c,
        marks: (c.marks ?? []).filter((m) => m === 'strong' || m === 'em' || linkKeys.has(m)),
      }));
    if (!children.some((c) => (c.text ?? '').trim() !== '')) continue;

    const style = node.style ?? 'normal';
    const block: PTNode = {
      ...node,
      style: style === 'normal' || headings.has(style) ? style : 'normal',
      markDefs: linkDefs,
      children,
    };
    if (!opts.lists || !node.listItem) {
      delete block.listItem;
      delete block.level;
    }
    out.push(block);
  }
  return out;
}

/** The headings of a value at one level (default h2), with ids, for a table of contents. */
export function headingsOf(
  blocks: unknown,
  style: 'h2' | 'h3' = 'h2',
): { text: string; slug: string }[] {
  if (!Array.isArray(blocks)) return [];
  return (blocks as PTNode[])
    .filter((b) => b && b._type === 'block' && b.style === style)
    .map((b) => {
      const text = blockText(b);
      return { text, slug: slugify(text) };
    });
}

/** Escape text for an HTML text node or a double-quoted attribute. Apostrophes stay literal. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * The inner HTML of one restricted block: its spans with strong, em and link
 * marks applied (nesting link > strong > em), text escaped. Expects a block that
 * already went through restrictPortableText, so every mark is one of those three
 * and every link href is safe. Used by about.astro, which renders the story as
 * plain paragraphs without pulling in emdash/ui's PortableText (and its stylesheet).
 */
export function blockHtml(block: PTNode): string {
  const defs = new Map((block.markDefs ?? []).map((d) => [d._key, d]));
  return (block.children ?? [])
    .map((span) => {
      let html = escapeHtml(span.text ?? '');
      const marks = span.marks ?? [];
      if (marks.includes('em')) html = `<em>${html}</em>`;
      if (marks.includes('strong')) html = `<strong>${html}</strong>`;
      for (const m of marks) {
        const def = defs.get(m);
        if (def && def._type === 'link' && isSafeLink(def.href)) {
          const href = def.href.trim();
          const blank = def.blank === true && !href.startsWith('#');
          html = `<a href="${escapeHtml(href)}"${
            blank ? ' target="_blank" rel="noopener noreferrer"' : ''
          }>${html}</a>`;
        }
      }
      return html;
    })
    .join('');
}
