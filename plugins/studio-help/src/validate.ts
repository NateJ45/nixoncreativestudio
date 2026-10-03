// Safe to edit. Validates the content file and throws ONE error that lists every
// problem, with the JSON path of each, so a typo in the file is fixed in one pass.
// Runs in three places: when astro.config.mjs builds the plugin descriptor (so a
// bad file fails `astro dev` and `astro build` before anything deploys), when the
// plugin is created inside the Worker, and in the unit tests. It has no imports
// beyond types so it also runs under plain `node --test`.
import type {
  CollectionNote,
  Help,
  HelpFile,
  HelpGoal,
  HelpLink,
  HelpTopic,
  Tour,
  TourStep,
} from './types.ts';

export class HelpContentError extends Error {
  problems: string[];
  constructor(problems: string[], source = 'help content file') {
    super(
      `[studio-help] ${source} is not valid (${problems.length} problem${
        problems.length === 1 ? '' : 's'
      }):\n` + problems.map((p) => `  - ${p}`).join('\n'),
    );
    this.name = 'HelpContentError';
    this.problems = problems;
  }
}

const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const SLUG = /^[a-z0-9][a-z0-9_-]{0,63}$/;

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Collects problems instead of throwing on the first one. */
class Check {
  problems: string[] = [];
  fail(path: string, msg: string) {
    this.problems.push(`${path}: ${msg}`);
  }
  str(obj: Rec, key: string, path: string, max: number, required = true): string | undefined {
    const v = obj[key];
    const here = `${path}.${key}`;
    if (v === undefined || v === null) {
      if (required) this.fail(here, 'is required');
      return undefined;
    }
    if (typeof v !== 'string') {
      this.fail(here, `must be text (got ${Array.isArray(v) ? 'a list' : typeof v})`);
      return undefined;
    }
    if (required && v.trim() === '') {
      this.fail(here, 'must not be empty');
      return undefined;
    }
    if (v.length > max) {
      this.fail(here, `is ${v.length} characters; the limit is ${max}`);
      return undefined;
    }
    return v;
  }
  adminPath(obj: Rec, key: string, path: string, required = true): string | undefined {
    const v = this.str(obj, key, path, 200, required);
    if (v !== undefined && !(v.startsWith('/') && !v.startsWith('//'))) {
      this.fail(
        `${path}.${key}`,
        `must start with a single "/" (an admin path like "/content/posts"), got "${v}"`,
      );
      return undefined;
    }
    return v;
  }
  list(obj: Rec, key: string, path: string, min: number, max: number): unknown[] | undefined {
    const v = obj[key];
    if (v === undefined || v === null) {
      if (min > 0) this.fail(`${path}.${key}`, 'is required');
      return undefined;
    }
    if (!Array.isArray(v)) {
      this.fail(`${path}.${key}`, 'must be a list');
      return undefined;
    }
    if (v.length < min || v.length > max) {
      this.fail(
        `${path}.${key}`,
        `has ${v.length} item${v.length === 1 ? '' : 's'}; allowed ${min} to ${max}`,
      );
    }
    return v;
  }
}

function parseNote(c: Check, raw: unknown, path: string): CollectionNote | undefined {
  if (!isRec(raw)) {
    c.fail(path, 'must be an object with "controls" (and optionally "leaveAlone", "live")');
    return undefined;
  }
  const controls = c.str(raw, 'controls', path, 400);
  const leaveAlone = c.str(raw, 'leaveAlone', path, 400, false);
  const live = c.str(raw, 'live', path, 300, false);
  if (controls === undefined) return undefined;
  const note: CollectionNote = { controls };
  if (leaveAlone !== undefined) note.leaveAlone = leaveAlone;
  if (live !== undefined) note.live = live;
  return note;
}

/**
 * Validate parsed JSON (any value) and return it as a typed HelpFile.
 * `source` names the file in the error message.
 */
