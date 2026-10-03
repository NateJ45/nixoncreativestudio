// Safe to edit.
/* ============================================================================
   production-load.mjs
   ============================================================================
   The orchestration behind `npm run cms:production-load`
   (scripts/cms/production-load.mjs): load every migrated area into a live
   EmDash instance in a safe order, one collection at a time, checking each
   step before the next. Kept free of network, filesystem and prompts so the
   unit tests (src/lib/productionLoad.test.ts) can drive it with fakes.

   Everything the real world touches arrives through `deps`:

     runStep({ tool, collection, mode })  -> { code, output }
         tool is 'schema' or 'content'; mode is 'dry-run' or 'apply'.
         The real one spawns scripts/cms/apply-schema.mjs / load-content.mjs,
         so their production guard and their own validation stay in force.
     preflight(collection)                -> string | undefined   (extra info lines)
     pause(message)                       -> Promise<void>         (press Enter)
     log(line)                            -> void                  (already scrubbed)

   THE CHECKS, per collection (schema first, then content):
     1. dry run   read only. Any destructive or overwriting line stops the run.
     2. apply     only when the dry run showed work to do.
     3. verify    a second DRY RUN (read only, so the check itself writes
                  nothing). Every line must read "unchanged", or the run stops.
   A step that already reads "unchanged" on the first dry run is skipped, which
   is what makes a rerun or a resume safe.
   ============================================================================ */

/** Collections run first, alone, behind an Enter prompt (first real run of the loaders). */
export const GATE_UNITS = ['site_settings', 'menus'];

/** Files in cms/content/ that go through REST and have no schema of their own. */
export const REST_ONLY = ['menus', 'redirects'];

/**
 * Collections whose schema step is EXPECTED to update existing fields: `pages`
 * already exists in production from the EmDash template (Title and Content),
 * so PR 10's block expects "updated field title, updated field content". `posts`
 * (the Journal, PR 12) is the template's other collection: it holds no entries, and
 * its schema step relabels Title, Content and Excerpt (Excerpt becomes required)
 * and adds `updated`.
 */
export const ALLOWS_FIELD_UPDATES = ['pages', 'posts'];

/** Order rank: the runbook order, with anything unknown before redirects. */
export function rank(name) {
  if (name === 'site_settings') return 0;
  if (name === 'menus') return 1;
  if (name.startsWith('pricing_')) return 2;
  if (name.startsWith('page_')) return 3;
  if (name === 'service_offerings') return 4;
  if (name === 'pages') return 5;
  if (name === 'photos') return 6;
  if (name === 'posts') return 7;
  if (name === 'redirects') return 99;
  return 8;
}

/**
 * The ordered plan from what is on disk. `schemaSlugs` are the cms/schema/*.mjs
 * names, `contentNames` the cms/content/*.json names. Returns
 * [{ name, schema, content }] so a later PR's files are picked up with no edit here.
 */
export function buildPlan(schemaSlugs, contentNames) {
  const names = [...new Set([...schemaSlugs, ...contentNames])];
  names.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  return names.map((name) => ({
    name,
    schema: schemaSlugs.includes(name),
    content: contentNames.includes(name),
  }));
}

/** Apply --only / --from to a plan. Throws a readable error on a bad name. */
export function selectPlan(plan, { only, from } = {}) {
  if (only && from) throw new Error('Use --only or --from, not both.');
  const valid = plan.map((u) => u.name).join(', ');
  const target = only ?? from;
  if (!target) return plan;
  const i = plan.findIndex((u) => u.name === target);
  if (i < 0) throw new Error(`Unknown collection "${target}". Valid names: ${valid}`);
  return only ? [plan[i]] : plan.slice(i);
}

/** The plan as printable lines. */
export function formatPlan(plan, url) {
  const lines = [`Target: ${url}`, 'Ordered plan:'];
  plan.forEach((u, i) => {
    const steps = [];
    if (u.schema) steps.push('schema');
    if (u.content) steps.push(REST_ONLY.includes(u.name) ? 'content (REST)' : 'content');
    const note = [
      GATE_UNITS.includes(u.name) ? 'first real run of the loaders' : '',
      ALLOWS_FIELD_UPDATES.includes(u.name)
        ? 'collection already exists from the template: expect updated fields'
        : '',
      u.schema && !u.content ? 'schema only, no content file' : '',
    ].filter(Boolean);
    lines.push(
      `  ${String(i + 1).padStart(2)}. ${u.name}: ${steps.join(' + ')}${note.length ? `  (${note.join('; ')})` : ''}`,
    );
  });
  lines.push(
    'Each step: dry run, apply, then a read-only re-check that must say "unchanged" everywhere.',
  );
  if (
    plan.some((u) => GATE_UNITS.includes(u.name)) &&
    plan.some((u) => !GATE_UNITS.includes(u.name))
  ) {
    lines.push('The run pauses for Enter after site_settings and menus, before the rest.');
  }
  return lines;
}

