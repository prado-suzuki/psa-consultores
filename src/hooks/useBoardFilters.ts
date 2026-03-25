import { useState, useEffect, useCallback, useMemo } from 'react';

type FilterValue = string | string[];

interface UseBoardFiltersOptions {
  pageKey: string;
  defaults: Record<string, FilterValue>;
}

export function useBoardFilters({ pageKey, defaults }: UseBoardFiltersOptions) {
  const storageKey = `board-filters-${pageKey}`;

  const [filters, setFilters] = useState<Record<string, FilterValue>>(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new keys
        return { ...defaults, ...parsed };
      }
    } catch { /* ignore */ }
    return { ...defaults };
  });

  // Persist on change
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(filters));
    } catch { /* ignore */ }
  }, [filters, storageKey]);

  const setFilter = useCallback((key: string, value: FilterValue) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ ...defaults });
  }, [defaults]);

  const activeCount = useMemo(() => {
    let count = 0;
    for (const key of Object.keys(defaults)) {
      const current = filters[key];
      const def = defaults[key];
      if (Array.isArray(current) && Array.isArray(def)) {
        if (JSON.stringify([...current].sort()) !== JSON.stringify([...def].sort())) count++;
      } else if (current !== def) {
        count++;
      }
    }
    return count;
  }, [filters, defaults]);

  return { filters, setFilter, resetFilters, activeCount };
}
