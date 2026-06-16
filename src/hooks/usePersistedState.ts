// useState que persiste o valor em localStorage. Usado para filtros por página
// no Digital Rotina — lembra a última escolha do usuário entre navegações/reloads
// sem nenhum contexto global. A chave deve ser única por página/filtro
// (ex.: 'rotina.projetos.cluster').

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

export function usePersistedState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* localStorage indisponível (modo privado/quota) — ignora, mantém em memória. */
    }
  }, [key, value]);

  return [value, setValue];
}
