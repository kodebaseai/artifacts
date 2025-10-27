/**
 * Tests for artifact metrics calculations
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventMetadata } from '../../data/types';
import { CArtifactEvent, CEventTrigger } from '../../data/types/constants';
import {
  createBlockedEventSequence,
  createCompletedArtifactsOverTime,
  createCompletedEventSequence,
  createCurrentlyBlockedEventSequence,
  createIncompleteEventSequence,
  createMockArtifact,
} from '../../test/metrics-fixtures';
import {
  calculateBlockedTime,
  calculateCycleTime,
  calculateDailyVelocity,
  calculateLeadTime,
  getVelocityTrend,
} from './index';
import {
  calculateBusinessDays,
  formatDuration,
  getDurationInMinutes,
  getDurationMetrics,
  isWithinWindow,
} from './utils';

describe('Metrics Utils', () => {
  describe('getDurationInMinutes', () => {
    it('should calculate duration between two timestamps', () => {
      const start = '2025-01-01T10:00:00Z';
      const end = '2025-01-01T11:30:00Z';
      expect(getDurationInMinutes(start, end)).toBe(90);
    });

    it('should return null for invalid timestamps', () => {
      expect(
        getDurationInMinutes('invalid', '2025-01-01T10:00:00Z'),
      ).toBeNull();
      expect(
        getDurationInMinutes('2025-01-01T10:00:00Z', 'invalid'),
      ).toBeNull();
    });

    it('should handle negative durations', () => {
      const start = '2025-01-01T11:00:00Z';
      const end = '2025-01-01T10:00:00Z';
      expect(getDurationInMinutes(start, end)).toBe(-60);
    });
  });

  describe('getDurationMetrics', () => {
    it('should return duration in multiple units', () => {
      const start = '2025-01-01T10:00:00Z';
      const end = '2025-01-02T12:30:00Z';
      const metrics = getDurationMetrics(start, end);

      expect(metrics).toEqual({
        minutes: 1590,
        hours: 26.5,
        days: 1.1,
      });
    });

    it('should calculate business days when requested', () => {
      const start = '2025-01-06T10:00:00Z'; // Monday
      const end = '2025-01-13T10:00:00Z'; // Next Monday
      const metrics = getDurationMetrics(start, end, true);

      expect(metrics?.businessDays).toBe(6); // Excludes weekend
    });
  });

  describe('calculateBusinessDays', () => {
    it('should exclude weekends', () => {
      // Friday to Monday
      const start = '2025-01-03T10:00:00Z';
      const end = '2025-01-06T10:00:00Z';
      expect(calculateBusinessDays(start, end)).toBe(2); // Friday and Monday
    });

    it('should handle same day', () => {
      const date = '2025-01-06T10:00:00Z'; // Monday
      expect(calculateBusinessDays(date, date)).toBe(1);
    });
  });

  describe('isWithinWindow', () => {
    it('should check if date is within window', () => {
      const now = new Date('2025-01-10T10:00:00Z');
      const recent = '2025-01-08T10:00:00Z';
      const old = '2025-01-01T10:00:00Z';

      expect(isWithinWindow(recent, 7, now)).toBe(true);
      expect(isWithinWindow(old, 7, now)).toBe(false);
    });
  });

  describe('formatDuration', () => {
    it('should format minutes correctly', () => {
      expect(formatDuration(45)).toBe('45 minutes');
      expect(formatDuration(90)).toBe('1h 30m');
      expect(formatDuration(120)).toBe('2 hours');
      expect(formatDuration(1440)).toBe('1 days');
      expect(formatDuration(1500)).toBe('1d 1h');
    });
  });
});

describe('Artifact Metrics Functions', () => {
  let mockEvents: EventMetadata[];

  beforeEach(() => {
    // Reset mock events for each test
    mockEvents = [];
  });

  describe('calculateCycleTime', () => {
    it('should calculate cycle time from in_progress to completed', () => {
      mockEvents = createCompletedEventSequence();
      expect(calculateCycleTime(mockEvents)).toBe(150); // 2.5 hours
    });

    it('should return null if artifact not completed', () => {
      mockEvents = createIncompleteEventSequence();
      expect(calculateCycleTime(mockEvents)).toBeNull();
    });

    it('should return null if artifact never started', () => {
      mockEvents = createIncompleteEventSequence({
        lastEventType: CArtifactEvent.COMPLETED,
      });
      expect(calculateCycleTime(mockEvents)).toBeNull();
    });
  });

  describe('calculateLeadTime', () => {
    it('should calculate lead time from creation to completion', () => {
      mockEvents = createCompletedEventSequence({
        draftTime: '2025-01-01T10:00:00Z',
        endTime: '2025-01-02T14:00:00Z',
      });
      expect(calculateLeadTime(mockEvents)).toBe(1680); // 28 hours
    });

    it('should return null if not completed', () => {
      mockEvents = [
        {
          timestamp: '2025-01-01T10:00:00Z',
          event: CArtifactEvent.DRAFT,
          actor: 'user@example.com',
          trigger: CEventTrigger.ARTIFACT_CREATED,
        },
      ];

      expect(calculateLeadTime(mockEvents)).toBeNull();
    });
  });

  describe('calculateBlockedTime', () => {
    it('should calculate total blocked time', () => {
      mockEvents = createBlockedEventSequence();
      expect(calculateBlockedTime(mockEvents)).toBe(150); // 2.5 hours total
    });

    it('should handle currently blocked artifacts', () => {
      mockEvents = createCurrentlyBlockedEventSequence();
      const blockedTime = calculateBlockedTime(mockEvents);
      expect(blockedTime).toBeGreaterThanOrEqual(59); // At least 59 minutes
      expect(blockedTime).toBeLessThanOrEqual(61); // At most 61 minutes
    });

    it('should return 0 if never blocked', () => {
      mockEvents = [
        {
          timestamp: '2025-01-01T10:00:00Z',
          event: CArtifactEvent.DRAFT,
          actor: 'user@example.com',
          trigger: CEventTrigger.ARTIFACT_CREATED,
        },
        {
          timestamp: '2025-01-01T11:00:00Z',
          event: CArtifactEvent.COMPLETED,
          actor: 'user@example.com',
          trigger: CEventTrigger.ARTIFACT_CREATED,
        },
      ];

      expect(calculateBlockedTime(mockEvents)).toBe(0);
    });
  });
});

describe('Velocity Functions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('calculateDailyVelocity', () => {
    it('should calculate daily velocity for recent completions', () => {
      const mockArtifacts = createCompletedArtifactsOverTime({
        count: 15,
        startDaysAgo: 28,
        interval: 2,
      });

      const velocity = calculateDailyVelocity(mockArtifacts);
      expect(velocity).toBe(0.5); // 15 items / 30 days
    });

    it('should exclude old completions', () => {
      const now = new Date(); // Uses mocked time
      const fiveDaysAgo = new Date(now);
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      const fortyDaysAgo = new Date(now);
      fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);

      // Create artifacts with only completed events at specific times
      const recentArtifact = createMockArtifact({
        id: 'A.1.1',
        events: [
          {
            timestamp: fiveDaysAgo.toISOString(),
            event: CArtifactEvent.COMPLETED,
            actor: 'user@example.com',
            trigger: CEventTrigger.ARTIFACT_CREATED,
          },
        ],
      });

      const oldArtifact = createMockArtifact({
        id: 'A.1.2',
        events: [
          {
            timestamp: fortyDaysAgo.toISOString(),
            event: CArtifactEvent.COMPLETED,
            actor: 'user@example.com',
            trigger: CEventTrigger.ARTIFACT_CREATED,
          },
        ],
      });

      const velocity = calculateDailyVelocity([recentArtifact, oldArtifact]);
      expect(velocity).toBe(1 / 30); // Only 1 recent item
    });
  });

  describe('getVelocityTrend', () => {
    it('should detect increasing trend', () => {
      // More completions in recent period (5 in last 14 days)
      const recentArtifacts = createCompletedArtifactsOverTime({
        count: 5,
        startDaysAgo: 5,
        interval: 1,
      });

      // Fewer completions in previous period (2 in days 15-28)
      const previousArtifacts = createCompletedArtifactsOverTime({
        count: 2,
        startDaysAgo: 16,
        interval: 1,
      });

      const allArtifacts = [...recentArtifacts, ...previousArtifacts];
      const trend = getVelocityTrend(allArtifacts);
      expect(trend.trend).toBe('increasing');
      expect(trend.current).toBeGreaterThan(trend.previous);
    });
  });
});
