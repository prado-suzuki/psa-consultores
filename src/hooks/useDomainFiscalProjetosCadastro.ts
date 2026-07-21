import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProdutoServicoRow {
  servico_prestado_id: string;
  servico: { id: string; nome: string } | null;
}

export function useDomainFiscalProjetosCadastro(selectedProdutoId: string | null) {
  const servicosByProdutoQuery = useQuery({
    queryKey: ['project-servicos-by-produto', selectedProdutoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produto_servico')
        .select('servico_prestado_id, servico:servicos_prestados(id, nome)')
        .eq('produto_segmento_id', selectedProdutoId!) as {
          data: ProdutoServicoRow[] | null;
          error: unknown;
        };
      if (error) throw error;
      return (data || [])
        .map(r => r.servico)
        .filter((servico): servico is { id: string; nome: string } => !!servico);
    },
    enabled: !!selectedProdutoId,
  });

  const resolveProdutoIdByServico = useCallback(
    async (servicoId: string, produtoIds: string[]) => {
      const { data } = await supabase
        .from('produto_servico')
        .select('produto_segmento_id')
        .eq('servico_prestado_id', servicoId)
        .in('produto_segmento_id', produtoIds)
        .limit(1);

      return data?.[0]?.produto_segmento_id ?? null;
    },
    [],
  );

  return { servicosByProdutoQuery, resolveProdutoIdByServico };
}
