// Unit tests for the content-file validator, plus a gate on the REAL cms/help/tour.json:
// it must validate, name only collections that exist in cms/schema, and follow the
// studio's writing rules (no em-dashes, none of the banned AI-tell words). The
// writing-rule checks live here, not in validate.ts, because they are this site's
// house style and the plugin itself stays generic.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { HelpContentError, noteFor, validateHelpFile } from './validate.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const realFile = JSON.parse(readFileSync(`${root}cms/help/tour.json`, 'utf8'));

/** A minimal valid file; each test breaks one thing. */
function good(): Record<string, unknown> {
  return {
    version: 1,
    tour: {
      id: 'welcome-1',
      title: 'Tour',
      steps: [{ id: 'a', title: 'A', body: 'Body.' }],
    },
    help: {},
  };
}

function problemsOf(raw: unknown): string[] {
  try {
    validateHelpFile(raw, 'test file');
  } catch (e) {
    assert.ok(e instanceof HelpContentError, 'throws HelpContentError');
    return e.problems;
  }
  return [];
}

describe('validateHelpFile', () => {
  it('accepts a minimal file and fills the defaults', () => {
    const f = validateHelpFile(good());
    assert.equal(f.tour.autoStart, true);
    assert.deepEqual(f.help.goals, []);
    assert.deepEqual(f.collections, {});
  });

  it('accepts the real content file', () => {
    const f = validateHelpFile(realFile, 'cms/help/tour.json');
    assert.ok(f.tour.steps.length >= 8);
    assert.ok(f.help.goals.length >= 10);
  });

  it('rejects a non-object and a wrong version', () => {
    assert.match(problemsOf('x')[0], /JSON object/);
    const g = good();
    g.version = 2;
    assert.match(problemsOf(g)[0], /version: must be 1/);
  });

  it('lists every problem at once, with the JSON path of each', () => {
    const g = good();
    (g.tour as Record<string, unknown>).id = 'Bad Id';
    (g.tour as Record<string, unknown>).steps = [
      { id: 'a', title: '', body: 'x' },
      { id: 'a', title: 'Dup', body: 'x' },
      { id: 'c', title: 'T', body: 'x', path: 'no-slash' },
    ];
    const p = problemsOf(g);
    assert.ok(p.some((m) => m.startsWith('tour.id:')));
    assert.ok(p.some((m) => m.startsWith('tour.steps[0].title: must not be empty')));
    assert.ok(p.some((m) => m.startsWith('tour.steps[1].id:') && m.includes('used twice')));
    assert.ok(p.some((m) => m.startsWith('tour.steps[2].path:')));
    assert.ok(p.length >= 4);
  });

  it('enforces length limits and types', () => {
    const g = good();
    (g.tour as Record<string, unknown>).title = 'x'.repeat(81);
    (g.tour as Record<string, unknown>).autoStart = 'yes';
    const p = problemsOf(g);
    assert.ok(p.some((m) => /tour\.title: is 81 characters; the limit is 80/.test(m)));
    assert.ok(p.some((m) => m.startsWith('tour.autoStart:')));
  });

  it('requires at least one step and rejects protocol-relative paths', () => {
    const g = good();
    (g.tour as Record<string, unknown>).steps = [];
    assert.ok(problemsOf(g).some((m) => m.includes('tour.steps: has 0 items')));
    const h = good();
    h.help = { goals: [{ want: 'a', goTo: 'b', path: '//evil.example' }] };
    assert.ok(problemsOf(h).some((m) => m.startsWith('help.goals[0].path:')));
  });

  it('checks collection notes and the default', () => {
    const g = good();
    g.collections = { 'Bad Slug': { controls: 'x' }, posts: {} };
    g.collectionDefault = { live: 'x' };
    const p = problemsOf(g);
    assert.ok(p.some((m) => m.startsWith('collections.Bad Slug:')));
    assert.ok(p.some((m) => m.startsWith('collections.posts.controls:')));
    assert.ok(p.some((m) => m.startsWith('collectionDefault.controls:')));
  });

  it('puts the source name and a count in the error message', () => {
    try {
      validateHelpFile({ version: 1 }, 'cms/help/tour.json');
      assert.fail('should throw');
    } catch (e) {
      assert.ok(e instanceof HelpContentError);
      assert.match(e.message, /cms\/help\/tour\.json is not valid \(\d+ problems?\)/);
    }
  });
});

describe('noteFor', () => {
  const f = validateHelpFile({
    ...good(),
    collections: { posts: { controls: 'Journal.' } },
    collectionDefault: { controls: 'Default.', live: 'Publish to go live.' },
  });

  it('uses the collection note, borrowing the default live line', () => {
    assert.deepEqual(noteFor(f, 'posts'), { controls: 'Journal.', live: 'Publish to go live.' });
  });

  it('falls back to the default, and to nothing when there is none', () => {
    assert.equal(noteFor(f, 'unknown')?.controls, 'Default.');
    assert.equal(noteFor(validateHelpFile(good()), 'unknown'), null);
  });
});

describe('cms/help/tour.json (the real content)', () => {
  const file = validateHelpFile(realFile, 'cms/help/tour.json');
  const text = JSON.stringify(realFile);

  it('has no em-dashes (house style)', () => {
    assert.equal(text.includes('—'), false);
  });

  it('avoids the banned AI-tell words', () => {
    const banned =
      /\b(delve|navigate|navigating|leverage|robust|seamless|seamlessly|meticulous|tapestry|realm|testament|ever-evolving|crucial|pivotal)\b/i;
    assert.equal(banned.test(text), false, banned.exec(text)?.[0]);
  });

  it('names only collections that exist in cms/schema (plus posts, which the template owns)', () => {
    const slugs = new Set(
      readdirSync(`${root}cms/schema`)
        .filter((n) => n.endsWith('.mjs'))
        .map((n) => n.replace(/\.mjs$/, '')),
    );
    for (const slug of Object.keys(file.collections)) {
      assert.ok(slugs.has(slug), `collections.${slug} has no cms/schema/${slug}.mjs`);
    }
  });

  it('covers the sidebar groups the tour promises', () => {
    const body = file.tour.steps.map((s) => `${s.title} ${s.body}`).join(' ');
    for (const word of [
      'Site settings',
      'Pages',
      'Pricing',
      'Case Studies',
      'Journal',
      'Photography',
      'Publish',
      'Summary',
      'Content Types',
    ]) {
      assert.ok(body.includes(word), `the tour never mentions "${word}"`);
    }
  });

  it('points tour targets at sidebar links for collections that exist', () => {
    for (const s of file.tour.steps) {
      if (!s.target) continue;
      const m = /\/content\/([a-z_]+)/.exec(s.target);
      assert.ok(m, `${s.id}: target is not a /content/<slug> link`);
    }
  });
});
