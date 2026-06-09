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
