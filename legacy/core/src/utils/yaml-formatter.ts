/**
 * YAML formatting utilities for Kodebase artifacts
 *
 * Provides consistent YAML formatting while preserving structure and field ordering.
 * Used extensively throughout the system for artifact serialization.
 * @module @kodebase/core/utils/yaml-formatter
 */

import { parse, stringify } from 'yaml';

/**
 * YAML formatting options
 */
export interface YamlFormatOptions {
  indent?: number;
  lineWidth?: number;
  quotingType?: '"' | "'";
  forceQuotes?: boolean;
}

/**
 * Default formatting options for consistency
 */
const DEFAULT_OPTIONS: YamlFormatOptions = {
  indent: 2,
  lineWidth: 80,
  quotingType: '"',
  forceQuotes: false,
};

/**
 * Formats a JavaScript object as YAML with consistent formatting
 *
 * @param data - The data to format as YAML
 * @param options - Optional formatting options
 * @returns Formatted YAML string
 * @example
 * const yaml = formatYaml({ name: "test", value: 123 });
 * // Returns formatted YAML string with consistent spacing
 */
export function formatYaml(
  data: unknown,
  options: YamlFormatOptions = {},
): string {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  try {
    // The yaml package uses different option names
    return stringify(data, {
      indent: mergedOptions.indent,
      lineWidth: mergedOptions.lineWidth,
      defaultStringType: mergedOptions.forceQuotes ? 'QUOTE_DOUBLE' : 'PLAIN',
      defaultKeyType: 'PLAIN',
      // @ts-ignore - sortMapEntries exists but may not be in types
      sortMapEntries: false,
    });
  } catch (error) {
    throw new Error(
      `Failed to format YAML: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Parses YAML string to JavaScript object
 *
 * @param yamlString - The YAML string to parse
 * @returns Parsed JavaScript object
 * @throws Error if YAML is invalid
 * @example
 * const data = parseYaml("name: test\nvalue: 123");
 * // Returns: { name: "test", value: 123 }
 */
export function parseYaml(yamlString: string): unknown {
  if (typeof yamlString !== 'string') {
    throw new Error('Input must be a string');
  }

  try {
    return parse(yamlString);
  } catch (error) {
    throw new Error(
      `Failed to parse YAML: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Validates if a string is valid YAML
 *
 * @param yamlString - The YAML string to validate
 * @returns True if valid YAML, false otherwise
 * @example
 * isValidYaml("name: test"); // true
 * isValidYaml("invalid: ["); // false
 */
export function isValidYaml(yamlString: string): boolean {
  try {
    parseYaml(yamlString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Preserves field ordering by using a custom replacer
 * This ensures that artifact fields appear in a consistent order
 *
 * @param data - The data to format with preserved field order
 * @param fieldOrder - Array of field names in desired order
 * @returns Formatted YAML string with fields in specified order
 * @example
 * const yaml = formatYamlWithFieldOrder(
 *   { b: 2, a: 1 },
 *   ['a', 'b']
 * );
 * // Returns YAML with 'a' field before 'b' field
 */
export function formatYamlWithFieldOrder(
  data: Record<string, unknown>,
  fieldOrder: string[],
): string {
  // Create new object with fields in specified order
  const orderedData: Record<string, unknown> = {};

  // First, add fields in the specified order
  for (const field of fieldOrder) {
    if (field in data) {
      orderedData[field] = data[field];
    }
  }

  // Then add any remaining fields not in the order list
  for (const field in data) {
    if (!(field in orderedData)) {
      orderedData[field] = data[field];
    }
  }

  return formatYaml(orderedData);
}
