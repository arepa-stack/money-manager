/**
 * Timezone-safe local date YYYY-MM-DD formatter.
 * Returns the date portion of a Date object in the local timezone,
 * avoiding offsets that could shift the day.
 * 
 * @example getLocalDateString(new Date()) → "2026-06-03"
 */
export const getLocalDateString = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};
