// Safe to edit. Finds the element a tour step should spotlight. This is the part of the
// tour that depends on the admin's own markup, so it is deliberately forgiving: every
// failure path ends in "no target", and the step then shows as a centred card.
//
// Two admin behaviours it has to cope with (both seen in the real EmDash 1.1.0 admin):
//   1. Sidebar groups (Site, Pages, ...) start collapsed. Their links are in the DOM but
//      clipped to zero height by an overflow-hidden parent, so a plain querySelector
//      "finds" a link nobody can see. We skip clipped matches...
//   2. ...and then spotlight the group's own heading button instead (the link lives in a
//      `role="region"` panel that a `button[aria-controls]` opens), which is what the
//      person actually needs to click.
import { visibleFraction, type Box } from '../engine.ts';

function boxOf(el: Element): Box {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/** Visible to a person: rendered, and not clipped away by an overflow-hidden ancestor. */
export function isReallyVisible(el: Element): boolean {
  if (typeof el.checkVisibility === 'function' && !el.checkVisibility()) return false;
  const box = boxOf(el);
  if (box.width <= 0 || box.height <= 0) return false;
  for (let p = el.parentElement; p; p = p.parentElement) {
    const cs = getComputedStyle(p);
    if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
    if (visibleFraction(box, boxOf(p)) < 0.5) return false;
  }
  return true;
}

/** The button that opens the collapsed panel containing `el`, if there is one. */
function collapsedGroupHeading(el: Element): Element | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    if (p.getAttribute('role') === 'region' && p.id) {
      try {
        return document.querySelector(`[aria-controls="${CSS.escape(p.id)}"]`);
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function findTarget(selector: string | undefined): Element | null {
  if (!selector) return null;
  let matches: Element[];
  try {
    matches = Array.from(document.querySelectorAll(selector));
  } catch {
    return null; // an invalid selector in the content file just means "no spotlight"
  }
  // Never spotlight the tour's own card, widget or links (a step's "Open ..." link and the
  // dashboard widget's quick links share hrefs with the sidebar).
  const usable = matches.filter((m) => !m.closest('.sh-root'));
  // A step that names a screen means its SIDEBAR link: try those first, then fall back to
  // anything else on the page that matches.
  const inNav = usable.filter((m) => m.closest('aside, nav, [role="navigation"]'));
  const elsewhere = usable.filter((m) => !inNav.includes(m));

  const shownNav = inNav.find(isReallyVisible);
  if (shownNav) return shownNav;
  for (const m of inNav) {
    const heading = collapsedGroupHeading(m);
    if (heading && isReallyVisible(heading)) return heading;
  }
  return elsewhere.find(isReallyVisible) ?? null;
}
