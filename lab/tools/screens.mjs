// Phone and editor screens per client, plus a portrait crop, for the Deal page.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const LAB = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const REPO = 'C:/Users/natha/Documents/Claude/Projects/_worktrees/ncs-wall/src/assets/';
const sharp = createRequire('C:/Users/natha/Documents/Claude/Projects/_worktrees/ncs-wall/package.json')('sharp');
const slugs = ['stone-steps-50k', 'mas-monograms', 'presbyterian-academy', 'theology-matters', 'first-baptist-muncie', 'reid-design', 'foundation-for-reformed-theology', 'first-presbyterian-orangeburg'];
for (const s of slugs) {
  const home = `${REPO}case-studies/${s}.png`;
  await sharp(home).resize(1000).webp({ quality: 74 }).toFile(`${LAB}assets/${s}-cover.webp`);
  const ph = `${REPO}case-studies/shots/${s}-mobile.png`;
  if (fs.existsSync(ph)) await sharp(ph).extract({ left: 0, top: 0, width: 560, height: 1210 }).resize(420).webp({ quality: 74 }).toFile(`${LAB}assets/${s}-phone.webp`);
  const cms = `${REPO}case-studies/shots/${s}-cms.png`;
  if (fs.existsSync(cms)) await sharp(cms).resize(1100).webp({ quality: 74 }).toFile(`${LAB}assets/${s}-cms.webp`);
  console.log(s, fs.existsSync(ph), fs.existsSync(cms));
}
const m = await sharp(`${REPO}about/portrait-bw.jpg`).metadata();
console.log('portrait', m.width, m.height);
await sharp(`${REPO}about/portrait-bw.jpg`).resize(320).webp({ quality: 76 }).toFile(`${LAB}assets/portrait.webp`);
