import { describe, expect, it } from 'vitest';
import { generateEventId, isValidEventId } from './identity';

describe('Event Identity System', () => {
  describe('generateEventId', () => {
    it('should generate a valid event ID with correct format', () => {
      const eventId = generateEventId();

      expect(eventId).toMatch(/^evt_[0-9a-f]{16}$/);
      expect(eventId.length).toBe(20); // "evt_" (4) + 16 hex chars
    });

    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      const count = 10000;

      for (let i = 0; i < count; i++) {
        ids.add(generateEventId());
      }

      expect(ids.size).toBe(count);
    });
  });

  describe('isValidEventId', () => {
    it('should validate correct event IDs', () => {
      expect(isValidEventId('evt_1234567890abcdef')).toBe(true);
      expect(isValidEventId('evt_fedcba0987654321')).toBe(true);
    });

    it('should reject invalid event IDs', () => {
      expect(isValidEventId('1234567890abcdef')).toBe(false); // missing prefix
      expect(isValidEventId('evt_1234567890abcde')).toBe(false); // too short
      expect(isValidEventId('evt_1234567890abcdefg')).toBe(false); // too long
      expect(isValidEventId('evt_1234567890ABCDEF')).toBe(false); // uppercase
      expect(isValidEventId('evt_123456789gabcdef')).toBe(false); // invalid hex
      expect(isValidEventId('')).toBe(false);
      expect(isValidEventId('evt_')).toBe(false);
    });
  });
});