/* ----------------------------------------------------------------------------
   Scrubbing: no secret may reach the console or the log file
   ---------------------------------------------------------------------------- */

/** Returns scrub(text): every secret value, and any "Bearer <token>", replaced. */
export function makeScrubber(secrets) {
  const list = secrets.filter((s) => typeof s === 'string' && s.length >= 6);
  return (text) => {
    let out = String(text ?? '');
    for (const s of list) out = out.split(s).join('[token hidden]');
    return out.replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi, '$1[token hidden]');
  };
}

/* ----------------------------------------------------------------------------
   Reading what a step printed
   ---------------------------------------------------------------------------- */

/**
 * The result lines of a child's output: exactly two spaces of indent, then text.
 * (apply-schema prints "  unchanged field x"; load-content prints "  slug: unchanged";
 * the media resolver's "    uploaded ..." lines sit at four spaces and are skipped.)
 */
export function resultLines(output) {
  return String(output ?? '')
    .split(/\r?\n/)
    .filter((l) => /^ {2}\S/.test(l))
    .map((l) => l.trim());
}

// A dry run says "would X" (schema lines) or "name: would X" (content lines); drop the "would".
const bare = (line) => line.replace(/^would /, '').replace(/: would /, ': ');
const isUnchangedLine = (line) =>
  /^unchanged\b/.test(bare(line)) || /:\s*(would )?unchanged\s*$/.test(line);

/** True when there is at least one result line and every one reads unchanged. */
export function allUnchanged(lines) {
  return lines.length > 0 && lines.every(isUnchangedLine);
}

/** Lines of a SCHEMA dry run that must stop the run (destructive, or an unexpected edit). */
export function schemaSurprises(lines, collection) {
  return lines.filter((l) => {
    const b = bare(l);
    if (/^(removed obsolete field|dropped )/.test(b)) return true;
    if (/^updated field /.test(b)) return !ALLOWS_FIELD_UPDATES.includes(collection);
    return false;
  });
}

/**
 * Lines of a CONTENT dry run that must stop the run: anything that would
 * overwrite what an editor may already have changed in production.
 */
export function contentSurprises(lines) {
  const created = new Set();
  for (const l of lines) {
    const m = /^menu (\S+): (?:would )?created?$/.exec(l);
    if (m) created.add(m[1]);
  }
  return lines.filter((l) => {
    const b = bare(l);
    if (/: (update|updated)$/.test(b)) return true;
    if (/^redirect \S+: updated$/.test(b)) return true;
    const rebuild = /^menu (\S+): (?:would )?rebuil(?:d|t) /.exec(l);
    if (rebuild && !created.has(rebuild[1])) return true;
    return false;
  });
}

/* ----------------------------------------------------------------------------
   The run
   ---------------------------------------------------------------------------- */

class Stop extends Error {
  constructor(collection, step, reason, lines, next) {
    super(reason);
    this.collection = collection;
    this.step = step;
    this.lines = lines;
    this.next = next;
  }
}

/**
 * Run the plan. Resolves { ok: true, results } or { ok: false, stoppedAt, step, reason }.
 * Never throws for a stop; it logs exactly what to do next.
 *
 *   opts.url   target (for the printed next-step commands)
 *   opts.yes   skip the Enter pause after the first group (tests only)
 */
