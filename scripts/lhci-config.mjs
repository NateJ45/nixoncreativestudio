#!/usr/bin/env node
// Safe to edit.
/**
 * lhci-config.mjs - writes lighthouserc.generated.json from lighthouserc.json.
 *
 * lhci does not expand environment variables inside its config, and the URLs it
 * audits are now a deployed Worker preview (the site is hybrid; dist/client is
 * not the whole site). lighthouserc.json is therefore a template whose URLs
 * start with the token ${LHCI_BASE_URL}; this script substitutes the real base
 * URL and writes the file lhci actually reads.
 *
 *   LHCI_BASE_URL=https://ncs-ci.nathanjnixon86.workers.dev \
 *     node scripts/lhci-config.mjs
 *   npx lhci autorun --config=lighthouserc.generated.json
 *
 * The generated file is git-ignored. See lighthouserc.json for the thresholds
 * and why the URL list is explicit.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.LHCI_BASE_URL?.replace(/\/+$/, '');

if (!base) {
  console.error('LHCI_BASE_URL is not set (the deployed URL to audit, no trailing slash).');
  process.exit(1);
}

const template = readFileSync(join(ROOT, 'lighthouserc.json'), 'utf8');
const out = template.split('${LHCI_BASE_URL}').join(base);
JSON.parse(out); // fail here, not inside lhci, if the substitution broke the JSON
writeFileSync(join(ROOT, 'lighthouserc.generated.json'), out);
console.log(`[lhci-config] wrote lighthouserc.generated.json for ${base}`);
