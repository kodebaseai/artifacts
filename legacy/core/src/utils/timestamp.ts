/**
 * Timestamp utilities for Kodebase artifacts
 *
 * Provides consistent timestamp formatting and parsing for event creation.
 * All timestamps follow ISO 8601 format with UTC timezone.
 * @module @kodebase/core/utils/timestamp
 * @description Timestamp utilities for Kodebase artifacts
 * @exports formatTimestamp
 * @exports parseTimestamp
 * @exports isValidTimestamp
 */

/**
 * Formats current UTC time as ISO 8601 timestamp
 *
 * @returns Current UTC time in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
 * @private
 * @example
 * const timestamp = formatTimestamp();
 * // Returns: "2025-01-11T12:00:00.000Z"
 */
export function formatTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Parses and validates an ISO 8601 timestamp
 *
 * @param timestamp - Timestamp string to validate and parse
 * @returns Date object if valid, throws error if invalid
 * @throws Error if timestamp is not valid ISO 8601 format
 * @private
 * @example
 * const date = parseTimestamp("2025-01-11T12:00:00Z");
 * // Returns: Date object
 *
 * parseTimestamp("invalid");
 * // Throws: Error("Invalid timestamp format. Expected ISO 8601 format.")
 */
export function parseTimestamp(timestamp: string): Date {
  if (typeof timestamp !== 'string' || timestamp.trim() === '') {
    throw new Error('Invalid timestamp format. Expected ISO 8601 format.');
  }

  // First check basic format with regex
  const utcPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z?$/;
  if (!utcPattern.test(timestamp)) {
    throw new Error(
      'Invalid timestamp format. Expected ISO 8601 format with UTC timezone.',
    );
  }

  const date = new Date(timestamp);

  // Check if the date is valid
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid timestamp format. Expected ISO 8601 format.');
  }

  return date;
}

/**
 * Validates if a string is a valid ISO 8601 timestamp
 *
 * @param timestamp - Timestamp string to validate
 * @returns True if valid, false otherwise
 * @private
 * @example
 * isValidTimestamp("2025-01-11T12:00:00Z"); // true
 * isValidTimestamp("invalid"); // false
 */
export function isValidTimestamp(timestamp: string): boolean {
  try {
    parseTimestamp(timestamp);
    return true;
  } catch {
    return false;
  }
}
