/**
 * Utility functions for currency conversion and exchange rates.
 */

/**
 * Converts an amount from one currency rate to another.
 * Formula: (amount * rateFrom) / rateTo
 */
export function convertAmount(
  amount: number,
  rateFrom: number,
  rateTo: number
): number {
  if (rateTo <= 0) return 0;
  return (amount * rateFrom) / rateTo;
}

/**
 * Converts an amount in reverse from target currency rate back to source currency rate.
 * Formula: (amount * rateTo) / rateFrom
 */
export function convertAmountReverse(
  amount: number,
  rateFrom: number,
  rateTo: number
): number {
  if (rateFrom <= 0) return 0;
  return (amount * rateTo) / rateFrom;
}

/**
 * Formats a conversion result to decimal places based on the target currency type.
 * Bs. (VES) always gets 2 decimals.
 * Foreign values below 1.0 get 4 decimals, otherwise 2.
 */
export function formatConversionResult(
  result: number,
  targetCurrency: string
): string {
  const isVes = targetCurrency.toUpperCase() === 'VES';
  const decimals = isVes ? 2 : result < 1 ? 4 : 2;
  return result.toFixed(decimals);
}

/**
 * Calculates USD equivalent from VES using a given rate.
 */
export function calculateVesToUsd(amount: number, vesRate: number): number {
  if (vesRate <= 0) return 0;
  return amount / vesRate;
}

/**
 * Calculates USD equivalent from EUR using EUR rate and USD rate.
 * Formula: amount * (eurRate / usdRate)
 */
export function calculateEurToUsd(
  amount: number,
  eurRate: number,
  usdRate: number
): number {
  if (usdRate <= 0) return 0;
  return amount * (eurRate / usdRate);
}
