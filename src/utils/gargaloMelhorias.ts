import type { Gargalo } from '@/types';

/**
 * IDs das melhorias que atacam um gargalo.
 *
 * Fonte de verdade: vínculo N:M `gargalo_melhorias` (hidratado em
 * `g.melhorias`). Mantém fallback para a FK legada `g.melhoria_id` (1:N,
 * deprecada e aposentada na migração 20260609100000) para não quebrar dados
 * antigos que ainda não foram remapeados para o N:M.
 */
export function melhoriaIdsDoGargalo(
  g: Pick<Gargalo, 'melhorias' | 'melhoria_id'>,
): string[] {
  if (g.melhorias && g.melhorias.length > 0) return g.melhorias;
  return g.melhoria_id ? [g.melhoria_id] : [];
}

/**
 * Processos onde o gargalo se manifesta — DERIVADO de `gargalo_etapas`
 * (etapasOrigem → process_id), não da junção `gargalo_processos`.
 *
 * Decisão de arquitetura (2026-06-16): a UI só mantém o vínculo gargalo↔etapa
 * (gargalo_etapas) e gargalo↔melhoria (gargalo_melhorias). A junção macro
 * `gargalo_processos` e o vínculo direto `melhoria_processos` foram aposentados
 * — o processo de um gargalo/melhoria passa a ser SEMPRE derivado da etapa.
 */
export function processoIdsDoGargalo(g: Pick<Gargalo, 'etapasOrigem'>): string[] {
  return [...new Set((g.etapasOrigem ?? []).map(e => e.processo_id).filter((p): p is string => !!p))];
}

/** Gargalos que se manifestam em alguma etapa do processo. */
export function gargalosDoProcesso<T extends Pick<Gargalo, 'etapasOrigem'>>(
  gargalos: T[],
  processoId: string,
): T[] {
  return gargalos.filter(g => processoIdsDoGargalo(g).includes(processoId));
}

/**
 * IDs das melhorias relevantes a um processo: derivadas via gargalo →
 * gargalo está numa etapa do processo (gargalo_etapas) e ataca a melhoria
 * (gargalo_melhorias). Fonte única usada por ROI, SOP e Dashboard.
 */
export function melhoriaIdsDoProcesso(
  gargalos: Array<Pick<Gargalo, 'etapasOrigem' | 'melhorias' | 'melhoria_id'>>,
  processoId: string,
): Set<string> {
  const ids = new Set<string>();
  for (const g of gargalos) {
    if (!processoIdsDoGargalo(g).includes(processoId)) continue;
    for (const mid of melhoriaIdsDoGargalo(g)) ids.add(mid);
  }
  return ids;
}

/**
 * Inverso: processos que uma melhoria atende — derivados via gargalos que ela
 * ataca (gargalo_melhorias) e onde eles se manifestam (gargalo_etapas).
 */
export function processoIdsDaMelhoria(
  melhoriaId: string,
  gargalos: Array<Pick<Gargalo, 'etapasOrigem' | 'melhorias' | 'melhoria_id'>>,
): string[] {
  const ids = new Set<string>();
  for (const g of gargalos) {
    if (!melhoriaIdsDoGargalo(g).includes(melhoriaId)) continue;
    for (const pid of processoIdsDoGargalo(g)) ids.add(pid);
  }
  return [...ids];
}
