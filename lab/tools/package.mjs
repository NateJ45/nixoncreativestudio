// Copies the lab into ../../lab-dist without test files, adds a chooser page and noindex, ready to deploy.
import fs from 'node:fs';
import path from 'node:path';
const LAB = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const OUT = path.join(LAB, '..', 'lab-dist') + path.sep;
const workerSrc = fs.readFileSync(OUT + 'worker.js', 'utf8');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT + 'public', { recursive: true });
fs.writeFileSync(OUT + 'worker.js', workerSrc);
const pub = OUT + 'public/';
for (const d of ['deal', 'assets', 'logo']) {
  fs.cpSync(LAB + d, pub + d, { recursive: true, filter: (s) => !/[\\/](_test|_qa|_design)([\\/]|$)/.test(s) && !/[\\/]_f-/.test(s) && !/[\\/](BRIEF\.md|_build\.mjs|gf\.css|build\.mjs|look\.mjs|motion\.mjs|shot\.mjs|_shot-[^\\/]*|[^\\/]*\.ttf)$/.test(s) });
}
fs.copyFileSync(LAB + 'shared.js', pub + 'shared.js');
fs.copyFileSync(LAB + 'deal/404.html', pub + '404.html');
fs.writeFileSync(pub + '_headers', '/*\n  X-Robots-Tag: noindex, nofollow\n');
fs.writeFileSync(pub + 'index.html', '<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=/deal/"><a href="/deal/">Open the page</a>');
fs.writeFileSync(OUT + 'wrangler.jsonc', JSON.stringify({ name: 'ncs-motion-lab', compatibility_date: '2026-05-25', main: 'worker.js', assets: { directory: './public', binding: 'ASSETS', not_found_handling: '404-page', run_worker_first: ['/assets/*'] } }, null, 2));
const size = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((a, e) => a + (e.isDirectory() ? size(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
console.log('package', Math.round(size(pub) / 1048576) + ' MB');
console.log(fs.readdirSync(pub).join(' '));
