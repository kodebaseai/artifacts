/**
 * Event Cleanup Reporting Utilities
 *
 * Provides detailed reporting of cleanup actions performed, with formatted
 * output for debugging and audit purposes.
 */

import type {
  DuplicateEvent,
  EventCleanupResult,
  OrphanedEvent,
  StateConsistencyViolation,
} from './types';

/**
 * Report formatting options
 */
export interface ReportOptions {
  /** Include detailed event information */
  includeDetails?: boolean;
  /** Include performance metrics */
  includePerformance?: boolean;
  /** Include suggestions for prevention */
  includeSuggestions?: boolean;
  /** Format as JSON instead of human-readable text */
  formatAsJson?: boolean;
}

/**
 * Generates a comprehensive cleanup report
 *
 * @param result - Cleanup result to report on
 * @param options - Report formatting options
 * @returns Formatted report string
 */
export function generateCleanupReport(
  result: EventCleanupResult,
  options: ReportOptions = {},
): string {
  const opts = {
    includeDetails: true,
    includePerformance: true,
    includeSuggestions: true,
    formatAsJson: false,
    ...options,
  };

  if (opts.formatAsJson) {
    return generateJsonReport(result);
  }

  return generateTextReport(result, opts);
}

/**
 * Generates a human-readable text report
 *
 * @param result - Cleanup result
 * @param options - Report options
 * @returns Formatted text report
 */
