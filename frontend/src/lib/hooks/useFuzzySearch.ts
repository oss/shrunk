import { useMemo, useCallback } from 'react';
import Fuse, { FuseResult, FuseResultMatch, IFuseOptions } from 'fuse.js';

/**
 * Fuzzy search configuration options
 */
interface FuzzySearchConfig {
  /**
   * Fields to search in (for object arrays)
   */
  keys: string[];
  /**
   * Sensitivity threshold (0-1, lower is stricter)
   * Maps to Fuse.js threshold setting
   */
  threshold?: number;
  /**
   * Distance for contextual search
   */
  distance?: number;
}

/**
 * Search result item
 */
interface SearchResult<T> {
  item: T;
  score?: number;
  matches?: readonly FuseResultMatch[];
}

/**
 * Search hook return type
 */
interface UseFuzzySearchReturn<T> {
  search: (query: string) => SearchResult<T>[];
  fuse: Fuse<T> | null;
}

/**
 * A custom hook that provides Fuse.js fuzzy search functionality
 *
 * @param data - Array of items to search through
 * @param config - Search configuration options
 * @returns Object with search function and Fuse instance
 */
export function useFuzzySearch<T>(
  data: T[],
  config: FuzzySearchConfig,
): UseFuzzySearchReturn<T> {
  const { keys, threshold = 0.5, distance = 100 } = config;

  // Create and configure Fuse instance
  const fuse = useMemo(() => {
    if (!data.length) return null;

    const fuseOptions: IFuseOptions<T> = {
      keys,
      threshold,
      distance,
      ignoreLocation: true,
      useExtendedSearch: false,
    };

    return new Fuse(data, fuseOptions);
  }, [data, keys, threshold, distance]);

  const search = (query: string): SearchResult<T>[] => {
      if (!fuse || !query) {
        return [];
      }

      try {
        const results: FuseResult<T>[] = fuse.search(query, { limit: 50 });

        console.log('Results: ', results);

        return results.map((result) => ({
          item: result.item,
        }));
      } catch (error) {
        console.warn('Fuse.js search error:', error);
        return [];
      }
    };

  return { search, fuse };
}
