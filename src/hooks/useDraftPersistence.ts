import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook genérico para persistir rascunho de formulário em sessionStorage.
 * Salva com debounce de 500ms e restaura ao reabrir.
 * Serializa Dates como strings ISO com marcador __date__.
 */

const DATE_MARKER = '__date__';

function serialize(values: Record<string, any>): string {
  return JSON.stringify(values, (_key, value) => {
    if (value instanceof Date) {
      return `${DATE_MARKER}${value.toISOString()}`;
    }
    return value;
  });
}

function deserialize(raw: string): Record<string, any> | null {
  try {
    return JSON.parse(raw, (_key, value) => {
      if (typeof value === 'string' && value.startsWith(DATE_MARKER)) {
        return new Date(value.slice(DATE_MARKER.length));
      }
      return value;
    });
  } catch {
    return null;
  }
}

export function useDraftPersistence<T extends Record<string, any>>(
  key: string,
  values: T,
  enabled: boolean,
  userId?: string,
) {
  const storageKey = userId ? `draft_${key}_${userId}` : `draft_${key}`;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep a serialized snapshot to avoid re-firing when object reference changes
  // but content stays the same (e.g. form.watch() returns new object every render).
  const lastSerializedRef = useRef<string>('');

  // Save with debounce — only when serialized content actually changed
  useEffect(() => {
    if (!enabled) return;

    const serialized = serialize(values);
    if (serialized === lastSerializedRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      lastSerializedRef.current = serialized;
      try {
        sessionStorage.setItem(storageKey, serialized);
      } catch {
        // quota exceeded – silently ignore
      }
    }, 500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [storageKey, values, enabled]);

  const restore = useCallback((): T | null => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return null;
      return deserialize(raw) as T | null;
    } catch {
      return null;
    }
  }, [storageKey]);

  const clear = useCallback(() => {
    lastSerializedRef.current = '';
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [storageKey]);

  return { restore, clear };
}
