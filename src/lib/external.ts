// Is a link going off this site?
//
// True for absolute http(s) and protocol-relative URLs whose host is not
// nixoncreativestudio.com. Internal paths, #anchors, mailto: and tel: are false.
// ProseLink uses it so prose links in journal posts and case studies open in a
// new tab, like the hand-written component links do.

const OWN_HOSTS = new Set(['nixoncreativestudio.com', 'www.nixoncreativestudio.com']);

export function isExternalHref(href: unknown): boolean {
  if (typeof href !== 'string' || !/^(https?:)?\/\//i.test(href)) return false;
  try {
    return !OWN_HOSTS.has(new URL(href, 'https://nixoncreativestudio.com').hostname);
  } catch {
    return false;
  }
}

/** `rel` with noopener and noreferrer added, keeping any value already there. */
export function externalRel(rel: unknown): string {
  const list = typeof rel === 'string' ? rel.split(/\s+/).filter(Boolean) : [];
  for (const r of ['noopener', 'noreferrer']) if (!list.includes(r)) list.push(r);
  return list.join(' ');
}
