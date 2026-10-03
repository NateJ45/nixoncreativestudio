// Safe to edit.
/* ============================================================================
   markdown-to-pt.mjs
   ============================================================================
   Turns a Markdown file into Portable Text blocks, printed as JSON, using
   EmDash's own converter (the same one migrate-case-studies.mjs uses). For
   writing a portableText field's value into cms/content/<collection>.json:

     npm run cms:pt -- path/to/story.md            # JSON to stdout
     npm run cms:pt -- path/to/story.md --out blocks.json

   Links go in as Markdown links, `_italic_` for emphasis (EmDash's converter
   reads _x_ but not *x*, so single stars are normalised the same way the case
   study migration does it).
   ============================================================================ */
import { readFileSync, writeFileSync } from 'node:fs';
import { markdownToPortableText } from 'emdash/client';

const file = process.argv[2];
if (!file || file.startsWith('--')) {
  console.error('Usage: npm run cms:pt -- <file.md> [--out <file.json>]');
  process.exit(1);
}
const outIdx = process.argv.indexOf('--out');
const md = readFileSync(file, 'utf8')
  .replace(/\r\n/g, '\n')
  .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1_$2_')
  .trim();
const json = JSON.stringify(markdownToPortableText(md), null, 2);
if (outIdx > -1 && process.argv[outIdx + 1]) writeFileSync(process.argv[outIdx + 1], json + '\n');
else console.log(json);
