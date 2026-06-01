/**
 * Money Pattern Utilities
 *
 * All monetary values in this application are stored as integer cents
 * (e.g. $15.30 → 1530). These helpers handle the conversion to
 * human-readable format exclusively at the presentation layer.
 *
 * RULE: Never divide by 100 outside of JSX rendering.
 *       Accumulations must stay as integers.
 */

/**
 * Formats a cent-integer to a locale-aware display string.
 * @example formatCents(153045) → "1,530.45"
 * @example formatCents(0)      → "0.00"
 */
export function formatCents(
  cents: number,
  options?: Intl.NumberFormatOptions
): string {
  return (cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  });
}

/**
 * Converts cent-integer to a decimal number (only for rendering calculations,
 * e.g. SVG chart scales).
 * @example centsToDecimal(153045) → 1530.45
 */
export function centsToDecimal(cents: number): number {
  return cents / 100;
}
