/* ============================================================================
   copy-rules.test.mjs: the studio speaks as one person
   ============================================================================
   Run with `npm run test:copy` AFTER `npm run build`. It reads the built HTML
   in dist/client, so it checks what a visitor actually reads, not the source.

   Nathan is one person. Site copy says "I", never "we", "our" or "us" about
   the studio (overhaul plan, Part A ruling 15). This walks every built page
   and fails on any of those three words in rendered body text.

   What is NOT checked, on purpose:
     - <head> (title and meta are separate, and attributes anyway)
     - <script>, <style>, <template>, <svg> and HTML comments
     - attribute values, which covers aria-label, alt and title
     - <blockquote>, because a client's own words stay verbatim
     - any element carrying `data-copy-ignore`, and everything inside it.
       Use it sparingly, only for text that is honestly someone else's "we"
       (a quoted client, Nathan's family in the about story), and leave a
       comment beside it saying why.

   There is no HTML parser dependency: the built pages are well-formed
   Astro output, so a small tag walker with an ignore stack is enough.
   ============================================================================ */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const dist = join(root, 'dist', 'client');

const BANNED = /\b(we|our|us)\b/gi;

// Elements whose whole content is skipped (raw text or not body copy).
const RAW_SKIP = ['script', 'style', 'template', 'svg', 'noscript', 'head'];
// Elements that open an "ignored" region: everything inside is skipped.
const IGNORE_TAGS = new Set(['blockquote']);
// Void elements never get a closing tag, so they never enter the stack.
const VOID = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);

function htmlFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...htmlFiles(full));
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}

function decode(text) {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/**
 * Return the rendered body text of one page, minus everything the rule
 * skips, as an array of text runs.
 * @param {string} html
 * @returns {string[]}
 */
export function checkedText(html) {
  let s = html.replace(/<!--[\s\S]*?-->/g, '');
  for (const tag of RAW_SKIP) {
    s = s.replace(new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}>`, 'gi'), ' ');
  }

  const runs = [];
  // Stack of open element names; `ignoreDepth` counts how many of them
  // opened an ignored region.
  const stack = [];
  let ignoreDepth = 0;
  const tagRe = /<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g;
  let last = 0;
  let m;
  while ((m = tagRe.exec(s))) {
    const text = s.slice(last, m.index);
    if (ignoreDepth === 0 && text.trim()) runs.push(decode(text));
    last = tagRe.lastIndex;

    const [, closing, rawName, attrs, selfClose] = m;
    const name = rawName.toLowerCase();
    if (closing) {
      // Pop back to the matching open tag (tolerates an unclosed <p> or <li>).
      const at = stack.map((e) => e.name).lastIndexOf(name);
      if (at === -1) continue;
      for (const e of stack.splice(at)) if (e.ignored) ignoreDepth--;
      continue;
    }
    if (VOID.has(name) || selfClose) continue;
    const ignored = IGNORE_TAGS.has(name) || /\sdata-copy-ignore\b/.test(attrs);
    if (ignored) ignoreDepth++;
    stack.push({ name, ignored });
  }
  const tail = s.slice(last);
  if (ignoreDepth === 0 && tail.trim()) runs.push(decode(tail));
  return runs;
}

test('the walker skips what the rule skips', () => {
  const html = `<html><head><title>Our studio</title></head><body>
    <p aria-label="we">I build sites.</p>
    <blockquote><p>We loved it.</p></blockquote>
    <div data-copy-ignore><span>our <b>family</b></span></div>
    <script>const we = 1;</script>
    <!-- we -->
    <p>Then we talk.</p></body></html>`;
  const text = checkedText(html).join(' ');
  assert.match(text, /I build sites/);
  assert.match(text, /Then we talk/);
  assert.doesNotMatch(text, /loved|family|Our studio|const/);
});

test('built pages never say "we", "our" or "us" in body copy', () => {
  assert.ok(
    existsSync(dist),
    'dist/client is missing: run `npm run build` before `npm run test:copy`',
  );
  const files = htmlFiles(dist);
  assert.ok(files.length > 5, `expected built pages in dist/client, found ${files.length}`);

  const hits = [];
  for (const file of files) {
    for (const run of checkedText(readFileSync(file, 'utf8'))) {
      const flat = run.replace(/\s+/g, ' ').trim();
      for (const match of flat.matchAll(BANNED)) {
        const from = Math.max(0, match.index - 50);
        hits.push(
          `${relative(dist, file)}: "...${flat.slice(from, match.index + 50)}..." (${match[0]})`,
        );
      }
    }
  }
  assert.equal(
    hits.length,
    0,
    `Site copy is first person singular ("I"). Fix the wording, or for a quoted ` +
      `client wrap it in <blockquote> or data-copy-ignore:\n  ${hits.join('\n  ')}`,
  );
});
