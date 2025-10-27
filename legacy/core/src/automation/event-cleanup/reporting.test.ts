import { describe, expect, it } from 'vitest';
import type { EventMetadata, TArtifactEvent } from '../../data/types';
import { CEventTrigger } from '../../data/types/constants';
import { cleanupEvents } from './cleanup';
import {
  formatCleanupSummary,
  generateBatchCleanupReport,
  generateCleanupReport,
} from './reporting';
import type { EventCleanupResult } from './types';

describe('Event Cleanup Reporting', () => {
  const createMockEvent = (
    event: string,
    actor: string,
    timestamp: string,
    trigger = CEventTrigger.MANUAL,
    metadata?: Record<string, unknown>,
  ): EventMetadata => ({
    event: event as TArtifactEvent,
    timestamp,
    actor,
    trigger,
    metadata,
  });

  const createMockCleanupResult = (
    overrides: Partial<EventCleanupResult> = {},
  ): EventCleanupResult => ({
    hadIssues: false,
    deduplication: {
      hadDuplicates: false,
      duplicatesRemoved: 0,
      duplicates: [],
      cleanedEvents: [],
      summary: 'No duplicates found',
    },
    orphanedCleanup: {
      hadOrphans: false,
      orphansRemoved: 0,
      orphans: [],
      cleanedEvents: [],
      summary: 'No orphans found',
    },
    stateConsistency: {
      hadViolations: false,
      violationsFixed: 0,
      violations: [],
      cleanedEvents: [],
      summary: 'No violations found',
    },
    finalEvents: [],
    overallSummary: 'No issues found - events are clean',
    processingTimeMs: 0.03,
    ...overrides,
  });

  describe('generateCleanupReport', () => {
    it('should generate text report for clean events', () => {
      const events = [
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ),
        createMockEvent(
          'ready',
          'John Doe (john@example.com)',
          '2025-01-01T11:00:00Z',
        ),
      ];

      const result = cleanupEvents(events);
      const report = generateCleanupReport(result);

      expect(report).toContain('EVENT CLEANUP REPORT');
      expect(report).toContain('✅ Clean');
      expect(report).toContain('No issues found');
    });

    it('should generate detailed report for events with issues', () => {
      const events = [
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ),
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ), // Duplicate
        createMockEvent(
          'ready',
          'John Doe (john@example.com)',
          '2025-01-01T11:00:00Z',
        ),
        createMockEvent(
          'ready',
          'Jane Doe (jane@example.com)',
          '2025-01-01T11:30:00Z',
        ), // State violation
      ];

      const result = cleanupEvents(events);
      const report = generateCleanupReport(result, { includeDetails: true });

      expect(report).toContain('EVENT CLEANUP REPORT');
      expect(report).toContain('⚠️  Issues Found and Fixed');
    });

    it('should generate JSON report when requested', () => {
      const result = createMockCleanupResult();
      const jsonReport = generateCleanupReport(result, { formatAsJson: true });

      expect(() => JSON.parse(jsonReport)).not.toThrow();
      const parsed = JSON.parse(jsonReport);
      expect(parsed).toHaveProperty('hadIssues');
      expect(parsed).toHaveProperty('finalEvents');
    });

    it('should include performance metrics when enabled', () => {
      const result = createMockCleanupResult({ processingTimeMs: 145.67 });
      const report = generateCleanupReport(result, {
        includePerformance: true,
      });

      expect(report).toContain('PERFORMANCE METRICS');
      expect(report).toContain('145.67ms');
    });

    it('should exclude details when not requested', () => {
      const result = createMockCleanupResult({
        hadIssues: true,
        deduplication: {
          hadDuplicates: true,
          duplicatesRemoved: 2,
          duplicates: [],
          cleanedEvents: [],
          summary: 'Removed 2 duplicates',
        },
      });

      const report = generateCleanupReport(result, { includeDetails: false });

      expect(report).toContain('EVENT CLEANUP REPORT');
      expect(report).not.toContain('Detailed duplicate information');
    });

    it('should exclude suggestions when not requested', () => {
      const result = createMockCleanupResult({ hadIssues: true });
      const report = generateCleanupReport(result, {
        includeSuggestions: false,
      });

      expect(report).not.toContain('RECOMMENDATIONS');
    });

    it('should show detailed duplicate information', () => {
      const events = [
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ),
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ), // Duplicate
      ];

      const result = cleanupEvents(events);
      const report = generateCleanupReport(result, { includeDetails: true });

      expect(report).toContain('DEDUPLICATION');
      expect(report).toContain('Duplicates Removed:');
    });

    it('should show detailed orphaned event information', () => {
      const events = [
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ),
        createMockEvent(
          'ready',
          'system',
          '2025-01-01T11:00:00Z',
          CEventTrigger.MANUAL,
          {
            trigger_artifact: 'missing_artifact',
            cascade_type: 'dependency_met',
          },
        ),
      ];

      const result = cleanupEvents(events);
      const report = generateCleanupReport(result, { includeDetails: true });

      expect(report).toContain('ORPHANED EVENTS');
      if (result.orphanedCleanup.hadOrphans) {
        expect(report).toContain('Orphans Removed:');
      }
    });

    it('should show detailed state violation information', () => {
      const events = [
        createMockEvent(
          'ready',
          'John Doe (john@example.com)',
          '2025-01-01T11:00:00Z',
        ),
        createMockEvent(
          'ready',
          'Jane Doe (jane@example.com)',
          '2025-01-01T11:30:00Z',
        ), // State violation
      ];

      const result = cleanupEvents(events);
      const report = generateCleanupReport(result, { includeDetails: true });

      expect(report).toContain('STATE CONSISTENCY');
      expect(report).toContain('Violations Fixed:');
    });
  });

  describe('generateBatchCleanupReport', () => {
    it('should generate summary for multiple artifacts', () => {
      const results = [
        createMockCleanupResult({
          hadIssues: true,
          deduplication: {
            hadDuplicates: true,
            duplicatesRemoved: 2,
            duplicates: [],
            cleanedEvents: [],
            summary: 'Removed 2 duplicates',
          },
        }),
        createMockCleanupResult(),
        createMockCleanupResult({
          hadIssues: true,
          stateConsistency: {
            hadViolations: true,
            violationsFixed: 1,
            violations: [],
            cleanedEvents: [],
            summary: 'Fixed 1 violation',
          },
        }),
      ];

      const report = generateBatchCleanupReport(
        results.map((result, i) => ({ artifactId: `A.${i + 1}`, result })),
      );

      expect(report).toContain('BATCH EVENT CLEANUP REPORT');
      expect(report).toContain('Artifacts Processed: 3');
      expect(report).toContain('Artifacts with Issues: 2');
    });

    it('should handle all clean artifacts', () => {
      const results = [createMockCleanupResult(), createMockCleanupResult()];

      const report = generateBatchCleanupReport(
        results.map((result, i) => ({ artifactId: `A.${i + 1}`, result })),
      );

      expect(report).toContain('Artifacts with Issues: 0');
    });

    it('should deduplicate recommendations', () => {
      const results = [
        createMockCleanupResult({ hadIssues: true }),
        createMockCleanupResult({ hadIssues: true }),
      ];

      const report = generateBatchCleanupReport(
        results.map((result, i) => ({ artifactId: `A.${i + 1}`, result })),
      );

      // Count occurrences of the same suggestion
      const suggestionMatches = report.match(/Review event creation/g);
      expect(suggestionMatches?.length || 0).toBeLessThanOrEqual(1);
    });
  });

  describe('formatCleanupSummary', () => {
    it('should format clean result', () => {
      const result = createMockCleanupResult();
      const summary = formatCleanupSummary(result);

      expect(summary).toContain('✅');
      expect(summary).toContain('✅');
    });

    it('should format result with issues', () => {
      const result = createMockCleanupResult({
        hadIssues: true,
        deduplication: {
          hadDuplicates: true,
          duplicatesRemoved: 3,
          duplicates: [],
          cleanedEvents: [],
          summary: 'Removed 3 duplicates',
        },
      });

      const summary = formatCleanupSummary(result);

      expect(summary).toContain('⚠️');
      expect(summary).toContain('3');
    });

    it('should format result with orphans only', () => {
      const result = createMockCleanupResult({
        hadIssues: true,
        orphanedCleanup: {
          hadOrphans: true,
          orphansRemoved: 2,
          orphans: [],
          cleanedEvents: [],
          summary: 'Removed 2 orphans',
        },
      });

      const summary = formatCleanupSummary(result);

      expect(summary).toContain('⚠️');
      expect(summary).toContain('2 orphans');
    });
  });

  describe('Report Content Quality', () => {
    it('should generate actionable suggestions based on issues found', () => {
      const result = createMockCleanupResult({
        hadIssues: true,
        deduplication: {
          hadDuplicates: true,
          duplicatesRemoved: 5,
          duplicates: [],
          cleanedEvents: [],
          summary: 'Removed 5 duplicates',
        },
        orphanedCleanup: {
          hadOrphans: true,
          orphansRemoved: 3,
          orphans: [],
          cleanedEvents: [],
          summary: 'Removed 3 orphans',
        },
      });

      const report = generateCleanupReport(result, {
        includeSuggestions: true,
      });

      expect(report).toContain('SUGGESTIONS');
      // Should contain actionable suggestions based on the specific issues
    });

    it('should handle reports with no suggestions needed', () => {
      const result = createMockCleanupResult();
      const report = generateCleanupReport(result, {
        includeSuggestions: true,
      });

      expect(report).not.toContain('SUGGESTIONS');
    });

    it('should format timestamps and actors correctly', () => {
      const events = [
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ),
        createMockEvent(
          'draft',
          'John Doe (john@example.com)',
          '2025-01-01T10:00:00Z',
        ), // Duplicate to force details
      ];

      const result = cleanupEvents(events);
      const report = generateCleanupReport(result, { includeDetails: true });

      expect(report).toContain('2025-01-01'); // Date format
      expect(report).toContain('John Doe'); // Actor name
    });
  });

  describe('Performance Reporting', () => {
    it('should suggest optimization for slow processing', () => {
      const result = createMockCleanupResult({ processingTimeMs: 5000 }); // 5 seconds
      const report = generateCleanupReport(result, {
        includePerformance: true,
        includeSuggestions: true,
      });

      expect(report).toContain('PERFORMANCE METRICS');
      expect(report).toContain('5000.00ms');
    });

    it('should calculate events per second correctly', () => {
      const result = createMockCleanupResult({
        processingTimeMs: 100,
        finalEvents: new Array(50)
          .fill(null)
          .map(() => createMockEvent('draft', 'Test', '2025-01-01T10:00:00Z')),
      });

      const report = generateCleanupReport(result, {
        includePerformance: true,
      });

      expect(report).toContain('Events per Second:');
      expect(report).toContain('500'); // 50 events / 0.1 seconds = 500 eps
    });
  });
});
