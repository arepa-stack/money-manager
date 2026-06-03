// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  convertAmount,
  convertAmountReverse,
  formatConversionResult,
  calculateVesToUsd,
  calculateEurToUsd,
} from '../../src/lib/exchangeUtils';

describe('exchangeUtils', () => {
  describe('convertAmount', () => {
    it('should convert amount correctly using rates', () => {
      // (100 USD_O * 40.0) / 1.0 = 4000
      const result = convertAmount(100, 40.0, 1.0);
      expect(result).toBe(4000);
    });

    it('should return 0 if target rate is <= 0', () => {
      expect(convertAmount(100, 40.0, 0)).toBe(0);
      expect(convertAmount(100, 40.0, -1.5)).toBe(0);
    });
  });

  describe('convertAmountReverse', () => {
    it('should convert amount in reverse correctly using rates', () => {
      // (100 * 1.0) / 40.0 = 2.5
      const result = convertAmountReverse(100, 40.0, 1.0);
      expect(result).toBe(2.5);
    });

    it('should return 0 if source rate is <= 0', () => {
      expect(convertAmountReverse(100, 0, 1.0)).toBe(0);
      expect(convertAmountReverse(100, -2.0, 1.0)).toBe(0);
    });
  });

  describe('formatConversionResult', () => {
    it('should format VES with 2 decimals regardless of scale', () => {
      expect(formatConversionResult(123.456, 'VES')).toBe('123.46');
      expect(formatConversionResult(0.12345, 'VES')).toBe('0.12');
    });

    it('should format foreign currency below 1.0 with 4 decimals', () => {
      expect(formatConversionResult(0.12345, 'USD')).toBe('0.1235');
      expect(formatConversionResult(0.00012, 'EUR')).toBe('0.0001');
    });

    it('should format foreign currency above 1.0 with 2 decimals', () => {
      expect(formatConversionResult(1.2345, 'USD')).toBe('1.23');
      expect(formatConversionResult(100.5, 'EUR')).toBe('100.50');
    });
  });

  describe('calculateVesToUsd', () => {
    it('should divide amount by VES rate to get USD', () => {
      expect(calculateVesToUsd(100, 40.0)).toBe(2.5);
    });

    it('should return 0 if VES rate is <= 0', () => {
      expect(calculateVesToUsd(100, 0)).toBe(0);
      expect(calculateVesToUsd(100, -1)).toBe(0);
    });
  });

  describe('calculateEurToUsd', () => {
    it('should calculate USD equivalent of EUR using both rates', () => {
      // 100 * (43.0 / 40.0) = 107.5
      expect(calculateEurToUsd(100, 43.0, 40.0)).toBe(107.5);
    });

    it('should return 0 if USD rate is <= 0', () => {
      expect(calculateEurToUsd(100, 43.0, 0)).toBe(0);
      expect(calculateEurToUsd(100, 43.0, -10)).toBe(0);
    });
  });
});
