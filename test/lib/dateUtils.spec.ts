// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { getLocalDateString } from '../../src/lib/dateUtils';

describe('dateUtils', () => {
  describe('getLocalDateString', () => {
    it('should format a date correctly as YYYY-MM-DD', () => {
      // Note: JS Month is 0-indexed, so 5 represents June
      const testDate = new Date(2026, 5, 3);
      const result = getLocalDateString(testDate);
      expect(result).toBe('2026-06-03');
    });

    it('should pad single digit days and months with leading zeros', () => {
      const testDate = new Date(2026, 0, 9);
      const result = getLocalDateString(testDate);
      expect(result).toBe('2026-01-09');
    });
  });
});
