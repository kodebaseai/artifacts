import { describe, expect, it } from 'vitest';
import {
  generateCorrelationId,
  isValidCorrelationId,
  parseCorrelationId,
} from './correlation';

describe('Correlation ID System', () => {
  describe('generateCorrelationId', () => {
    it('should generate a valid correlation ID with correct format', () => {
      const parentEventId = 'evt_1234567890abcdef';
      const timestamp = 1705318800000;

      const correlationId = generateCorrelationId(parentEventId, timestamp);

      expect(correlationId).toBe('evt_1234567890abcdef-1705318800000');
    });

    it('should use current timestamp when not provided', () => {
      const parentEventId = 'evt_1234567890abcdef';
      const beforeTime = Date.now();

      const correlationId = generateCorrelationId(parentEventId);

      const afterTime = Date.now();
      const parts = correlationId.split('-');
      const timestampStr = parts[1];
      const timestamp = timestampStr ? parseInt(timestampStr, 10) : 0;

      expect(parts[0]).toBe(parentEventId);
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should throw error for invalid parent event ID', () => {
      expect(() => generateCorrelationId('invalid_id')).toThrow(
        'Invalid parent event ID',
      );
      expect(() => generateCorrelationId('')).toThrow(
        'Invalid parent event ID',
      );
    });
  });

  describe('isValidCorrelationId', () => {
    it('should validate correct correlation IDs', () => {
      expect(isValidCorrelationId('evt_1234567890abcdef-1705318800000')).toBe(
        true,
      );
      expect(isValidCorrelationId('evt_fedcba0987654321-1234567890')).toBe(
        true,
      );
    });

    it('should reject invalid correlation IDs', () => {
      expect(isValidCorrelationId('evt_1234567890abcdef')).toBe(false); // missing timestamp
      expect(isValidCorrelationId('1705318800000')).toBe(false); // missing event ID
      expect(isValidCorrelationId('evt_1234567890abcdef-abc')).toBe(false); // non-numeric timestamp
      expect(isValidCorrelationId('invalid_id-1705318800000')).toBe(false); // invalid event ID
      expect(isValidCorrelationId('')).toBe(false);
      expect(isValidCorrelationId('evt_1234567890abcdef-')).toBe(false);
    });
  });

  describe('parseCorrelationId', () => {
    it('should parse valid correlation IDs', () => {
      const correlationId = 'evt_1234567890abcdef-1705318800000';
      const parsed = parseCorrelationId(correlationId);

      expect(parsed).toEqual({
        parentEventId: 'evt_1234567890abcdef',
        timestamp: 1705318800000,
      });
    });

    it('should return null for invalid correlation IDs', () => {
      expect(parseCorrelationId('invalid')).toBeNull();
      expect(parseCorrelationId('')).toBeNull();
      expect(parseCorrelationId('evt_1234567890abcdef')).toBeNull();
      expect(parseCorrelationId('evt_1234567890abcdef-abc')).toBeNull();
    });
  });
});
