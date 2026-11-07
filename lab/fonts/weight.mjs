// Compares the self-hosted Hanken file with the font trial: computed weight, loaded faces, and whether bold really widens the text.
import { createRequire } from 'node:module';
const { chromium } = createRequire('C:/Users/natha/Documents/Claude/Projects/_worktrees/ncs-wall/package.json')('playwright');
const BASE = process.argv[2] || 'http://127.0.0.1:4610';
const b = await chromium.launch({ channel: 'chrome' });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.goto(BASE + '/deal/', { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
console.log(await p.evaluate(async () => {
  const w = (wt) => { const c = document.createElement('canvas').getContext('2d'); c.font = wt + " 100px 'Hanken Grotesk'"; return Math.round(c.measureText('pull their weight.').width); };
  await Promise.all([400, 500, 700, 900].map((x) => document.fonts.load(x + " 100px 'Hanken Grotesk'")));
  const em = document.querySelector('h1 b .w') || document.querySelector('h1 b');
  return { faces: [...document.fonts].map((f) => f.family + ' ' + f.weight + ' ' + f.status), h1: getComputedStyle(document.querySelector('h1')).fontWeight, bold: getComputedStyle(em).fontWeight, family: getComputedStyle(em).fontFamily, widths: { 400: w(400), 500: w(500), 700: w(700), 900: w(900) } };
}));
await b.close();
