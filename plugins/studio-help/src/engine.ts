// Safe to edit. The pure logic of the tour: step navigation, the "show once per
// user" decision, the seen-record shape, and where to place the pop-up card next to
// a spotlighted element. No React, no DOM, no network, so it is unit tested under
// plain `node --test` (engine.test.ts). The React pieces in ui/ only call these.
import type { SeenRecord } from './types.ts';

// ---------------------------------------------------------------------------
// Step navigation
// ---------------------------------------------------------------------------

export interface TourState {
  /** Zero-based index of the current step. */
  index: number;
  total: number;
  /** false once the tour has been finished or skipped. */
  open: boolean;
  /** How it ended, once closed. */
  ended?: 'done' | 'skipped';
}

export function startTour(total: number): TourState {
  return { index: 0, total, open: total > 0 };
}

export function isFirst(s: TourState): boolean {
  return s.index <= 0;
}

export function isLast(s: TourState): boolean {
  return s.index >= s.total - 1;
}

/** Next step; on the last step it finishes the tour ("Done"). */
export function next(s: TourState): TourState {
  if (!s.open) return s;
  if (isLast(s)) return { ...s, open: false, ended: 'done' };
  return { ...s, index: s.index + 1 };
}

/** Previous step; stays on the first step rather than going below it. */
export function back(s: TourState): TourState {
  if (!s.open || isFirst(s)) return s;
  return { ...s, index: s.index - 1 };
}

/** Jump to a step (progress dots). Out-of-range values are clamped. */
export function goTo(s: TourState, index: number): TourState {
  if (!s.open) return s;
  const clamped = Math.max(0, Math.min(s.total - 1, Math.trunc(index)));
  return { ...s, index: clamped };
}

export function skip(s: TourState): TourState {
  if (!s.open) return s;
  return { ...s, open: false, ended: 'skipped' };
}

/** "Step 2 of 7", read out by screen readers when the step changes. */
export function progressLabel(s: TourState): string {
  return `Step ${s.index + 1} of ${s.total}`;
}

// ---------------------------------------------------------------------------
// Once per user
// ---------------------------------------------------------------------------

/** Turn anything read from storage into a SeenRecord, or null if it is not one. */
export function parseSeenRecord(raw: unknown): SeenRecord | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.tourId !== 'string' || typeof r.at !== 'string') return null;
  if (r.how !== 'auto' && r.how !== 'done' && r.how !== 'skipped') return null;
  return { tourId: r.tourId, at: r.at, how: r.how };
}

/**
 * Should the tour open on its own? Yes when it is switched on and this user has no
 * record for THIS tour id. A record for an older id (you rewrote the tour) does not
 * count, so everyone sees a revised tour once.
 */
export function shouldAutoStart(
  record: SeenRecord | null,
  tour: { id: string; autoStart: boolean },
): boolean {
  if (!tour.autoStart) return false;
  if (!record) return true;
  return record.tourId !== tour.id;
}

export function makeSeenRecord(
  tourId: string,
  how: SeenRecord['how'],
  now: Date = new Date(),
): SeenRecord {
  return { tourId, at: now.toISOString(), how };
}

/** Server-side key (plugin storage) for one user's record. */
export function serverKey(userId: string): string {
  return `seen:${userId}`;
}

/**
 * Browser fallback key, used only if the server could not be reached. Scoped by user
 * id so two editors sharing one browser each get their own tour.
 */
export function localKey(userId: string | null): string {
  return `studio-help:seen:${userId ?? 'anonymous'}`;
}

// ---------------------------------------------------------------------------
// Placement of the card beside a spotlighted element
// ---------------------------------------------------------------------------

export interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface Placement {
  top: number;
  left: number;
  /** Which side of the target the card sits on; "center" when there is no target. */
  side: 'right' | 'left' | 'below' | 'above' | 'center';
}

/**
 * Pick a spot for the card. Prefers the right of the target (the sidebar is on the
 * left), then below, above and left, and falls back to the centre of the viewport
 * when none fits or the viewport is narrow (phones get a centred card). The result
 * is always clamped inside the viewport so the card can never be cut off.
 */
export function placeCard(
  target: Box | null,
  card: { width: number; height: number },
  viewport: { width: number; height: number },
  gap = 16,
  margin = 12,
): Placement {
  const clampX = (x: number) => Math.max(margin, Math.min(viewport.width - card.width - margin, x));
  const clampY = (y: number) =>
    Math.max(margin, Math.min(viewport.height - card.height - margin, y));
  const centre: Placement = {
    top: clampY((viewport.height - card.height) / 2),
    left: clampX((viewport.width - card.width) / 2),
    side: 'center',
  };
  if (!target || viewport.width < 640) return centre;

  const fitsRight = target.left + target.width + gap + card.width <= viewport.width - margin;
  if (fitsRight) {
    return {
      top: clampY(target.top + target.height / 2 - card.height / 2),
      left: target.left + target.width + gap,
      side: 'right',
    };
  }
  const fitsBelow = target.top + target.height + gap + card.height <= viewport.height - margin;
  if (fitsBelow) {
    return {
      top: target.top + target.height + gap,
      left: clampX(target.left + target.width / 2 - card.width / 2),
      side: 'below',
    };
  }
  const fitsAbove = target.top - gap - card.height >= margin;
  if (fitsAbove) {
    return {
      top: target.top - gap - card.height,
      left: clampX(target.left + target.width / 2 - card.width / 2),
      side: 'above',
    };
  }
  const fitsLeft = target.left - gap - card.width >= margin;
  if (fitsLeft) {
    return {
      top: clampY(target.top + target.height / 2 - card.height / 2),
      left: target.left - gap - card.width,
      side: 'left',
    };
  }
  return centre;
}

/**
 * How much of `box` lies inside `clip`, from 0 to 1. A sidebar link inside a collapsed
 * group still has a layout box, but its zero-height, overflow-hidden parent clips it
 * away; comparing the link's box with that parent's box says so (the ratio is 0). A
 * zero-size box counts as 0, never as "fully visible".
 */
export function visibleFraction(box: Box, clip: Box): number {
  const area = box.width * box.height;
  if (area <= 0) return 0;
  const w = Math.min(box.left + box.width, clip.left + clip.width) - Math.max(box.left, clip.left);
  const h = Math.min(box.top + box.height, clip.top + clip.height) - Math.max(box.top, clip.top);
  if (w <= 0 || h <= 0) return 0;
  return (w * h) / area;
}

/** Split a step body into paragraphs on blank lines. */
export function paragraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Admin base path. Paths in the content file are relative to it. */
export const ADMIN_BASE = '/_emdash/admin';

export function adminHref(path: string): string {
  return `${ADMIN_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}
