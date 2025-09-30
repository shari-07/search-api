export function convertCnyToUsd(cnyAmount: number, rate: number = 6.7): number {
  const usd = cnyAmount / rate;
  return parseFloat(usd.toFixed(2)); // rounds to 2 decimal places
}