function generateTextReport(
  result: EventCleanupResult,
  options: Required<ReportOptions>,
): string {
  const lines: string[] = [];

  // Header
  lines.push('='.repeat(60));
  lines.push('EVENT CLEANUP REPORT');
  lines.push('='.repeat(60));
  lines.push('');

  // Summary
  lines.push('SUMMARY');
  lines.push('-'.repeat(20));
  lines.push(
    `Overall Status: ${result.hadIssues ? '⚠️  Issues Found and Fixed' : '✅ Clean'}`,
  );
  lines.push(`Processing Time: ${result.processingTimeMs.toFixed(2)}ms`);
  lines.push(`Final Events Count: ${result.finalEvents.length}`);
  lines.push('');
  lines.push(`Details: ${result.overallSummary}`);
  lines.push('');

  // Deduplication section
  if (result.deduplication.hadDuplicates || options.includeDetails) {
    lines.push('DEDUPLICATION');
    lines.push('-'.repeat(20));
    lines.push(
      `Status: ${result.deduplication.hadDuplicates ? '⚠️  Duplicates Found' : '✅ No Duplicates'}`,
    );
    lines.push(`Duplicates Removed: ${result.deduplication.duplicatesRemoved}`);

    if (result.deduplication.duplicates.length > 0 && options.includeDetails) {
      lines.push('');
      lines.push('Duplicate Events Removed:');
      result.deduplication.duplicates.forEach((dup, index) => {
        lines.push(`  ${index + 1}. ${formatDuplicateEvent(dup)}`);
      });
    }
    lines.push('');
  }

  // Orphaned events section
  if (result.orphanedCleanup.hadOrphans || options.includeDetails) {
    lines.push('ORPHANED EVENTS');
    lines.push('-'.repeat(20));
    lines.push(
      `Status: ${result.orphanedCleanup.hadOrphans ? '⚠️  Orphans Found' : '✅ No Orphans'}`,
    );
    lines.push(`Orphans Removed: ${result.orphanedCleanup.orphansRemoved}`);

    if (result.orphanedCleanup.orphans.length > 0 && options.includeDetails) {
      lines.push('');
      lines.push('Orphaned Events Removed:');
      result.orphanedCleanup.orphans.forEach((orphan, index) => {
        lines.push(`  ${index + 1}. ${formatOrphanedEvent(orphan)}`);
      });
    }
    lines.push('');
  }

  // State consistency section
  if (result.stateConsistency.hadViolations || options.includeDetails) {
    lines.push('STATE CONSISTENCY');
    lines.push('-'.repeat(20));
    lines.push(
      `Status: ${result.stateConsistency.hadViolations ? '⚠️  Violations Found' : '✅ Consistent'}`,
    );
    lines.push(`Violations Fixed: ${result.stateConsistency.violationsFixed}`);

    if (
      result.stateConsistency.violations.length > 0 &&
      options.includeDetails
    ) {
      lines.push('');
      lines.push('State Violations Fixed:');
      result.stateConsistency.violations.forEach((violation, index) => {
        lines.push(`  ${index + 1}. ${formatStateViolation(violation)}`);
      });
    }
    lines.push('');
  }

  // Performance metrics
  if (options.includePerformance) {
    lines.push('PERFORMANCE METRICS');
    lines.push('-'.repeat(20));
    lines.push(
      `Total Processing Time: ${result.processingTimeMs.toFixed(2)}ms`,
    );
    lines.push(
      `Events per Second: ${((result.finalEvents.length / result.processingTimeMs) * 1000).toFixed(0)}`,
    );
    lines.push('');
  }

  // Suggestions
  if (options.includeSuggestions) {
    const suggestions = generateSuggestions(result);
    if (suggestions.length > 0) {
      lines.push('SUGGESTIONS');
      lines.push('-'.repeat(20));
      suggestions.forEach((suggestion, index) => {
        lines.push(`${index + 1}. ${suggestion}`);
      });
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Generates a JSON report
 *
 * @param result - Cleanup result
 * @returns JSON string
 */
function generateJsonReport(result: EventCleanupResult): string {
  return JSON.stringify(result, null, 2);
}

/**
 * Formats duplicate event information
 *
 * @param duplicate - Duplicate event info
 * @returns Formatted string
 */
function formatDuplicateEvent(duplicate: DuplicateEvent): string {
  const event = duplicate.event;
  return `${event.event} by ${event.actor} at ${event.timestamp} (${duplicate.reason})`;
}

/**
 * Formats orphaned event information
 *
 * @param orphan - Orphaned event info
 * @returns Formatted string
 */
function formatOrphanedEvent(orphan: OrphanedEvent): string {
  const event = orphan.event;
  return `${event.event} by ${event.actor} at ${event.timestamp} - ${orphan.reason}`;
}

/**
 * Formats state consistency violation information
 *
 * @param violation - State violation info
 * @returns Formatted string
 */
function formatStateViolation(violation: StateConsistencyViolation): string {
  const removedCount = violation.removedIndices.length;
  return `${violation.state} state had ${violation.events.length} events, removed ${removedCount} duplicate${removedCount === 1 ? '' : 's'}`;
}

/**
 * Generates suggestions based on cleanup results
 *
 * @param result - Cleanup result
 * @returns Array of suggestion strings
 */
function generateSuggestions(result: EventCleanupResult): string[] {
  const suggestions: string[] = [];

  // Suggestions based on duplicates
  if (result.deduplication.duplicatesRemoved > 0) {
    suggestions.push(
      'Consider implementing event ID validation to prevent duplicate submissions',
    );

    const manualDuplicates = result.deduplication.duplicates.filter(
      (d) => !d.reason.includes('system'),
    );

    if (manualDuplicates.length > 0) {
      suggestions.push(
        'Review manual event creation process to reduce human error duplicates',
      );
    }
  }

  // Suggestions based on orphaned events
  if (result.orphanedCleanup.orphansRemoved > 0) {
    suggestions.push(
      'Review cascade event creation to ensure proper parent references',
    );
    suggestions.push(
      'Consider implementing cascade event validation before persistence',
    );
  }

  // Suggestions based on state violations
  if (result.stateConsistency.violationsFixed > 0) {
    suggestions.push(
      'Implement state machine validation to prevent multiple events for same state',
    );
    suggestions.push(
      'Consider using atomic state transitions to prevent race conditions',
    );
  }

  // Performance suggestions
  if (result.processingTimeMs > 1000) {
    suggestions.push(
      'Consider optimizing event cleanup for better performance on large event arrays',
    );
  }

  return suggestions;
}

/**
 * Generates a summary report for multiple artifacts
 *
 * @param results - Array of cleanup results for different artifacts
 * @returns Summary report
 */
export function generateBatchCleanupReport(
  results: Array<{ artifactId: string; result: EventCleanupResult }>,
): string {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push('BATCH EVENT CLEANUP REPORT');
  lines.push('='.repeat(60));
  lines.push('');

  // Overall statistics
  const totalArtifacts = results.length;
  const artifactsWithIssues = results.filter((r) => r.result.hadIssues).length;
  const totalDuplicates = results.reduce(
    (sum, r) => sum + r.result.deduplication.duplicatesRemoved,
    0,
  );
  const totalOrphans = results.reduce(
    (sum, r) => sum + r.result.orphanedCleanup.orphansRemoved,
    0,
  );
  const totalViolations = results.reduce(
    (sum, r) => sum + r.result.stateConsistency.violationsFixed,
    0,
  );
  const totalTime = results.reduce(
    (sum, r) => sum + r.result.processingTimeMs,
    0,
  );

  lines.push('OVERALL STATISTICS');
  lines.push('-'.repeat(20));
  lines.push(`Artifacts Processed: ${totalArtifacts}`);
  lines.push(
    `Artifacts with Issues: ${artifactsWithIssues} (${((artifactsWithIssues / totalArtifacts) * 100).toFixed(1)}%)`,
  );
  lines.push(`Total Duplicates Removed: ${totalDuplicates}`);
  lines.push(`Total Orphans Removed: ${totalOrphans}`);
  lines.push(`Total State Violations Fixed: ${totalViolations}`);
  lines.push(`Total Processing Time: ${totalTime.toFixed(2)}ms`);
  lines.push('');

  // Per-artifact summary
  if (artifactsWithIssues > 0) {
    lines.push('ARTIFACTS WITH ISSUES');
    lines.push('-'.repeat(20));

    results
      .filter((r) => r.result.hadIssues)
      .forEach(({ artifactId, result }) => {
        lines.push(`${artifactId}: ${result.overallSummary}`);
      });

    lines.push('');
  }

  // Recommendations
  const allSuggestions = results
    .flatMap((r) => generateSuggestions(r.result))
    .filter((suggestion, index, arr) => arr.indexOf(suggestion) === index); // Remove duplicates

  if (allSuggestions.length > 0) {
    lines.push('RECOMMENDATIONS');
    lines.push('-'.repeat(20));
    allSuggestions.forEach((suggestion, index) => {
      lines.push(`${index + 1}. ${suggestion}`);
    });
  }

  return lines.join('\n');
}

/**
 * Formats cleanup statistics for quick overview
 *
 * @param result - Cleanup result
 * @returns One-line summary
 */
export function formatCleanupSummary(result: EventCleanupResult): string {
  if (!result.hadIssues) {
    return `✅ Clean (${result.finalEvents.length} events, ${result.processingTimeMs.toFixed(1)}ms)`;
  }

  const parts: string[] = [];

  if (result.deduplication.duplicatesRemoved > 0) {
    parts.push(`${result.deduplication.duplicatesRemoved} dupes`);
  }

  if (result.orphanedCleanup.orphansRemoved > 0) {
    parts.push(`${result.orphanedCleanup.orphansRemoved} orphans`);
  }

  if (result.stateConsistency.violationsFixed > 0) {
    parts.push(`${result.stateConsistency.violationsFixed} violations`);
  }

  return `⚠️  Fixed: ${parts.join(', ')} (${result.finalEvents.length} events, ${result.processingTimeMs.toFixed(1)}ms)`;
}
