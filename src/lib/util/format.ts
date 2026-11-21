/** A percentage rounded down, so a run with any miss never shows 100%. */
export function pct(x: number, digits = 0): string {
  const f = 10 ** digits;
  return (Math.floor(x * f + 1e-9) / f).toFixed(digits);
}
