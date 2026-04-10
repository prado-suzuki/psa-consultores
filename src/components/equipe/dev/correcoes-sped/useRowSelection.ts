import { useCallback, useState } from 'react';

export function useRowSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback((filteredIds: string[]) => {
    setSelectedIds((prev) => {
      const allSelected = filteredIds.length > 0 && filteredIds.every((id) => prev.has(id));
      if (allSelected) return new Set();
      return new Set(filteredIds);
    });
  }, []);

  const clear = useCallback(() => setSelectedIds(new Set()), []);

  return { selectedIds, toggle, toggleAll, clear };
}

/**
 * Pure updater for batch draft changes.
 * If the edited row is selected and there are multiple selections,
 * the same change is applied to all selected drafts.
 */
export function applyBatchChange<D>(
  current: Record<string, D>,
  selectedIds: Set<string>,
  id: string,
  field: string,
  value: string,
): Record<string, D> {
  const idsToUpdate =
    selectedIds.has(id) && selectedIds.size > 1
      ? [...selectedIds].filter((sid) => sid in current)
      : [id];

  let next = current;
  for (const targetId of idsToUpdate) {
    const draft = next[targetId];
    if (draft && (draft as Record<string, unknown>)[field] !== value) {
      if (next === current) next = { ...current };
      next[targetId] = { ...draft, [field]: value };
    }
  }
  return next;
}