export function validateHelpFile(raw: unknown, source = 'help content file'): HelpFile {
  const c = new Check();
  if (!isRec(raw)) throw new HelpContentError(['the file must be a JSON object'], source);

  if (raw.version !== 1) c.fail('version', `must be 1 (got ${JSON.stringify(raw.version)})`);

  // ---- tour ----
  let tour: Tour | undefined;
  if (!isRec(raw.tour)) {
    c.fail('tour', 'is required and must be an object');
  } else {
    const t = raw.tour;
    const id = c.str(t, 'id', 'tour', 64);
    if (id !== undefined && !ID.test(id)) {
      c.fail('tour.id', `must be lowercase letters, digits and dashes (got "${id}")`);
    }
    const title = c.str(t, 'title', 'tour', 80);
    const intro = c.str(t, 'intro', 'tour', 400, false) ?? '';
    if (t.autoStart !== undefined && typeof t.autoStart !== 'boolean') {
      c.fail('tour.autoStart', 'must be true or false');
    }
    const steps: TourStep[] = [];
    const seen = new Set<string>();
    (c.list(t, 'steps', 'tour', 1, 30) ?? []).forEach((s, i) => {
      const p = `tour.steps[${i}]`;
      if (!isRec(s)) return c.fail(p, 'must be an object');
      const sid = c.str(s, 'id', p, 64);
      if (sid !== undefined) {
        if (!ID.test(sid)) {
          c.fail(`${p}.id`, `must be lowercase letters, digits and dashes (got "${sid}")`);
        }
        if (seen.has(sid)) c.fail(`${p}.id`, `"${sid}" is used twice; ids must be unique`);
        seen.add(sid);
      }
      const stitle = c.str(s, 'title', p, 80);
      const body = c.str(s, 'body', p, 900);
      const target = c.str(s, 'target', p, 200, false);
      const path = c.adminPath(s, 'path', p, false);
      const pathLabel = c.str(s, 'pathLabel', p, 60, false);
      if (sid !== undefined && stitle !== undefined && body !== undefined) {
        const step: TourStep = { id: sid, title: stitle, body };
        if (target !== undefined) step.target = target;
        if (path !== undefined) step.path = path;
        if (pathLabel !== undefined) step.pathLabel = pathLabel;
        steps.push(step);
      }
    });
    if (id !== undefined && title !== undefined) {
      tour = { id, title, intro, autoStart: t.autoStart !== false, steps };
    }
  }

  // ---- help ----
  let help: Help | undefined;
  if (!isRec(raw.help)) {
    c.fail('help', 'is required and must be an object');
  } else {
    const h = raw.help;
    const intro = c.str(h, 'intro', 'help', 600, false) ?? '';
    const goals: HelpGoal[] = [];
    (c.list(h, 'goals', 'help', 0, 60) ?? []).forEach((g, i) => {
      const p = `help.goals[${i}]`;
      if (!isRec(g)) return c.fail(p, 'must be an object');
      const want = c.str(g, 'want', p, 140);
      const goTo = c.str(g, 'goTo', p, 100);
      const path = c.adminPath(g, 'path', p);
      const note = c.str(g, 'note', p, 200, false);
      if (want !== undefined && goTo !== undefined && path !== undefined) {
        const goal: HelpGoal = { want, goTo, path };
        if (note !== undefined) goal.note = note;
        goals.push(goal);
      }
    });
    const quickLinks: HelpLink[] = [];
    (c.list(h, 'quickLinks', 'help', 0, 8) ?? []).forEach((l, i) => {
      const p = `help.quickLinks[${i}]`;
      if (!isRec(l)) return c.fail(p, 'must be an object');
      const label = c.str(l, 'label', p, 60);
      const path = c.adminPath(l, 'path', p);
      const description = c.str(l, 'description', p, 140, false);
      if (label !== undefined && path !== undefined) {
        const link: HelpLink = { label, path };
        if (description !== undefined) link.description = description;
        quickLinks.push(link);
      }
    });
    const topicList = (key: string): HelpTopic[] => {
      const out: HelpTopic[] = [];
      (c.list(h, key, 'help', 0, 20) ?? []).forEach((tp, i) => {
        const p = `help.${key}[${i}]`;
        if (!isRec(tp)) return c.fail(p, 'must be an object');
        const title = c.str(tp, 'title', p, 100);
        const body = c.str(tp, 'body', p, 900);
        if (title !== undefined && body !== undefined) out.push({ title, body });
      });
      return out;
    };
    help = {
      intro,
      goals,
      quickLinks,
      leaveAlone: topicList('leaveAlone'),
      topics: topicList('topics'),
    };
  }

  // ---- collections ----
  const collections: Record<string, CollectionNote> = {};
  if (raw.collections !== undefined) {
    if (!isRec(raw.collections)) {
      c.fail('collections', 'must be an object keyed by collection slug');
    } else {
      for (const [slug, v] of Object.entries(raw.collections)) {
        if (!SLUG.test(slug)) {
          c.fail(
            `collections.${slug}`,
            'the key must be a collection slug (letters, digits, _ and -)',
          );
        }
        const note = parseNote(c, v, `collections.${slug}`);
        if (note) collections[slug] = note;
      }
    }
  }
  const collectionDefault =
    raw.collectionDefault === undefined
      ? undefined
      : parseNote(c, raw.collectionDefault, 'collectionDefault');

  if (c.problems.length > 0 || !tour || !help) {
    throw new HelpContentError(c.problems.length ? c.problems : ['unknown problem'], source);
  }
  const file: HelpFile = { version: 1, tour, help, collections };
  if (collectionDefault) file.collectionDefault = collectionDefault;
  return file;
}

/** The note for one collection: its own entry, else the default, else nothing. */
export function noteFor(file: HelpFile, collection: string): CollectionNote | null {
  const own = file.collections[collection];
  if (own) {
    const live = own.live ?? file.collectionDefault?.live;
    return live === undefined ? { ...own } : { ...own, live };
  }
  return file.collectionDefault ?? null;
}
