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
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Save with debounce
  useEffect(() => {
    if (!enabled) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      try {
        sessionStorage.setItem(key, serialize(values));
      } catch {
        // quota exceeded – silently ignore
      }
    }, 500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [key, values, enabled]);

  const restore = useCallback((): T | null => {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      return deserialize(raw) as T | null;
    } catch {
      return null;
    }
  }, [key]);

  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // ignore
    }
  }, [key]);

  return { restore, clear };
}
