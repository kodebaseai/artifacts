/**
 * Tests for timestamp utilities
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatTimestamp, isValidTimestamp, parseTimestamp } from './timestamp';

describe('Timestamp Utilities', () => {
  describe('formatTimestamp', () => {
    beforeEach(() => {
      // Mock Date.now() to return a fixed timestamp
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-11T12:00:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return current UTC time in ISO 8601 format', () => {
      const timestamp = formatTimestamp();

      expect(timestamp).toBe('2025-01-11T12:00:00.000Z');
      expect(timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
    });

    it('should always return UTC timezone (ending with Z)', () => {
      const timestamp = formatTimestamp();
      expect(timestamp).toMatch(/Z$/);
    });

    it('should return valid ISO 8601 format that can be parsed', () => {
      const timestamp = formatTimestamp();
      const parsed = new Date(timestamp);

      expect(Number.isNaN(parsed.getTime())).toBe(false);
    });
  });

  describe('parseTimestamp', () => {
    it('should parse valid ISO 8601 timestamps', () => {
      const validTimestamps = [
        '2025-01-11T12:00:00Z',
        '2025-01-11T12:00:00.000Z',
        '2023-12-31T23:59:59.999Z',
        '2024-02-29T00:00:00Z', // Leap year
      ];

      validTimestamps.forEach((timestamp) => {
        const date = parseTimestamp(timestamp);
        expect(date).toBeInstanceOf(Date);
        expect(Number.isNaN(date.getTime())).toBe(false);
      });
    });

    it('should throw error for invalid timestamp formats', () => {
      const invalidTimestamps = [
        'invalid',
        '',
        '2025-01-11',
        '2025-01-11 12:00:00',
        '2025/01/11T12:00:00Z',
        '2025-13-01T12:00:00Z', // Invalid month
        '2025-01-32T12:00:00Z', // Invalid day
        '2025-01-11T25:00:00Z', // Invalid hour
        '2025-01-11T12:60:00Z', // Invalid minute
        '2025-01-11T12:00:60Z', // Invalid second
      ];

      invalidTimestamps.forEach((timestamp) => {
        expect(() => parseTimestamp(timestamp)).toThrow(
          'Invalid timestamp format',
        );
      });
    });

    it('should throw error for non-string input', () => {
      const invalidInputs: unknown[] = [null, undefined, 123, {}, [], true];

      invalidInputs.forEach((input) => {
        expect(() => parseTimestamp(input as string)).toThrow(
          'Invalid timestamp format',
        );
      });
    });

    it('should throw error for empty or whitespace strings', () => {
      const emptyInputs = ['', '   ', '\t', '\n'];

      emptyInputs.forEach((input) => {
        expect(() => parseTimestamp(input)).toThrow('Invalid timestamp format');
      });
    });

    it('should handle timestamps with different precision', () => {
      const timestamps = [
        '2025-01-11T12:00:00Z', // No milliseconds
        '2025-01-11T12:00:00.1Z', // 1 digit
        '2025-01-11T12:00:00.12Z', // 2 digits
        '2025-01-11T12:00:00.123Z', // 3 digits
      ];

      timestamps.forEach((timestamp) => {
        const date = parseTimestamp(timestamp);
        expect(date).toBeInstanceOf(Date);
      });
    });

    it('should return the correct Date object', () => {
      const timestamp = '2025-01-11T12:00:00.000Z';
      const date = parseTimestamp(timestamp);

      expect(date.getUTCFullYear()).toBe(2025);
      expect(date.getUTCMonth()).toBe(0); // January is 0
      expect(date.getUTCDate()).toBe(11);
      expect(date.getUTCHours()).toBe(12);
      expect(date.getUTCMinutes()).toBe(0);
      expect(date.getUTCSeconds()).toBe(0);
      expect(date.getUTCMilliseconds()).toBe(0);
    });

    it('should handle leap year correctly', () => {
      const leapYearTimestamp = '2024-02-29T12:00:00Z';
      const date = parseTimestamp(leapYearTimestamp);

      expect(date.getUTCFullYear()).toBe(2024);
      expect(date.getUTCMonth()).toBe(1); // February is 1
      expect(date.getUTCDate()).toBe(29);
    });

    it('should handle non-leap year February 29th by normalizing to March 1st', () => {
      const invalidLeapYear = '2023-02-29T12:00:00Z';
      const date = parseTimestamp(invalidLeapYear);

      // JavaScript Date normalizes Feb 29, 2023 to March 1, 2023
      expect(date.getUTCFullYear()).toBe(2023);
      expect(date.getUTCMonth()).toBe(2); // March is 2
      expect(date.getUTCDate()).toBe(1);
    });
  });

  describe('isValidTimestamp', () => {
    it('should return true for valid timestamps', () => {
      const validTimestamps = [
        '2025-01-11T12:00:00Z',
        '2025-01-11T12:00:00.000Z',
        '2023-12-31T23:59:59.999Z',
        '2024-02-29T00:00:00Z',
      ];

      validTimestamps.forEach((timestamp) => {
        expect(isValidTimestamp(timestamp)).toBe(true);
      });
    });

    it('should return false for invalid timestamps', () => {
      const invalidTimestamps = [
        'invalid',
        '',
        '2025-01-11',
        '2025-01-11 12:00:00',
        '2025/01/11T12:00:00Z',
        '2025-13-01T12:00:00Z',
        '2025-01-32T12:00:00Z',
        '2025-01-11T25:00:00Z',
      ];

      invalidTimestamps.forEach((timestamp) => {
        expect(isValidTimestamp(timestamp)).toBe(false);
      });
    });

    it('should return false for non-string input', () => {
      const invalidInputs: unknown[] = [null, undefined, 123, {}, [], true];

      invalidInputs.forEach((input) => {
        expect(isValidTimestamp(input as string)).toBe(false);
      });
    });

    it('should not throw errors for any input', () => {
      const testInputs: unknown[] = [
        'invalid',
        null,
        undefined,
        123,
        {},
        [],
        true,
        '',
        '2025-01-11T12:00:00Z',
      ];

      testInputs.forEach((input) => {
        expect(() => isValidTimestamp(input as string)).not.toThrow();
      });
    });
  });

  describe('Integration with real Date objects', () => {
    it('should round-trip correctly with formatTimestamp and parseTimestamp', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-11T12:00:00.000Z'));

      const formatted = formatTimestamp();
      const parsed = parseTimestamp(formatted);
      const reformatted = parsed.toISOString();

      expect(reformatted).toBe(formatted);

      vi.useRealTimers();
    });

    it('should work with dates created by new Date()', () => {
      const now = new Date();
      const timestamp = now.toISOString();
      const parsed = parseTimestamp(timestamp);

      expect(parsed.getTime()).toBe(now.getTime());
    });
  });
});
