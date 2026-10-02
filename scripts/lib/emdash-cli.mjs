// Safe to edit.
/* ============================================================================
   emdash-cli.mjs
   ============================================================================
   Tiny wrapper that drives the `emdash` CLI as a child process and returns the
   parsed JSON. Used by scripts/emdash-schema-case-studies.mjs and
   scripts/migrate-case-studies.mjs.

   Why the CLI and not the REST API directly: the CLI already holds the stored
   login for the instance (emdash login), so the scripts need no token handling
   and no credentials ever pass through this repo. If EMDASH_TOKEN is set, the
   CLI picks it up on its own, so CI works the same way.

   Quirks handled here:
   - The CLI prints human progress lines to stderr and the JSON result to stdout
     when --json is passed, so stdout is parsed and stderr is only shown on error.
   - On Windows the CLI sometimes dies at exit with a libuv assertion
     ("UV_HANDLE_CLOSING") AFTER it has already printed its result. We treat a
     parseable JSON result as success regardless of the exit code.
   - Long payloads go through --file (a temp file) because Windows caps the
     command line near 32k characters.
   ============================================================================ */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
// Resolve the CLI entry from the installed emdash package, so we never depend on
// npx or PATH.
const CLI = require.resolve('emdash/cli');

/** Extract the first JSON document (object or array) from CLI stdout. */
function parseJson(stdout) {
  const start = stdout.search(/[[{]/);
  if (start === -1) return undefined;
  const text = stdout.slice(start).trim();
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * Run `emdash <args...> --url <url> --json`. Returns the parsed JSON (or
 * undefined when the command printed none). Throws with the real CLI error text
 * on failure.
 */
export function emdash(url, args) {
  const res = spawnSync(process.execPath, [CLI, ...args, '--url', url, '--json'], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, NO_COLOR: '1' },
  });
  const json = parseJson(res.stdout || '');
  if (json !== undefined && json.success !== false) return json;
  const err = (res.stderr || '').replace(/\r/g, '').trim();
  const tail = err
    .split('\n')
    .filter((l) => !l.includes('UV_HANDLE_CLOSING'))
    .join('\n');
  throw new Error(`emdash ${args.join(' ')} failed (exit ${res.status}): ${tail || res.stdout}`);
}

/** Write a JSON payload to a temp file, run fn(path), then clean up. */
export function withJsonFile(payload, fn) {
  const dir = mkdtempSync(join(tmpdir(), 'emdash-'));
  const file = join(dir, 'payload.json');
  writeFileSync(file, JSON.stringify(payload));
  try {
    return fn(file);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
