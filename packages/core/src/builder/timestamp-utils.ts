/**
 * Creates an ISO-8601 UTC timestamp in the format required by Kodebase artifacts.
 * Format: YYYY-MM-DDTHH:MM:SSZ (no milliseconds).
 *
 * @param date - Optional Date object. If not provided, uses current time.
 * @returns ISO-8601 UTC timestamp string without milliseconds
 *
 * @example
 * createTimestamp() // "2025-11-01T18:30:00Z"
 * createTimestamp(new Date("2025-11-01T18:30:00.123Z")) // "2025-11-01T18:30:00Z"
 */
export function createTimestamp(date?: Date): string {
  const d = date ?? new Date();
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}
