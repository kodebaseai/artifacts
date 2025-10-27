/**
 * Correlation ID System for Kodebase
 *
 * Provides correlation ID generation and validation for tracking cascade chains.
 * Correlation IDs link related events across artifacts in the cascade system.
 */

import { isValidEventId } from './identity';

/**
 * Generates a correlation ID for cascade events
 *
 * @param parentEventId - The event ID that triggered this cascade
 * @param timestamp - Optional timestamp (defaults to current time in milliseconds)
 * @returns A correlation ID in the format "<parent-event-id>-<timestamp>"
 * @throws Error if the parent event ID is invalid
 * @example
 * const correlationId = generateCorrelationId('evt_1234567890abcdef');
 * // Returns: "evt_1234567890abcdef-1705318800000"
 */
export function generateCorrelationId(
  parentEventId: string,
  timestamp?: number,
): string {
  if (!isValidEventId(parentEventId)) {
    throw new Error('Invalid parent event ID');
  }

  const ts = timestamp ?? Date.now();
  return `${parentEventId}-${ts}`;
}

/**
 * Validates if a string is a valid correlation ID
 *
 * @param correlationId - The string to validate
 * @returns true if the string is a valid correlation ID, false otherwise
 * @example
 * isValidCorrelationId('evt_1234567890abcdef-1705318800000'); // true
 * isValidCorrelationId('invalid'); // false
 */
export function isValidCorrelationId(correlationId: string): boolean {
  if (!correlationId || typeof correlationId !== 'string') {
    return false;
  }

  const parts = correlationId.split('-');
  if (parts.length !== 2) {
    return false;
  }

  const [eventId, timestamp] = parts;

  // Validate event ID format
  if (!eventId || !isValidEventId(eventId)) {
    return false;
  }

  // Validate timestamp is a positive integer
  if (!timestamp) {
    return false;
  }
  const ts = parseInt(timestamp, 10);
  return !Number.isNaN(ts) && ts > 0 && ts.toString() === timestamp;
}

/**
 * Parses a correlation ID into its components
 *
 * @param correlationId - The correlation ID to parse
 * @returns An object containing parentEventId and timestamp, or null if invalid
 * @example
 * parseCorrelationId('evt_1234567890abcdef-1705318800000');
 * // Returns: { parentEventId: 'evt_1234567890abcdef', timestamp: 1705318800000 }
 */
export function parseCorrelationId(
  correlationId: string,
): { parentEventId: string; timestamp: number } | null {
  if (!isValidCorrelationId(correlationId)) {
    return null;
  }

  const parts = correlationId.split('-');
  // We know the correlation ID is valid from the check above
  const parentEventId = parts[0];
  const timestampStr = parts[1];

  if (!parentEventId || !timestampStr) {
    return null;
  }

  return {
    parentEventId,
    timestamp: parseInt(timestampStr, 10),
  };
}
