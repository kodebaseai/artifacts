/**
 * Fuzzy search utility for filtering artifacts
 *
 * Implements a simple scoring algorithm for fuzzy matching:
 * - Exact matches get highest score
 * - Case-insensitive partial matches get medium score
 * - Character sequence matches get lower score
 * - No matches get zero score
 */

export interface FuzzyMatch {
  score: number;
  matches: number[];
}

export interface Searchable {
  id: string;
  title: string;
  type?: string;
  [key: string]: unknown;
}

/**
 * Calculate fuzzy match score for a search term against target text
 * Returns score (0-100) and character match positions
 */
export function fuzzyMatch(searchTerm: string, targetText: string): FuzzyMatch {
  if (!searchTerm || !targetText) {
    return { score: 0, matches: [] };
  }

  const search = searchTerm.toLowerCase();
  const target = targetText.toLowerCase();

  // Exact match - highest score
  if (target === search) {
    return {
      score: 100,
      matches: Array.from({ length: target.length }, (_, i) => i),
    };
  }

  // Case-insensitive contains - high score
  if (target.includes(search)) {
    const startIndex = target.indexOf(search);
    return {
      score: 80,
      matches: Array.from({ length: search.length }, (_, i) => startIndex + i),
    };
  }

  // Character sequence matching - lower score
  const matches: number[] = [];
  let searchIndex = 0;

  for (let i = 0; i < target.length && searchIndex < search.length; i++) {
    if (target[i] === search[searchIndex]) {
      matches.push(i);
      searchIndex++;
    }
  }

  // Score based on how many characters matched vs total search length
  const matchRatio = matches.length / search.length;
  const score = matchRatio === 1 ? 60 : matchRatio * 40;

  return { score: Math.floor(score), matches };
}

/**
 * Search through array of searchable items and return scored results
 */
export function fuzzySearch<T extends Searchable>(
  items: T[],
  searchTerm: string,
  searchFields: Array<keyof T> = ['id', 'title'],
): Array<
  T & { _fuzzyScore: number; _fuzzyMatches: { [K in keyof T]?: number[] } }
> {
  if (!searchTerm.trim()) {
    return items.map((item) => ({
      ...item,
      _fuzzyScore: 0,
      _fuzzyMatches: {},
    }));
  }

  const results = items.map((item) => {
    let bestScore = 0;
    const matches: { [K in keyof T]?: number[] } = {};

    for (const field of searchFields) {
      const fieldValue = item[field];
      if (typeof fieldValue === 'string') {
        const match = fuzzyMatch(searchTerm, fieldValue);
        if (match.score > bestScore) {
          bestScore = match.score;
        }
        if (match.score > 0) {
          matches[field] = match.matches;
        }
      }
    }

    return {
      ...item,
      _fuzzyScore: bestScore,
      _fuzzyMatches: matches,
    };
  });

  // Filter out non-matches and sort by score (descending)
  return results
    .filter((item) => item._fuzzyScore > 0)
    .sort((a, b) => b._fuzzyScore - a._fuzzyScore);
}
