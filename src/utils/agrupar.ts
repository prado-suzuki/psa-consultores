// Agrupamento para o organizador das páginas de cadastro (primeiro filtro à esquerda).
// Transforma uma lista em buckets expansíveis segundo a dimensão escolhida.

import type { Opcao } from './clusters';

export interface Grupo<T> {
  key: string;
  titulo: string;
  itens: T[];
}

const SEM_KEY = '__sem__';

/**
 * Agrupa `itens` em buckets. `getKeys` devolve as chaves de cada item — várias
 * quando a relação é M2M (ex.: um gargalo afeta vários processos, aparecendo em
 * cada grupo). Itens sem chave caem no bucket "sem" (`semLabel`).
 *
 * A ordem de saída segue `ordem` (chaves conhecidas, value '' ignorado), depois
 * chaves presentes fora da ordem (ex.: cargo dinâmico) e por fim o bucket "sem".
 */
export function agrupar<T>(
  itens: T[],
  getKeys: (item: T) => string[],
  ordem: Opcao[],
  semLabel: string,
): Grupo<T>[] {
  const map = new Map<string, T[]>();
  const push = (key: string, item: T) => {
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  };
  for (const item of itens) {
    const keys = getKeys(item).filter(Boolean);
    if (keys.length === 0) push(SEM_KEY, item);
    else for (const k of keys) push(k, item);
  }

  const res: Grupo<T>[] = [];
  const usados = new Set<string>();
  for (const o of ordem) {
    if (o.value && map.has(o.value)) {
      res.push({ key: o.value, titulo: o.label, itens: map.get(o.value)! });
      usados.add(o.value);
    }
  }
  for (const [k, v] of map) {
    if (k !== SEM_KEY && !usados.has(k)) res.push({ key: k, titulo: k, itens: v });
  }
  if (map.has(SEM_KEY)) res.push({ key: SEM_KEY, titulo: semLabel, itens: map.get(SEM_KEY)! });
  return res;
}
