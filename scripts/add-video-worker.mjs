// A static Astro build deploys as assets only, and the adapter drops any Worker
// named in wrangler.jsonc. iPhones will not play video without byte ranges, so
// this adds src/worker.ts to the generated deploy config after the build. Only
// *.mp4 reaches the Worker; everything else is still served as a plain asset.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const path = 'dist/client/wrangler.json';
if (!existsSync(path)) {
  console.error(
    `[video-worker] ${path} not found, so the build layout changed. Footage would not play on iPhones.`,
  );
  process.exit(1);
}
const config = JSON.parse(readFileSync(path, 'utf8'));
config.main = '../../src/worker.ts';
config.assets = { ...config.assets, binding: 'ASSETS', run_worker_first: ['/**/*.mp4'] };
writeFileSync(path, JSON.stringify(config));
console.log('[video-worker] added to the deploy config, for *.mp4 only.');
