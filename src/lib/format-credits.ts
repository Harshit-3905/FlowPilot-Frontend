/** Microcredits per displayed M (matches backend wire convention). */
export const MICROCREDITS_PER_M = 1_000_000;

/** Prefer API `displayM`; fall back to microcredits ÷ 1e6. */
export function toDisplayM(
  displayM: number | undefined,
  microcredits: number,
): number {
  return displayM ?? microcredits / MICROCREDITS_PER_M;
}

/**
 * Header chrome format: `1.72`, `0.00`, `10.00` (two decimals, product Est/Bal).
 */
export function formatDisplayM(m: number): string {
  return m.toFixed(2);
}

/**
 * Execution History list format: Magica `Credits: 0.0001M` (four decimals).
 */
export function formatHistoryCreditsM(m: number): string {
  return m.toFixed(4);
}
