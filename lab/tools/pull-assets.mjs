// Footage and captures are not committed. This copies them back from the deployed lab, so a fresh checkout can
// serve and redeploy without re-filming. Run it before tools/package.mjs: a deploy without them deletes them.
import fs from 'node:fs';
import path from 'node:path';
const LAB = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const BASE = process.argv[2] || 'https://ncs-motion-lab.nathanjnixon86.workers.dev';

const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    return e.isDirectory() ? walk(p) : /\.(html|css|js)$/.test(e.name) ? [p] : [];
  });
const want = new Set();
for (const f of [...walk(LAB + 'deal'), LAB + 'shared.js']) {
  for (const m of fs
    .readFileSync(f, 'utf8')
    .matchAll(/\/assets\/[A-Za-z0-9._/-]+\.(?:mp4|webm|webp|jpg|png|svg|woff2)/g))
    want.add(m[0]);
}
// kit.js and shared.js build these names from each client's slug.
const shared = fs.readFileSync(LAB + 'shared.js', 'utf8');
for (const [, slug] of shared.matchAll(/slug: '([a-z0-9-]+)'/g)) {
  for (const end of ['-m.mp4', '-m.webp', '.mp4', '.webp', '-cover.webp', '-cms.webp'])
    want.add(`/assets/${slug}${end}`);
}

let got = 0,
  kept = 0,
  missing = [],
  bytes = 0;
const list = [...want];
const one = async (u) => {
  const file = LAB + u.slice(1);
  if (fs.existsSync(file) && fs.statSync(file).size > 0) {
    kept++;
    return;
  }
  const r = await fetch(BASE + u);
  if (!r.ok) {
    missing.push(u);
    return;
  }
  const b = Buffer.from(await r.arrayBuffer());
  if (!b.length) {
    missing.push(u + ' (empty)');
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, b);
  got++;
  bytes += b.length;
};
for (let i = 0; i < list.length; i += 6) await Promise.all(list.slice(i, i + 6).map(one));
console.log(
  `asked ${list.length}, downloaded ${got} (${Math.round(bytes / 1048576)} MB), already here ${kept}`,
);
if (missing.length) console.log('not on the worker:\n  ' + missing.join('\n  '));
