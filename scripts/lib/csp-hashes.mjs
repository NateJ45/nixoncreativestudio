// The pure half of scripts/write-csp.mjs: find what a Content-Security-Policy has to
// allow by hash in a built HTML page. Kept apart so `npm run test:scripts` can test it
// without a build.
import { createHash } from 'node:crypto';

// A browser hashes the text inside the tag after the HTML parser has turned CRLF and
// lone CR into LF. A build on Windows can carry CRLF from a source file, so do the same,
// or the hash would never match on this PC.
const normalize = (text) => text.replace(/\r\n?/g, '\n');

/** The CSP source for one inline block, for example 'sha256-abc='. */
export function hashSource(text) {
  const digest = createHash('sha256').update(normalize(text), 'utf8').digest('base64');
  return `'sha256-${digest}'`;
}

// These script types are data blocks. A browser never runs them, and CSP ignores them.
const DATA_BLOCK = /\btype\s*=\s*["']?application\/(?:ld\+)?json/i;

/**
 * Every inline script and <style> in one page, as CSP hash sources.
 * @param {string} html
 * @returns {{ scripts: string[], styles: string[] }}
 */
export function inlineHashes(html) {
  const scripts = [];
  for (const [, attrs, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/i.test(attrs) || DATA_BLOCK.test(attrs)) continue;
    scripts.push(hashSource(body));
  }
  const styles = [];
  for (const [, , body] of html.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi)) {
    styles.push(hashSource(body));
  }
  return { scripts, styles };
}

/**
 * Put the collected hashes into the _headers text. Throws rather than ship a policy with a
 * placeholder left in it, or a line Cloudflare would refuse (2,000 characters at most).
 * @param {string} headers the text of public/_headers
 * @param {Iterable<string>} scripts
 * @param {Iterable<string>} styles
 */
export function fillPolicy(headers, scripts, styles) {
  if (!headers.includes('__CSP_SCRIPT_HASHES__') || !headers.includes('__CSP_STYLE_HASHES__')) {
    throw new Error('_headers has lost its __CSP_SCRIPT_HASHES__ or __CSP_STYLE_HASHES__ marker');
  }
  const filled = headers
    .replaceAll('__CSP_SCRIPT_HASHES__', [...new Set(scripts)].sort().join(' '))
    .replaceAll('__CSP_STYLE_HASHES__', [...new Set(styles)].sort().join(' '));
  const long = filled.split('\n').find((line) => line.length > 2000);
  if (long) {
    throw new Error(`a _headers line is ${long.length} characters; Cloudflare allows 2,000`);
  }
  return filled;
}
