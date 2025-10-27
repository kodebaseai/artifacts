/**
 * Test fixtures for metrics calculations
 * @module @kodebase/core/test/metrics-fixtures
 * @description Test fixtures for metrics calculations
 * @exports createCompletedEventSequence
 * @exports createBlockedEventSequence
 * @exports createCurrentlyBlockedEventSequence
 * @exports createIncompleteEventSequence
 * @exports createMockArtifact
 * @exports createCompletedArtifactsOverTime
 */

import type {
  Artifact,
  ArtifactType,
  EventMetadata,
  Issue,
  Milestone,
} from '../data/types';
import {
  CArtifact,
  CArtifactEvent,
  CEventTrigger,
} from '../data/types/constants';

// ============================================================================
// Event Sequences
// ============================================================================

/**
 * Standard happy path: draft → in_progress → completed
 * @param options - Optional options for the event sequence
 * @returns The created event sequence
 */
export function createCompletedEventSequence(options?: {
  draftTime?: string;
  startTime?: string;
  endTime?: string;
  actor?: string;
}): EventMetadata[] {
  const {
    draftTime = '2025-01-01T10:00:00Z',
    startTime = '2025-01-01T11:00:00Z',
    endTime = '2025-01-01T13:30:00Z',
    actor = 'user@example.com',
  } = options || {};

  return [
    {
      event: CArtifactEvent.DRAFT,
      timestamp: draftTime,
      actor,
      trigger: CEventTrigger.ARTIFACT_CREATED,
    },
    {
      event: CArtifactEvent.IN_PROGRESS,
      timestamp: startTime,
      actor,
      trigger: CEventTrigger.BRANCH_CREATED,
    },
    {
      event: CArtifactEvent.COMPLETED,
      timestamp: endTime,
      actor,
      trigger: CEventTrigger.PR_MERGED,
    },
  ];
}

/**
 * Events with blocked periods
 * @param options - Optional options for the event sequence
 * @returns The created event sequence
 */
export function createBlockedEventSequence(options?: {
  draftTime?: string;
  blockTimes?: Array<{ start: string; end: string }>;
  actor?: string;
}): EventMetadata[] {
  const {
    draftTime = '2025-01-01T10:00:00Z',
    blockTimes = [
      { start: '2025-01-01T11:00:00Z', end: '2025-01-01T13:00:00Z' },
      { start: '2025-01-01T14:00:00Z', end: '2025-01-01T14:30:00Z' },
    ],
    actor = 'user@example.com',
  } = options || {};

  const events: EventMetadata[] = [
    {
      event: CArtifactEvent.DRAFT,
      timestamp: draftTime,
      actor,
      trigger: CEventTrigger.ARTIFACT_CREATED,
    },
  ];

  // Add blocked/unblocked pairs
  for (const blockTime of blockTimes) {
    events.push({
      event: CArtifactEvent.BLOCKED,
      timestamp: blockTime.start,
      actor,
      trigger: CEventTrigger.HAS_DEPENDENCIES,
    });
    events.push({
      event: CArtifactEvent.READY,
      timestamp: blockTime.end,
      actor,
      trigger: CEventTrigger.DEPENDENCIES_MET,
    });
  }

  // End with in_progress
  events.push({
    event: CArtifactEvent.IN_PROGRESS,
    timestamp: '2025-01-01T14:30:00Z',
    actor,
    trigger: CEventTrigger.BRANCH_CREATED,
  });

  return events;
}

/**
 * Currently blocked events (no unblock event)
 * @param options - Optional options for the event sequence
 * @returns The created event sequence
 */
export function createCurrentlyBlockedEventSequence(options?: {
  draftTime?: string;
  blockTime?: string;
  actor?: string;
}): EventMetadata[] {
  const {
    draftTime = '2025-01-01T10:00:00Z',
    blockTime = new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
    actor = 'user@example.com',
  } = options || {};

  return [
    {
      event: CArtifactEvent.DRAFT,
      timestamp: draftTime,
      actor,
      trigger: CEventTrigger.ARTIFACT_CREATED,
    },
    {
      event: CArtifactEvent.BLOCKED,
      timestamp: blockTime,
      actor,
      trigger: CEventTrigger.HAS_DEPENDENCIES,
    },
  ];
}

