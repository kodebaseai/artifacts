/**
 * Actor utilities for Kodebase artifacts
 *
 * Provides consistent actor formatting and parsing for event creation.
 * Supports both human actors "Name (email@domain.com)" and AI agents.
 * @module @kodebase/core/utils/actor
 * @description Actor utilities for Kodebase artifacts
 * @exports ActorInfo
 * @exports formatActor
 * @exports parseActor
 * @exports isValidActor
 */

/**
 * Actor information interface
 * @property name - The actor's name
 * @property email - The actor's email address
 */
export interface ActorInfo {
  name: string;
  email: string;
}

/**
 * Validates email format
 *
 * @param email - Email address to validate
 * @returns True if valid, false otherwise
 * @private
 */
function isValidEmail(email: string): boolean {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

/**
 * Formats actor name and email into standard format
 *
 * @param name - The actor's name
 * @param email - The actor's email address
 * @returns Formatted actor string in format "Name (email@domain.com)"
 * @throws Error if email format is invalid
 * @example
 * const actor = formatActor("John Doe", "john@example.com");
 * // Returns: "John Doe (john@example.com)"
 * @throws Error if actor name or email is invalid
 */
export function formatActor(name: string, email: string): string {
  if (typeof name !== 'string' || name.trim() === '') {
    throw new Error('Actor name is required and must be a non-empty string.');
  }

  if (typeof email !== 'string' || email.trim() === '') {
    throw new Error('Actor email is required and must be a non-empty string.');
  }

  const trimmedName = name.trim();
  const trimmedEmail = email.trim();

  if (!isValidEmail(trimmedEmail)) {
    throw new Error('Invalid email format. Expected format: user@domain.com');
  }

  return `${trimmedName} (${trimmedEmail})`;
}

/**
 * Parses a formatted actor string to extract name and email
 *
 * @param actorString - Formatted actor string to parse
 * @returns Object with name and email properties
 * @throws Error if actor string format is invalid
 * @example
 * const { name, email } = parseActor("John Doe (john@example.com)");
 * // Returns: { name: "John Doe", email: "john@example.com" }
 *
 * parseActor("John Doe");
 * // Throws: Error("Invalid actor format...")
 * @throws Error if actor string format is invalid
 */
export function parseActor(actorString: string): ActorInfo {
  if (typeof actorString !== 'string' || actorString.trim() === '') {
    throw new Error('Actor string is required and must be a non-empty string.');
  }

  const trimmedActor = actorString.trim();

  // Support both human and AI agent formats
  // Human format: "Name (email@domain.com)"
  // AI agent format: "agent.[TYPE].[SESSION]@[TENANT].kodebase.ai"
  const humanPattern = /^(.+?)\s*\(([^)]+@[^)]+)\)$/;
  const aiAgentPattern = /^(agent\.[A-Z]+\.[A-Z0-9]+@[\w.-]+\.kodebase\.ai)$/;

  // Check if it's an AI agent
  const aiMatch = trimmedActor.match(aiAgentPattern);
  if (aiMatch) {
    const agentEmail = aiMatch[1];
    if (!agentEmail) {
      throw new Error(
        'Invalid actor format. Expected "Name (email@domain.com)" or AI agent format "agent.[TYPE].[SESSION]@[TENANT].kodebase.ai"',
      );
    }

    // Extract agent type for name
    const agentParts = agentEmail.split('@')[0]?.split('.') || [];
    const agentType = agentParts[1] || 'Agent';
    const sessionId = agentParts[2] || '';
    const name = `${agentType} Agent ${sessionId}`;

    return {
      name,
      email: agentEmail,
    };
  }

  // Check human format
  const humanMatch = trimmedActor.match(humanPattern);
  if (!humanMatch) {
    throw new Error(
      'Invalid actor format. Expected "Name (email@domain.com)" or AI agent format "agent.[TYPE].[SESSION]@[TENANT].kodebase.ai"',
    );
  }

  const name = humanMatch[1]?.trim();
  const email = humanMatch[2]?.trim();

  if (!name || !email) {
    throw new Error('Invalid actor format. Both name and email are required.');
  }

  // For human format, we need to validate the email specifically
  // Some invalid formats might still match the regex but have bad emails
  const simpleEmailPattern = /^[^@\s]+@[^@\s]+$/;
  if (!simpleEmailPattern.test(email)) {
    throw new Error('Invalid email format in actor string.');
  }

  if (!isValidEmail(email)) {
    throw new Error('Invalid email format in actor string.');
  }

  return {
    name,
    email,
  };
}

/**
 * Validates if a string is a properly formatted actor
 *
 * @param actorString - Actor string to validate
 * @returns True if valid, false otherwise
 * @example
 * isValidActor("John Doe (john@example.com)"); // true
 * isValidActor("agent.CLAUDE.ABC123@acme.kodebase.ai"); // true
 * isValidActor("invalid"); // false
 * @throws Error if actor string format is invalid
 */
export function isValidActor(actorString: string): boolean {
  try {
    parseActor(actorString);
    return true;
  } catch {
    return false;
  }
}