export async function runLoad(plan, deps, opts) {
  const { runStep, preflight, pause, log } = deps;
  const results = [];
  const manual = (u, tool, mode) =>
    `npm run ${tool === 'schema' ? 'cms:schema' : 'cms:load'} -- --collection ${u.name} --url ${opts.url} ${mode === 'dry-run' ? '--dry-run' : '--yes'}`;

  const step = async (u, tool, mode) => {
    const label = `${u.name} ${tool} ${mode}`;
    log(`  - ${label}`);
    const { code, output } = await runStep({ tool, collection: u.name, mode });
    const lines = resultLines(output);
    for (const l of lines) log(`      ${l}`);
    if (code !== 0) {
      const tail = String(output ?? '')
        .trim()
        .split(/\r?\n/)
        .slice(-8);
      throw new Stop(
        u.name,
        label,
        `${label} exited with code ${code}`,
        tail,
        `Read the error above, fix the cause, then rerun \`npm run cms:production-load -- --from ${u.name}\`. To look at it by hand: ${manual(u, tool, 'dry-run')}`,
      );
    }
    return lines;
  };

  const phase = async (u, tool) => {
    const surprises = tool === 'schema' ? schemaSurprises : contentSurprises;
    const first = await step(u, tool, 'dry-run');
    const bad = surprises(first, u.name);
    if (bad.length) {
      throw new Stop(
        u.name,
        `${u.name} ${tool} dry-run`,
        `${tool} dry run shows a change this tool will not make on its own`,
        bad,
        `Nothing was written for this step. Look at ${u.name} in the admin (or ${manual(u, tool, 'dry-run')}), decide whether the instance or the committed file is right, run it by hand with --yes if the change is wanted, then resume with \`npm run cms:production-load -- --from ${u.name}\`.`,
      );
    }
    if (allUnchanged(first)) {
      log(`    already in place, nothing to apply`);
      return { tool, action: 'unchanged' };
    }
    await step(u, tool, 'apply');
    const again = await step(u, tool, 'dry-run');
    if (!allUnchanged(again)) {
      throw new Stop(
        u.name,
        `${u.name} ${tool} re-check`,
        `${tool} re-check is not all "unchanged" after applying`,
        again.filter((l) => !isUnchangedLine(l)).length
          ? again.filter((l) => !isUnchangedLine(l))
          : ['(no result lines printed)'],
        `The apply ran but the instance does not match the file yet. Do NOT rerun blindly: inspect ${u.name} in /_emdash/admin, then ${manual(u, tool, 'dry-run')}. Once it reads unchanged, resume with \`npm run cms:production-load -- --from ${u.name}\`.`,
      );
    }
    return { tool, action: 'applied' };
  };

  for (const [i, u] of plan.entries()) {
    log(`[${i + 1}/${plan.length}] ${u.name}`);
    try {
      const info = preflight ? await preflight(u.name) : undefined;
      if (info) for (const l of String(info).split(/\r?\n/)) log(`    ${l}`);
      const done = [];
      if (u.schema) done.push(await phase(u, 'schema'));
      if (u.content) done.push(await phase(u, 'content'));
      results.push({ name: u.name, steps: done });
    } catch (e) {
      if (!(e instanceof Stop)) throw e;
      log('');
      log(`STOPPED at ${e.step}: ${e.reason}`);
      for (const l of e.lines) log(`    ${l}`);
      log(`NEXT: ${e.next}`);
      return { ok: false, stoppedAt: e.collection, step: e.step, reason: e.reason, results };
    }
    const later = plan.slice(i + 1);
    const lastGate = GATE_UNITS.includes(u.name) && !later.some((x) => GATE_UNITS.includes(x.name));
    if (lastGate && later.length && !opts.yes) {
      log('');
      log('The first group (site_settings, menus) is done. Check the site, then continue.');
      await pause('Press Enter to continue with the rest, or Ctrl+C to stop here.');
    }
  }
  return { ok: true, results };
}

/** Printed after a clean run. Describes the follow-ups; automates none of them. */
export function followUps(plan, url) {
  const forCi = plan
    .filter((u) => u.content && !REST_ONLY.includes(u.name))
    .map((u) => `'${u.name}'`);
  return [
    'Done. Nothing below is automated; do each by hand:',
    `  1. Add these to PRODUCTION_HAS in scripts/ci-dataset/cms-fixtures.mjs: ${forCi.join(', ') || '(none)'}`,
    "     (keep 'photos' out: CI's test photo is hand-written in scripts/ci-dataset/ci-content/photos.json)",
    `  2. Re-export the seed: node scripts/export-seed-from-instance.mjs --url ${url}`,
    '  3. Then: node scripts/ci-dataset/cms-fixtures.mjs, npm run ci-dataset -- --from-scratch,',
    '     npm run ci-dataset:snapshot, npm run ci-dataset (rebuild ncs-ci), and commit the seed files.',
    '  4. Run the per-page edit proofs and before/after page comparisons in docs/LAUNCH-RUNBOOK.md.',
    '  5. Revoke the API token in /_emdash/admin, Settings, API tokens, and close this PowerShell window.',
  ];
}
