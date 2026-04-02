/**
 * Utility functions for computing field-level diffs
 * between old and new objects, for audit logging.
 */

type FieldDiff = Record<string, { old: unknown; new: unknown }>;

const INTERNAL_KEYS = new Set(['_id', '_dbId', '_tempId']);

/**
 * Compare two objects field-by-field, returning only changed fields.
 * If oldObj is null (creation), all non-empty new values are returned.
 */
export function computeFieldDiff(
  oldObj: Record<string, unknown> | null | undefined,
  newObj: Record<string, unknown>,
  fieldsToCompare: string[],
): FieldDiff {
  const diff: FieldDiff = {};

  for (const field of fieldsToCompare) {
    if (INTERNAL_KEYS.has(field)) continue;

    const oldVal = oldObj?.[field] ?? null;
    const newVal = newObj[field] ?? null;

    // Normalize for comparison
    const oldNorm = normalize(oldVal);
    const newNorm = normalize(newVal);

    if (oldNorm !== newNorm) {
      diff[field] = { old: oldVal, new: newVal };
    }
  }

  return diff;
}

function normalize(val: unknown): string {
  if (val === null || val === undefined || val === '') return '';
  if (Array.isArray(val)) return JSON.stringify(val.slice().sort());
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

/**
 * Given a list of old and new entities matched by a DB id field,
 * returns per-entity diffs for modified items.
 */
export function computeEntityListDiff<T extends Record<string, unknown>>(
  oldList: T[],
  newList: T[],
  dbIdField: string,
  fieldsToCompare: string[],
): { entityId: string; diff: FieldDiff }[] {
  const results: { entityId: string; diff: FieldDiff }[] = [];

  const oldMap = new Map<string, T>();
  for (const item of oldList) {
    const id = item[dbIdField] as string | undefined;
    if (id) oldMap.set(id, item);
  }

  for (const newItem of newList) {
    const id = newItem[dbIdField] as string | undefined;
    if (!id) continue; // new item without DB id = creation, handled separately
    const oldItem = oldMap.get(id);
    if (!oldItem) continue;

    const diff = computeFieldDiff(
      oldItem as Record<string, unknown>,
      newItem as Record<string, unknown>,
      fieldsToCompare,
    );
    if (Object.keys(diff).length > 0) {
      results.push({ entityId: id, diff });
    }
  }

  return results;
}
