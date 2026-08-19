import { useCallback, useMemo } from 'react';
import Fuse from 'fuse.js';

interface FuzzySearchConfig {
  keys: string[];
  threshold?: number;
  distance?: number;
}

function useFuzzySearch<T>(data: T[], config: FuzzySearchConfig) {
  const { keys, threshold = 0.5, distance = 100 } = config;
  const keyList = keys.join('\0');
  const fuse = useMemo(
    () =>
      new Fuse(data, {
        keys: keyList.split('\0'),
        threshold,
        distance,
        ignoreLocation: true,
      }),
    [data, keyList, threshold, distance],
  );
  const search = useCallback(
    (query: string) =>
      query
        ? fuse.search(query, { limit: 50 }).map(({ item }) => ({ item }))
        : [],
    [fuse],
  );

  return { search };
}

export default useFuzzySearch;
