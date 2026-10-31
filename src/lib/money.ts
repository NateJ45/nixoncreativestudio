/* ============================================================================
   Money helpers
   ============================================================================
   Two small functions that keep every price on the site tied to
   src/data/pricing.ts, the single source of truth for pricing.

   money(4000)            -> '$4,000'   (a number from pricing.ts, printed)
   dollars('$500 to $2,000') -> [500, 2000] (the numbers inside a display string)

   dollars() exists so the JSON-LD offers on /services and the text in
   /llms.txt are read from the SAME display strings visitors see ('from $900',
   '$180'), rather than from a second copy of the number that could drift.
   ============================================================================ */

/** Formats a whole-dollar amount the way the site prints prices: '$4,000'. */
export function money(amount: number): string {
  return `$${amount.toLocaleString('en-US')}`;
}

/**
 * Pulls every dollar amount out of a display string, in order.
 * 'Most land between $7,000 and $11,000' -> [7000, 11000]. Returns [] when the
 * string has no dollar amount in it.
 */
export function dollars(text: string): number[] {
  return [...text.matchAll(/\$(\d[\d,]*)/g)].map((m) => Number(m[1].replace(/,/g, '')));
}
