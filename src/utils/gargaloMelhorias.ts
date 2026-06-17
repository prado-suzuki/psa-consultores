import type { Gargalo, Melhoria } from '@/types';

/**
 * Processos onde o gargalo se manifesta.
 *
 * Decisão de arquitetura (2026-06): o GRÃO de gargalos e melhorias é o
 * PROCESSO. O gargalo aponta diretamente os processos via `gargalo_processos`
 * (hidratado em `g.processos`); o vínculo por etapa (`gargalo_etapas`) foi
 * aposentado como grão. A melhoria aponta diretamente os processos via
 * `melhoria_processos` (hidratado em `m.processos`) — independente de gargalo.
 */
export function processoIdsDoGargalo(g: Pick<Gargalo, 'processos'>): string[] {
  return [...new Set((g.processos ?? []).filter((p): p is string => !!p))];
}

/** Gargalos vinculados ao processo. */
export function gargalosDoProcesso<T extends Pick<Gargalo, 'processos'>>(
  gargalos: T[],
  processoId: string,
): T[] {
  return gargalos.filter(g => processoIdsDoGargalo(g).includes(processoId));
}

/** Melhorias vinculadas ao processo (grão direto via melhoria_processos). */
export function melhoriasDoProcesso<T extends Pick<Melhoria, 'processos'>>(
  melhorias: T[],
  processoId: string,
): T[] {
  return melhorias.filter(m => (m.processos ?? []).includes(processoId));
}

/**
 * IDs das melhorias relevantes a um processo — vínculo DIRETO
 * (`melhoria_processos`). Fonte única usada por ROI, SOP e Dashboard.
 */
export function melhoriaIdsDoProcesso(
  melhorias: Array<Pick<Melhoria, 'id' | 'processos'>>,
  processoId: string,
): Set<string> {
  const ids = new Set<string>();
  for (const m of melhorias) {
    if ((m.processos ?? []).includes(processoId)) ids.add(m.id);
  }
  return ids;
}

/** Processos que uma melhoria atende (vínculo direto). */
export function processoIdsDaMelhoria(m: Pick<Melhoria, 'processos'>): string[] {
  return [...new Set((m.processos ?? []).filter((p): p is string => !!p))];
}

/**
 * Melhorias relacionadas a um gargalo POR ASSOCIAÇÃO AO PROCESSO.
 *
 * NÃO existe vínculo direto gargalo↔melhoria (a tabela `gargalo_melhorias` foi
 * aposentada do modelo). A relação é implícita: uma melhoria "se relaciona" com
 * um gargalo quando ambos atuam no(s) mesmo(s) processo(s).
 */
export function melhoriasRelacionadasAoGargalo<T extends Pick<Melhoria, 'processos'>>(
  g: Pick<Gargalo, 'processos'>,
  melhorias: T[],
): T[] {
  const procs = new Set(processoIdsDoGargalo(g));
  if (procs.size === 0) return [];
  return melhorias.filter(m => (m.processos ?? []).some(pid => procs.has(pid)));
}