/**
 * Incomplete events (never completed)
 * @param options - Optional options for the event sequence
 * @returns The created event sequence
 */
export function createIncompleteEventSequence(options?: {
  draftTime?: string;
  lastEvent?: string;
  lastEventType?: string;
  actor?: string;
}): EventMetadata[] {
  const {
    draftTime = '2025-01-01T10:00:00Z',
    lastEvent = '2025-01-01T11:00:00Z',
    lastEventType = CArtifactEvent.IN_PROGRESS,
    actor = 'user@example.com',
  } = options || {};

  const events: EventMetadata[] = [
    {
      event: CArtifactEvent.DRAFT,
      timestamp: draftTime,
      actor,
      trigger: CEventTrigger.ARTIFACT_CREATED,
    },
  ];

  if (lastEventType !== CArtifactEvent.DRAFT) {
    events.push({
      event:
        lastEventType as (typeof CArtifactEvent)[keyof typeof CArtifactEvent],
      timestamp: lastEvent,
      actor,
      trigger: CEventTrigger.MANUAL,
    });
  }

  return events;
}

// ============================================================================
// Mock Artifacts
// ============================================================================

/**
 * Create a mock artifact with specified events
 * @param options - Optional options for the mock artifact
 * @returns The created mock artifact
 */
export function createMockArtifact(options?: {
  id?: string;
  type?: ArtifactType;
  events?: EventMetadata[];
  completedAt?: string;
}): Artifact {
  const {
    id = 'A.1.1',
    type = CArtifact.ISSUE,
    events = createCompletedEventSequence(),
    completedAt,
  } = options || {};

  // If completedAt is specified, ensure the last event is completed
  let finalEvents = events;
  if (completedAt) {
    const hasCompleted = events.some(
      (e) => e.event === CArtifactEvent.COMPLETED,
    );
    if (!hasCompleted) {
      finalEvents = [
        ...events,
        {
          event: CArtifactEvent.COMPLETED,
          timestamp: completedAt,
          actor: events[0]?.actor || 'user@example.com',
          trigger: CEventTrigger.PR_MERGED,
        },
      ];
    }
  }

  const baseArtifact = {
    metadata: {
      title: `Test ${type} ${id}`,
      priority: 'medium' as const,
      estimation: 'M' as const,
      created_by: 'Test User (test@example.com)',
      assignee: 'Test User (test@example.com)',
      schema_version: '0.2.0',
      relationships: {
        blocks: [],
        blocked_by: [],
      },
      events: finalEvents,
    },
  };

  // Add type-specific content
  switch (type) {
    case 'issue':
      return {
        ...baseArtifact,
        content: {
          summary: 'Test issue summary',
          acceptance_criteria: ['Test criterion 1', 'Test criterion 2'],
        },
      } as Issue;

    case 'milestone':
      return {
        ...baseArtifact,
        content: {
          summary: 'Test milestone summary',
          deliverables: ['Deliverable 1', 'Deliverable 2'],
          validation: ['Validation 1'],
        },
      } as Milestone;

    default:
      // For initiative type, return with basic content
      return {
        ...baseArtifact,
        content: {
          vision: 'Test vision',
          scope: 'Test scope',
          success_criteria: ['Success 1'],
        },
      } as Artifact;
  }
}

/**
 * Create multiple artifacts with completion dates spread over time
 * @param options - Optional options for the artifacts
 * @returns The created artifacts
 */
export function createCompletedArtifactsOverTime(options?: {
  count?: number;
  startDaysAgo?: number;
  interval?: number;
  type?: ArtifactType;
}): Artifact[] {
  const {
    count = 10,
    startDaysAgo = 30,
    interval = 2,
    type = CArtifact.ISSUE,
  } = options || {};

  const artifacts: Artifact[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const daysAgo = startDaysAgo - i * interval;
    const completedDate = new Date(now);
    completedDate.setDate(completedDate.getDate() - daysAgo);

    artifacts.push(
      createMockArtifact({
        id: `A.1.${i + 1}`,
        type,
        completedAt: completedDate.toISOString(),
      }),
    );
  }

  return artifacts;
}
