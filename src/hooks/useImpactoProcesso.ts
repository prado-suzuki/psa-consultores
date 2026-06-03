// "Se o processo X mudar, o que é afetado?" — BFS jusante/montante.
// Read-only. Calcula o impacto no client a partir dos dados já no Supabase,
// usando o motor de cascata em TypeScript (src/utils/cascataEngine.ts).

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { deriveCascadeGraph, deriveImpact } from '@/utils/cascataEngine';
import type { Documento, Etapa, Processo } from '@/types';

export type { ImpactoNode, ImpactoProcesso } from '@/utils/cascataEngine';

export function useImpactoProcesso(
  processoId: string | undefined,
  cluster?: string,
): UseQueryResult<import('@/utils/cascataEngine').ImpactoProcesso> {
  return useQuery({
    queryKey: ['impacto-processo', processoId, cluster],
    enabled: !!processoId,
    queryFn: async () => {
      if (!processoId) return { jusante: [], montante: [] };
      const [procs, ets, docs] = await Promise.all([
        supabase.from('processes').select('*'),
        supabase.from('process_stages').select('*'),
        supabase.from('documentos_processo').select('*'),
      ]);
      if (procs.error) throw new Error(procs.error.message);
      if (ets.error)   throw new Error(ets.error.message);
      if (docs.error)  throw new Error(docs.error.message);

      const grafo = deriveCascadeGraph({
        processos: (procs.data ?? []) as unknown as Processo[],
        etapas:    (ets.data ?? [])   as unknown as Etapa[],
        documentos:(docs.data ?? [])  as unknown as Documento[],
      }, { cluster });

      return deriveImpact(grafo, processoId);
    },
  });
}
