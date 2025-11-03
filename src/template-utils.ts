/**
 * Utility functions for artifact template generation.
 *
 * Provides slug generation and other template-related utilities
 * for creating artifacts with consistent naming.
 *
 * @module template-utils
 */

/**
 * Generates a URL-safe slug from a title.
 *
 * Converts a human-readable title into a lowercase, hyphen-separated
 * slug suitable for URLs and file/directory names.
 *
 * @param title - The title to convert to a slug
 * @returns URL-safe slug (lowercase, hyphenated)
 *
 * @example
 * ```ts
 * generateSlug("My Feature Title")  // "my-feature-title"
 * generateSlug("API v2.0!")         // "api-v2-0"
 * generateSlug("User Auth")         // "user-auth"
 * ```
 */
export function generateSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      // Replace sequences of non-alphanumeric characters with single hyphen
      .replace(/[^a-z0-9]+/g, "-")
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, "")
  );
}
