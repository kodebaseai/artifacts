import { CArtifactEvent, CEventTrigger } from '../data/types/constants';

/**
 * Helper to create a valid issue metadata with all required fields
 */
export function createValidIssueMetadata(overrides: any = {}) {
  return {
    title: 'Test Issue',
    priority: 'high',
    estimation: 'M',
    created_by: 'Test User (test@example.com)',
    assignee: 'Test User (test@example.com)',
    schema_version: '0.1.0',
    relationships: {
      blocks: [],
      blocked_by: [],
    },
    events: [
      {
        event: CArtifactEvent.DRAFT,
        timestamp: '2025-01-01T00:00:00Z',
        actor: 'Test User (test@example.com)',
        trigger: CEventTrigger.ARTIFACT_CREATED,
      },
    ],
    ...overrides,
  };
}

/**
 * Helper to create a valid milestone metadata with all required fields
 */
export function createValidMilestoneMetadata(overrides: any = {}) {
  return {
    title: 'Test Milestone',
    priority: 'high',
    estimation: 'L',
    created_by: 'Test User (test@example.com)',
    assignee: 'Test User (test@example.com)',
    schema_version: '0.1.0',
    relationships: {
      blocks: [],
      blocked_by: [],
    },
    events: [
      {
        event: CArtifactEvent.DRAFT,
        timestamp: '2025-01-01T00:00:00Z',
        actor: 'Test User (test@example.com)',
        trigger: CEventTrigger.ARTIFACT_CREATED,
      },
    ],
    ...overrides,
  };
}

/**
 * Helper to create a valid initiative metadata with all required fields
 */
export function createValidInitiativeMetadata(overrides: any = {}) {
  return {
    title: 'Test Initiative',
    priority: 'high',
    estimation: 'XL',
    created_by: 'Test User (test@example.com)',
    assignee: 'Test User (test@example.com)',
    schema_version: '0.1.0',
    relationships: {
      blocks: [],
      blocked_by: [],
    },
    events: [
      {
        event: CArtifactEvent.DRAFT,
        timestamp: '2025-01-01T00:00:00Z',
        actor: 'Test User (test@example.com)',
        trigger: CEventTrigger.ARTIFACT_CREATED,
      },
    ],
    ...overrides,
  };
}

/**
 * Helper to create a valid event with required fields
 */
export function createValidEvent(overrides: any = {}) {
  return {
    event: CArtifactEvent.READY,
    timestamp: '2025-01-01T00:00:00Z',
    actor: 'Test User (test@example.com)',
    trigger: CEventTrigger.MANUAL,
    ...overrides,
  };
}
