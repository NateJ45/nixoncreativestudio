// Writes the smaller copies of the phone stills that the cards' srcset uses:
// public/assets/{slug}-m.webp (584w) -> {slug}-m-320.webp and {slug}-m-448.webp,
// and public/assets/portrait.webp (320w) -> portrait-160.webp.
// Run after re-capturing a still: `node scripts/still-sizes.mjs`.
import { readdirSync } from 'node:fs';
import sharp from 'sharp';

const dir = 'public/assets/';
const jobs = readdirSync(dir)
  .filter((f) => /-m\.webp$/.test(f))
  .flatMap((f) => [320, 448].map((w) => [f, w]));
jobs.push(['portrait.webp', 160]);

for (const [f, w] of jobs) {
  const out = dir + f.replace(/\.webp$/, `-${w}.webp`);
  await sharp(dir + f)
    .resize({ width: w })
    .webp({ quality: 80 })
    .toFile(out);
  console.log(out);
}
