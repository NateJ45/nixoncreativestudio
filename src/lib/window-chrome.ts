/* The browser chrome drawn on every client window: the padlock in the address
   bar and the toolbar along the bottom. Plain strings, because a Tile, a study
   phone and the contact page's brief phone all draw the same object. */

export const LOCK =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.500 7V5a3.500 3.500 0 0 1 7 0v2h.5a1.500 1.500 0 0 1 1.500 1.500v4A1.500 1.500 0 0 1 12 14H4a1.500 1.500 0 0 1-1.500-1.500v-4A1.500 1.500 0 0 1 4 7zm1.500 0h4V5a2 2 0 0 0-4 0z"/></svg>';

const ic = (d: string, off = false) =>
  `<svg viewBox="0 0 24 24"${off ? ' class="off"' : ''}><path d="${d}"/></svg>`;

export const TOOLS =
  ic('M15 5l-7 7 7 7') +
  ic('M9 5l7 7-7 7', true) +
  ic('M12 15V3M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7') +
  ic('M5 7a2 2 0 0 1 2-2h4v14H7a2 2 0 0 1-2-2zM11 5h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-6') +
  ic('M8 8h11v11H8zM5 16V5h11');
