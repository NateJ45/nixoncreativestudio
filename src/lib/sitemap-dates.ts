// The real dates behind <lastmod> in the sitemap. astro.config.mjs runs before the content
// layer exists, so it reads the frontmatter text itself, the same way the journal gate does.
//
// Only a date someone wrote down counts: `updated`, else `published`. A page with no date in
// its content (home, prices, about and the rest) gets no lastmod at all. A build date on every
// page would tell search engines that everything changed on every deploy, which is untrue,
// and it teaches them to ignore the field.

/** `updated`, else `published`, from an entry's frontmatter; null without one or if in the future. */
export function frontmatterLastmod(text: string, now: Date = new Date()): string | null {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] ?? '';
  const read = (key: string) =>
    new RegExp(`^${key}:\\s*['"]?(\\d{4}-\\d{2}-\\d{2})['"]?\\s*$`, 'm').exec(frontmatter)?.[1];
  const date = read('updated') ?? read('published');
  if (!date || Number.isNaN(Date.parse(date))) return null;
  return new Date(date) > now ? null : date;
}
