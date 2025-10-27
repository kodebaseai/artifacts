/**
 * Tests for actor utilities
 */

import { describe, expect, it } from 'vitest';
import { formatActor, isValidActor, parseActor } from './actor';

describe('Actor Utilities', () => {
  describe('formatActor', () => {
    it('should format valid name and email correctly', () => {
      const testCases = [
        {
          name: 'John Doe',
          email: 'john@example.com',
          expected: 'John Doe (john@example.com)',
        },
        {
          name: 'Jane Smith',
          email: 'jane.smith@company.co.uk',
          expected: 'Jane Smith (jane.smith@company.co.uk)',
        },
        {
          name: 'Bob Johnson',
          email: 'bob+work@test.org',
          expected: 'Bob Johnson (bob+work@test.org)',
        },
        {
          name: 'Maria García',
          email: 'maria@empresa.es',
          expected: 'Maria García (maria@empresa.es)',
        },
      ];

      testCases.forEach(({ name, email, expected }) => {
        const result = formatActor(name, email);
        expect(result).toBe(expected);
      });
    });

    it('should trim whitespace from name and email', () => {
      const result = formatActor('  John Doe  ', '  john@example.com  ');
      expect(result).toBe('John Doe (john@example.com)');
    });

    it('should throw error for invalid name input', () => {
      const invalidNames = ['', '   ', '\t', '\n'];

      invalidNames.forEach((name) => {
        expect(() => formatActor(name, 'john@example.com')).toThrow(
          'Actor name is required and must be a non-empty string.',
        );
      });
    });

    it('should throw error for non-string name', () => {
      const invalidInputs: unknown[] = [null, undefined, 123, {}, [], true];

      invalidInputs.forEach((input) => {
        expect(() => formatActor(input as string, 'john@example.com')).toThrow(
          'Actor name is required and must be a non-empty string.',
        );
      });
    });

    it('should throw error for invalid email input', () => {
      const invalidEmails = ['', '   ', '\t', '\n'];

      invalidEmails.forEach((email) => {
        expect(() => formatActor('John Doe', email)).toThrow(
          'Actor email is required and must be a non-empty string.',
        );
      });
    });

    it('should throw error for non-string email', () => {
      const invalidInputs: unknown[] = [null, undefined, 123, {}, [], true];

      invalidInputs.forEach((input) => {
        expect(() => formatActor('John Doe', input as string)).toThrow(
          'Actor email is required and must be a non-empty string.',
        );
      });
    });

    it('should throw error for invalid email format', () => {
      const invalidEmails = [
        'invalid',
        'invalid@',
        '@invalid.com',
        'invalid@invalid',
        'invalid.email',
        'invalid@.com',
        'invalid@domain.',
        'invalid spaces@domain.com',
        'invalid@domain with spaces.com',
      ];

      invalidEmails.forEach((email) => {
        expect(() => formatActor('John Doe', email)).toThrow(
          'Invalid email format. Expected format: user@domain.com',
        );
      });
    });

    it('should accept various valid email formats', () => {
      const validEmails = [
        'user@domain.com',
        'user.name@domain.com',
        'user+tag@domain.com',
        'user123@domain123.com',
        'user@subdomain.domain.com',
        'a@b.co',
        'very.long.email.address@very.long.domain.name.com',
      ];

      validEmails.forEach((email) => {
        expect(() => formatActor('John Doe', email)).not.toThrow();
      });
    });
  });

  describe('parseActor', () => {
    describe('Human actor format', () => {
      it('should parse valid human actor strings correctly', () => {
        const testCases = [
          {
            actor: 'John Doe (john@example.com)',
            expected: { name: 'John Doe', email: 'john@example.com' },
          },
          {
            actor: 'Jane Smith (jane.smith@company.co.uk)',
            expected: { name: 'Jane Smith', email: 'jane.smith@company.co.uk' },
          },
          {
            actor: 'Bob Johnson (bob+work@test.org)',
            expected: { name: 'Bob Johnson', email: 'bob+work@test.org' },
          },
          {
            actor: 'Maria García (maria@empresa.es)',
            expected: { name: 'Maria García', email: 'maria@empresa.es' },
          },
        ];

        testCases.forEach(({ actor, expected }) => {
          const result = parseActor(actor);
          expect(result).toEqual(expected);
        });
      });

      it('should handle names with multiple words and spaces', () => {
        const actor = 'John Michael Doe Jr. (john.doe@example.com)';
        const result = parseActor(actor);

        expect(result.name).toBe('John Michael Doe Jr.');
        expect(result.email).toBe('john.doe@example.com');
      });

      it('should trim whitespace from parsed components', () => {
        const actor = '  John Doe  ( john@example.com )';
        const result = parseActor(actor);

        expect(result.name).toBe('John Doe');
        expect(result.email).toBe('john@example.com');
      });
    });

    describe('AI agent format', () => {
      it('should parse valid AI agent strings correctly', () => {
        const testCases = [
          {
            actor: 'agent.CLAUDE.ABC123@acme.kodebase.ai',
            expected: {
              name: 'CLAUDE Agent ABC123',
              email: 'agent.CLAUDE.ABC123@acme.kodebase.ai',
            },
          },
          {
            actor: 'agent.GPT.XYZ789@company.kodebase.ai',
            expected: {
              name: 'GPT Agent XYZ789',
              email: 'agent.GPT.XYZ789@company.kodebase.ai',
            },
          },
          {
            actor: 'agent.ASSISTANT.DEF456@test.kodebase.ai',
            expected: {
              name: 'ASSISTANT Agent DEF456',
              email: 'agent.ASSISTANT.DEF456@test.kodebase.ai',
            },
          },
        ];

        testCases.forEach(({ actor, expected }) => {
          const result = parseActor(actor);
          expect(result).toEqual(expected);
        });
      });

      it('should handle various tenant domains', () => {
        const actors = [
          'agent.CLAUDE.ABC123@acme.kodebase.ai',
          'agent.CLAUDE.ABC123@company-name.kodebase.ai',
          'agent.CLAUDE.ABC123@sub.domain.kodebase.ai',
        ];

        actors.forEach((actor) => {
          expect(() => parseActor(actor)).not.toThrow();
        });
      });
    });

    describe('Error handling', () => {
      it('should throw error for invalid actor string input', () => {
        const invalidInputs = ['', '   ', '\t', '\n'];

        invalidInputs.forEach((input) => {
          expect(() => parseActor(input)).toThrow(
            'Actor string is required and must be a non-empty string.',
          );
        });
      });

      it('should throw error for non-string input', () => {
        const invalidInputs: unknown[] = [null, undefined, 123, {}, [], true];

        invalidInputs.forEach((input) => {
          expect(() => parseActor(input as string)).toThrow(
            'Actor string is required and must be a non-empty string.',
          );
        });
      });

      it('should throw error for invalid human actor format', () => {
        const invalidFormats = [
          'John Doe',
          'John Doe ()',
          '(john@example.com)',
          'John Doe john@example.com',
          'John Doe (john@example.com extra)',
        ];

        invalidFormats.forEach((format) => {
          expect(() => parseActor(format)).toThrow(/Invalid/);
        });
      });

      it('should throw error for invalid email in human format', () => {
        const invalidEmails = [
          'John Doe (invalid)',
          'John Doe (invalid@)',
          'John Doe (@invalid.com)',
          'John Doe (invalid@invalid)',
        ];

        invalidEmails.forEach((actor) => {
          expect(() => parseActor(actor)).toThrow('Invalid');
        });
      });

      it('should throw error for malformed AI agent format', () => {
        const invalidAgents = [
          'agent.CLAUDE@acme.kodebase.ai', // Missing session
          'agent.CLAUDE.ABC123@acme.com', // Wrong domain
          'CLAUDE.ABC123@acme.kodebase.ai', // Missing agent prefix
          'agent.CLAUDE.ABC123.acme.kodebase.ai', // Missing @
        ];

        invalidAgents.forEach((agent) => {
          expect(() => parseActor(agent)).toThrow('Invalid actor format');
        });
      });
    });

    describe('Edge cases', () => {
      it('should handle empty name gracefully', () => {
        expect(() => parseActor('(john@example.com)')).toThrow(
          'Invalid actor format',
        );
      });

      it('should handle empty email gracefully', () => {
        expect(() => parseActor('John Doe ()')).toThrow('Invalid actor format');
      });

      it('should handle parentheses in name', () => {
        const actor = 'John (Johnny) Doe (john@example.com)';
        const result = parseActor(actor);

        expect(result.name).toBe('John (Johnny) Doe');
        expect(result.email).toBe('john@example.com');
      });

      it('should handle special characters in name', () => {
        const specialNames = [
          'María José (maria@example.com)',
          'Jean-Pierre (jean@example.com)',
          "O'Connor (oconnor@example.com)",
          'Zhang Wei (zhang@example.com)',
        ];

        specialNames.forEach((actor) => {
          expect(() => parseActor(actor)).not.toThrow();
        });
      });
    });
  });

  describe('isValidActor', () => {
    it('should return true for valid human actors', () => {
      const validActors = [
        'John Doe (john@example.com)',
        'Jane Smith (jane.smith@company.co.uk)',
        'María García (maria@empresa.es)',
        'John (Johnny) Doe (john@example.com)',
      ];

      validActors.forEach((actor) => {
        expect(isValidActor(actor)).toBe(true);
      });
    });

    it('should return true for valid AI agents', () => {
      const validAgents = [
        'agent.CLAUDE.ABC123@acme.kodebase.ai',
        'agent.GPT.XYZ789@company.kodebase.ai',
        'agent.ASSISTANT.DEF456@test.kodebase.ai',
      ];

      validAgents.forEach((agent) => {
        expect(isValidActor(agent)).toBe(true);
      });
    });

    it('should return false for invalid actors', () => {
      const invalidActors = [
        'John Doe',
        'John Doe ()',
        'John Doe (invalid)',
        '(john@example.com)',
        '',
        'agent.CLAUDE@acme.kodebase.ai',
        'invalid format',
      ];

      invalidActors.forEach((actor) => {
        expect(isValidActor(actor)).toBe(false);
      });
    });

    it('should return false for non-string input', () => {
      const invalidInputs: unknown[] = [null, undefined, 123, {}, [], true];

      invalidInputs.forEach((input) => {
        expect(isValidActor(input as string)).toBe(false);
      });
    });

    it('should not throw errors for any input', () => {
      const testInputs: unknown[] = [
        'valid actor (email@domain.com)',
        'invalid',
        null,
        undefined,
        123,
        {},
        [],
        true,
        '',
      ];

      testInputs.forEach((input) => {
        expect(() => isValidActor(input as string)).not.toThrow();
      });
    });
  });

  describe('Integration tests', () => {
    it('should round-trip correctly with formatActor and parseActor', () => {
      const testCases = [
        { name: 'John Doe', email: 'john@example.com' },
        { name: 'Jane Smith', email: 'jane.smith@company.co.uk' },
        { name: 'María García', email: 'maria@empresa.es' },
      ];

      testCases.forEach(({ name, email }) => {
        const formatted = formatActor(name, email);
        const parsed = parseActor(formatted);

        expect(parsed.name).toBe(name);
        expect(parsed.email).toBe(email);
      });
    });

    it('should work with parseActor result in formatActor', () => {
      const actor = 'John Doe (john@example.com)';
      const parsed = parseActor(actor);
      const reformatted = formatActor(parsed.name, parsed.email);

      expect(reformatted).toBe(actor);
    });

    it('should handle complex names in round-trip', () => {
      const complexNames = [
        'John Michael Doe Jr.',
        'María José García-López',
        "Jean-Pierre O'Connor",
        'Dr. Sarah Wilson PhD',
      ];

      complexNames.forEach((name) => {
        const email = 'test@example.com';
        const formatted = formatActor(name, email);
        const parsed = parseActor(formatted);

        expect(parsed.name).toBe(name);
        expect(parsed.email).toBe(email);
      });
    });
  });
});
