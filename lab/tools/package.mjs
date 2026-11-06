// Copies the lab into ../../lab-dist without test files, adds a chooser page and noindex, ready to deploy.
import fs from 'node:fs';
import path from 'node:path';
const LAB = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const OUT = path.join(LAB, '..', 'lab-dist') + path.sep;
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT + 'public', { recursive: true });
const pub = OUT + 'public/';
for (const d of ['ribbon', 'flythrough', 'liquid', 'poster', 'assets']) {
  fs.cpSync(LAB + d, pub + d, { recursive: true, filter: (s) => !/[\\/]_test([\\/]|$)/.test(s) && !/[\\/]_f-/.test(s) });
}
fs.copyFileSync(LAB + 'shared.js', pub + 'shared.js');
fs.writeFileSync(pub + '_headers', '/*\n  X-Robots-Tag: noindex, nofollow\n');
const card = (href, name, line, bg, fg) => `<a href="/${href}/" style="background:${bg};color:${fg}"><b>${name}</b><span>${line}</span></a>`;
fs.writeFileSync(pub + 'index.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Motion lab</title><style>
*{box-sizing:border-box}body{margin:0;background:#000;font-family:system-ui,sans-serif;color:#fff}
h1{margin:0;padding:1.25rem 1rem;font-size:1.125rem;font-weight:600}
main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr));gap:2px}
a{display:flex;flex-direction:column;justify-content:flex-end;gap:.4rem;min-height:40vh;padding:1.25rem;text-decoration:none}
b{font-size:clamp(2.5rem,7vw,5rem);line-height:.95;letter-spacing:-.03em}span{font-size:1.0625rem;line-height:1.3;max-width:26rem}
a:focus-visible{outline:4px solid #fff;outline-offset:-8px}
</style></head><body><h1>Nixon Creative Studio: four homepage directions. Open each and scroll slowly.</h1><main>
${card('ribbon', 'Ribbon', 'A strip of film carries your real sites through 3D space.', '#FFE600', '#000')}
${card('flythrough', 'Flythrough', 'Scroll flies you through one client world after another.', '#FF2E93', '#000')}
${card('liquid', 'Liquid', 'Sites play inside giant letters on a surface you can push.', '#0037FF', '#fff')}
${card('poster', 'Poster', 'Screen-printed color, huge type and sites inside shapes. No 3D.', '#00D26A', '#000')}
</main></body></html>`);
fs.writeFileSync(OUT + 'wrangler.jsonc', JSON.stringify({ name: 'ncs-motion-lab', compatibility_date: '2026-05-25', assets: { directory: './public' } }, null, 2));
const size = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((a, e) => a + (e.isDirectory() ? size(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
console.log('package', Math.round(size(pub) / 1048576) + ' MB');
for (const d of ['ribbon', 'flythrough', 'liquid', 'poster']) console.log(d, Math.round(size(pub + d) / 1024) + ' KB', fs.readdirSync(pub + d).join(' ').slice(0, 90));
