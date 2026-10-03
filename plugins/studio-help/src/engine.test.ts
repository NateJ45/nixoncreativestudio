// Unit tests for the tour logic in engine.ts (step navigation, once-per-user state,
// card placement). Run by `npm run test:unit` under Node's native type stripping.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  adminHref,
  back,
  goTo,
  isFirst,
  isLast,
  localKey,
  makeSeenRecord,
  next,
  paragraphs,
  parseSeenRecord,
  placeCard,
  progressLabel,
  serverKey,
  shouldAutoStart,
  skip,
  startTour,
  visibleFraction,
} from './engine.ts';

describe('step navigation', () => {
  it('starts open on step 0, and is closed for an empty tour', () => {
    assert.deepEqual(startTour(3), { index: 0, total: 3, open: true });
    assert.equal(startTour(0).open, false);
  });

  it('walks forward and finishes with "done" on the last step', () => {
    let s = startTour(3);
    s = next(s);
    s = next(s);
    assert.equal(s.index, 2);
    assert.equal(isLast(s), true);
    s = next(s);
    assert.equal(s.open, false);
    assert.equal(s.ended, 'done');
  });

  it('goes back but never below the first step', () => {
    let s = startTour(3);
    assert.equal(isFirst(s), true);
    assert.equal(back(s).index, 0);
    s = next(next(s));
    assert.equal(back(s).index, 1);
  });

  it('jumps to a step and clamps out-of-range values', () => {
    const s = startTour(5);
    assert.equal(goTo(s, 3).index, 3);
    assert.equal(goTo(s, -4).index, 0);
    assert.equal(goTo(s, 99).index, 4);
    assert.equal(goTo(s, 2.9).index, 2);
  });

  it('skip closes with "skipped" and a closed tour ignores further input', () => {
    const s = skip(startTour(4));
    assert.equal(s.open, false);
    assert.equal(s.ended, 'skipped');
    assert.deepEqual(next(s), s);
    assert.deepEqual(back(s), s);
    assert.deepEqual(goTo(s, 2), s);
    assert.deepEqual(skip(s), s);
  });

  it('a one-step tour finishes on the first Next', () => {
    const s = next(startTour(1));
    assert.equal(s.ended, 'done');
  });

  it('labels progress for screen readers', () => {
    assert.equal(progressLabel(next(startTour(7))), 'Step 2 of 7');
  });
});

describe('once per user', () => {
  const tour = { id: 'welcome-1', autoStart: true };

  it('shows to a user with no record', () => {
    assert.equal(shouldAutoStart(null, tour), true);
  });

  it('does not show again once seen, however it ended', () => {
    for (const how of ['auto', 'done', 'skipped'] as const) {
      assert.equal(shouldAutoStart(makeSeenRecord('welcome-1', how), tour), false, how);
    }
  });

  it('shows again when the tour id changes (a revised tour)', () => {
    assert.equal(shouldAutoStart(makeSeenRecord('welcome-0', 'done'), tour), true);
  });

  it('never auto-starts when autoStart is off', () => {
    assert.equal(shouldAutoStart(null, { id: 'x', autoStart: false }), false);
  });

  it('builds a record with an ISO timestamp', () => {
    const r = makeSeenRecord('t', 'done', new Date('2026-10-03T12:00:00Z'));
    assert.deepEqual(r, { tourId: 't', at: '2026-10-03T12:00:00.000Z', how: 'done' });
  });

  it('parses stored records and rejects junk', () => {
    const good = makeSeenRecord('t', 'skipped');
    assert.deepEqual(parseSeenRecord(JSON.parse(JSON.stringify(good))), good);
    assert.equal(parseSeenRecord(null), null);
    assert.equal(parseSeenRecord('x'), null);
    assert.equal(parseSeenRecord({ tourId: 't' }), null);
    assert.equal(parseSeenRecord({ tourId: 't', at: 'now', how: 'maybe' }), null);
  });

  it('keys storage per user so two people never share a record', () => {
    assert.notEqual(serverKey('u1'), serverKey('u2'));
    assert.notEqual(localKey('u1'), localKey('u2'));
    assert.notEqual(localKey(null), localKey('u1'));
  });
});

describe('card placement', () => {
  const card = { width: 400, height: 300 };
  const vp = { width: 1440, height: 900 };

  it('centres the card when there is no target', () => {
    const p = placeCard(null, card, vp);
    assert.equal(p.side, 'center');
    assert.equal(p.left, 520);
    assert.equal(p.top, 300);
  });

  it('puts the card to the right of a sidebar target', () => {
    const p = placeCard({ top: 200, left: 8, width: 240, height: 36 }, card, vp);
    assert.equal(p.side, 'right');
    assert.equal(p.left, 8 + 240 + 16);
  });

  it('falls back below, then above, when there is no room on the right', () => {
    const wide = { top: 100, left: 20, width: 1400, height: 40 };
    assert.equal(placeCard(wide, card, vp).side, 'below');
    const bottom = { top: 840, left: 20, width: 1400, height: 40 };
    assert.equal(placeCard(bottom, card, vp).side, 'above');
  });

  it('centres on phones even when there is a target', () => {
    const p = placeCard({ top: 10, left: 10, width: 40, height: 40 }, card, {
      width: 390,
      height: 800,
    });
    assert.equal(p.side, 'center');
  });

  it('always keeps the card inside the viewport', () => {
    const spots = [
      { top: -50, left: -50, width: 40, height: 40 },
      { top: 880, left: 1430, width: 40, height: 40 },
      { top: 450, left: 700, width: 40, height: 40 },
    ];
    for (const t of spots) {
      const p = placeCard(t, card, vp);
      assert.ok(p.left >= 0 && p.left + card.width <= vp.width, JSON.stringify(p));
      assert.ok(p.top >= 0 && p.top + card.height <= vp.height, JSON.stringify(p));
    }
  });
});

describe('visibleFraction (is the target really on screen?)', () => {
  const clip = { top: 0, left: 0, width: 200, height: 100 };

  it('is 1 for a box fully inside its clipping parent', () => {
    assert.equal(visibleFraction({ top: 10, left: 10, width: 50, height: 20 }, clip), 1);
  });

  it('is 0 for a link inside a collapsed (zero-height) group', () => {
    const collapsedGroup = { top: 220, left: 8, width: 240, height: 0 };
    assert.equal(visibleFraction({ top: 222, left: 8, width: 240, height: 34 }, collapsedGroup), 0);
  });

  it('is 0 for a zero-size box and for a box fully outside', () => {
    assert.equal(visibleFraction({ top: 10, left: 10, width: 0, height: 20 }, clip), 0);
    assert.equal(visibleFraction({ top: 500, left: 10, width: 50, height: 20 }, clip), 0);
  });

  it('is the overlapping share when the box is half clipped', () => {
    assert.equal(visibleFraction({ top: 80, left: 0, width: 100, height: 40 }, clip), 0.5);
  });
});

describe('text helpers', () => {
  it('splits a body on blank lines', () => {
    assert.deepEqual(paragraphs('One.\n\nTwo.\n  \nThree.'), ['One.', 'Two.', 'Three.']);
    assert.deepEqual(paragraphs('Just one.'), ['Just one.']);
  });

  it('turns a content-file path into an admin URL', () => {
    assert.equal(adminHref('/content/posts'), '/_emdash/admin/content/posts');
    assert.equal(adminHref('menus'), '/_emdash/admin/menus');
  });
});
