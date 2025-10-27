/**
 * Event Identity System for Kodebase
 *
 * Provides unique event ID generation and validation for the event cascade system.
 * Event IDs follow the format: evt_<16-char-hex>
 */

/**
 * Generates a unique event ID for cascade events
 *
 * @returns A unique event ID in the format "evt_<16-char-hex>"
 * @example
 * const eventId = generateEventId();
 * // Returns: "evt_1234567890abcdef"
 */
export function generateEventId(): string {
  // Generate 16 random hex characters (8 bytes = 64 bits)
  const randomBytes = new Uint8Array(8);

  // Use crypto API if available (Node.js or modern browsers)
  if (
    typeof globalThis.crypto !== 'undefined' &&
    globalThis.crypto.getRandomValues
  ) {
    globalThis.crypto.getRandomValues(randomBytes);
  } else {
    // Fallback for older environments
    for (let i = 0; i < randomBytes.length; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // Convert to hex string
  const hexString = Array.from(randomBytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return `evt_${hexString}`;
}

/**
 * Validates if a string is a valid event ID
 *
 * @param eventId - The string to validate
 * @returns True if the string is a valid event ID, false otherwise
 * @example
 * isValidEventId('evt_1234567890abcdef'); // true
 * isValidEventId('invalid'); // false
 */
export function isValidEventId(eventId: string): boolean {
  if (!eventId || typeof eventId !== 'string') {
    return false;
  }

  // Must match pattern: evt_[16 lowercase hex chars]
  return /^evt_[0-9a-f]{16}$/.test(eventId);
}
