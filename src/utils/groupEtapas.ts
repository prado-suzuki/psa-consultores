import type { Etapa } from '@/types';

/**
 * Agrupa etapas por `process_id`; cada grupo ordenado por `stage_order`
 * (desempate pelo nome). Fonte única do agrupamento usado nas telas/geradores —
 * evita repetir o mesmo `useMemo` de agrupamento em cada página.
 */
export function groupEtapasPorProcesso(etapas: Etapa[]): Map<string, Etapa[]> {
  const map = new Map<string, Etapa[]>();
  for (const e of etapas) {
    const arr = map.get(e.process_id) || [];
    arr.push(e);
    map.set(e.process_id, arr);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => (a.stage_order ?? 0) - (b.stage_order ?? 0) || a.name.localeCompare(b.name));
  }
  return map;
}
