import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MelhoriaRoi } from '@/lib/boardExecutivo';

const STALE_TIME = 5 * 60 * 1000;

/**
 * Fonte ÚNICA de economia/ROI das telas gerenciais (Board → Dashboard e
 * Operacional). Antes cada tela tinha sua própria query:
 *
 * - ambas selecionavam `total_savings_monthly`, coluna que NÃO existe em
 *   `process_improvements` — a economia exibida era R$ 0 permanente;
 * - nenhuma filtrava por `evaluation_status`, então melhorias ainda não
 *   avaliadas entrariam na conta assim que a coluna fosse corrigida.
 *
 * Aqui usamos as colunas reais e o mesmo recorte do painel Impacto
 * (`evaluation_status = 'completed'`): só economia JÁ MEDIDA entra no número
 * que a diretoria vê. Assim as três telas contam a mesma história.
 *
 * A queryKey começa com `board-` de propósito: o botão "Atualizar" do painel
 * Operacional invalida tudo que começa com `perf`/`board-`.
 */
export function useDomainMelhoriasRoi() {
  return useQuery<MelhoriaRoi[]>({
    queryKey: ['board-melhorias-roi'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('process_improvements')
        // `cluster_id` entra para o seletor global de cliente do Board poder
        // recortar a economia. Antes ela era necessariamente global: o filtro
        // era por ÁREA e esta tabela nunca teve área, só cluster.
        .select('id, cluster_id, cost_saved_monthly, time_saved_hours, implementation_cost, one_time_external_cost, created_at')
        .eq('evaluation_status', 'completed');

      if (error) throw error;
      return (data ?? []) as MelhoriaRoi[];
    },
    staleTime: STALE_TIME,
  });
}
