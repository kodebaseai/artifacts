/**
 * Smart diffing utilities for Kodebase artifacts
 *
 * Improves git history readability by formatting artifact changes
 * in a way that produces cleaner, more meaningful diffs.
 * @module @kodebase/core/utils/smart-diff
 */

/**
 * Options for smart diff formatting
 */
export interface SmartDiffOptions {
  /** Whether to add trailing commas to arrays and objects */
  trailingCommas?: boolean;
  /** Whether to put each array item on its own line */
  arrayItemsPerLine?: boolean;
  /** Whether to sort object keys alphabetically */
  sortKeys?: boolean;
  /** Indentation string (default: '  ') */
  indent?: string;
}

/**
 * Default options for smart diff formatting
 */
const DEFAULT_OPTIONS: SmartDiffOptions = {
  trailingCommas: true,
  arrayItemsPerLine: true,
  sortKeys: false,
  indent: '  ',
};

/**
 * Formats a value for optimal git diff readability
 *
 * @param value - The value to format
 * @param options - Formatting options
 * @param depth - Current indentation depth (internal use)
 * @returns Formatted string representation
 */
export function formatForDiff(
  value: unknown,
  options: SmartDiffOptions = {},
  depth = 0,
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const currentIndent = opts.indent?.repeat(depth) || '';
  const nextIndent = opts.indent?.repeat(depth + 1) || '';

  // Handle null/undefined
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  // Handle primitives
  if (typeof value === 'string') {
    // Use single quotes for strings to reduce escaping
    return `'${value.replace(/'/g, "\\'")}'`;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';

    if (opts.arrayItemsPerLine) {
      const items = value.map(
        (item) => `${nextIndent}${formatForDiff(item, opts, depth + 1)}`,
      );
      const trailing = opts.trailingCommas ? ',' : '';
      return `[\n${items.join(',\n')}${trailing}\n${currentIndent}]`;
    } else {
      const items = value.map((item) => formatForDiff(item, opts, depth + 1));
      return `[${items.join(', ')}]`;
    }
  }

  // Handle objects
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value);
    if (entries.length === 0) return '{}';

    // Sort keys if requested
    if (opts.sortKeys) {
      entries.sort(([a], [b]) => a.localeCompare(b));
    }

    const items = entries.map(([key, val]) => {
      const formattedValue = formatForDiff(val, opts, depth + 1);
      return `${nextIndent}${key}: ${formattedValue}`;
    });

    const trailing = opts.trailingCommas ? ',' : '';
    return `{\n${items.join(',\n')}${trailing}\n${currentIndent}}`;
  }

  // Fallback for other types
  return String(value);
}

/**
 * Formats an artifact for optimal diff visibility
 *
 * This function applies smart formatting rules specifically
 * designed for Kodebase artifacts to make diffs more readable.
 *
 * @param artifact - The artifact object to format
 * @returns Formatted artifact string
 * @example
 * const formatted = formatArtifactForDiff({
 *   metadata: { title: "Test", events: [...] },
 *   content: { ... }
 * });
 */
export function formatArtifactForDiff(
  artifact: Record<string, unknown>,
): string {
  // Special handling for artifacts:
  // - Always use trailing commas
  // - Always put array items on separate lines
  // - Don't sort keys (preserve field ordering)
  const options: SmartDiffOptions = {
    trailingCommas: true,
    arrayItemsPerLine: true,
    sortKeys: false,
    indent: '  ',
  };

  return formatForDiff(artifact, options);
}

/**
 * Compares two values and returns a human-readable change description
 *
 * @param oldValue - The original value
 * @param newValue - The new value
 * @param path - The path to the value (e.g., 'metadata.title')
 * @returns Human-readable change description
 * @example
 * const change = describeChange('draft', 'ready', 'metadata.status');
 * // Returns: "metadata.status changed from 'draft' to 'ready'"
 */
export function describeChange(
  oldValue: unknown,
  newValue: unknown,
  path: string,
): string {
  // Handle additions
  if (oldValue === undefined && newValue !== undefined) {
    return `${path} added with value ${formatForDiff(newValue, { arrayItemsPerLine: false })}`;
  }

  // Handle deletions
  if (oldValue !== undefined && newValue === undefined) {
    return `${path} removed (was ${formatForDiff(oldValue, { arrayItemsPerLine: false })})`;
  }

  // Handle changes
  if (oldValue !== newValue) {
    const oldFormatted = formatForDiff(oldValue, { arrayItemsPerLine: false });
    const newFormatted = formatForDiff(newValue, { arrayItemsPerLine: false });
    return `${path} changed from ${oldFormatted} to ${newFormatted}`;
  }

  // No change
  return `${path} unchanged`;
}

/**
 * Generates a summary of changes between two artifacts
 *
 * @param oldArtifact - The original artifact
 * @param newArtifact - The new artifact
 * @returns Array of change descriptions
 * @example
 * const changes = summarizeArtifactChanges(oldArtifact, newArtifact);
 * // Returns: ["metadata.status changed from 'draft' to 'ready'", ...]
 */
export function summarizeArtifactChanges(
  oldArtifact: Record<string, unknown>,
  newArtifact: Record<string, unknown>,
): string[] {
  const changes: string[] = [];

  // Check metadata changes
  if (oldArtifact.metadata || newArtifact.metadata) {
    const oldMeta = (oldArtifact.metadata || {}) as Record<string, unknown>;
    const newMeta = (newArtifact.metadata || {}) as Record<string, unknown>;

    // Check common metadata fields
    const metaFields = ['title', 'priority', 'estimation', 'assignee'];
    for (const field of metaFields) {
      if (oldMeta[field] !== newMeta[field]) {
        changes.push(
          describeChange(oldMeta[field], newMeta[field], `metadata.${field}`),
        );
      }
    }

    // Check events (special handling for arrays)
    const oldEvents = (oldMeta.events || []) as unknown[];
    const newEvents = (newMeta.events || []) as unknown[];
    if (oldEvents.length !== newEvents.length) {
      const diff = newEvents.length - oldEvents.length;
      if (diff > 0) {
        changes.push(`${diff} new event(s) added`);
      } else {
        changes.push(`${Math.abs(diff)} event(s) removed`);
      }
    }
  }

  // Check content changes
  if (oldArtifact.content || newArtifact.content) {
    const oldContent = (oldArtifact.content || {}) as Record<string, unknown>;
    const newContent = (newArtifact.content || {}) as Record<string, unknown>;

    // Check all content fields
    const allFields = new Set([
      ...Object.keys(oldContent),
      ...Object.keys(newContent),
    ]);
    for (const field of allFields) {
      if (oldContent[field] !== newContent[field]) {
        changes.push(
          describeChange(
            oldContent[field],
            newContent[field],
            `content.${field}`,
          ),
        );
      }
    }
  }

  return changes;
}
