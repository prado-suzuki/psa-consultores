import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { currentAmbiente } from '@/config/api';
import { ambientePorClienteQuery } from '@/hooks/useDomainAmbienteClientes';
import { isDoAmbiente } from '@/lib/ambienteScope';
import { OS_SITUACOES_ABERTAS, type LoteOsAberta } from '@/lib/projetosLote';

/** Forma da linha que o select devolve (o embed não existe no schema tipado). */
interface OsRow {
  id: string;
  numero_os: string | null;
  id_cliente: string;
  situacao: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  observacoes: string | null;
  os_produtos_contratados: Array<{
    produto_segmento_id: string;
    produto_segmento: { codigo: string | null; nome: string | null } | null;
  }> | null;
}

/**
 * OS abertas (não concluídas nem canceladas) do ambiente atual, com seus produtos
 * contratados.
 *
 * Existe para o seletor de "Criar Projeto" poder mostrar só os clientes que têm
 * OS com produto sem projeto — decisão que depende de todas as OS de uma vez, e
 * não da OS de um cliente já escolhido (useClienteOrdens).
 *
 * `ordem_servico` não tem coluna `ambiente`: o ambiente de uma OS é o do cliente
 * que ela referencia (mesma régua de org_projects/org_tasks — ver
 * lib/ambienteScope). Sem esse corte o seletor casava OS por nome de cliente e
 * trazia praticamente todo cliente que tem OS em qualquer ambiente.
 */
export function useOsAbertasComProdutos(enabled = true) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['os-abertas-com-produtos', currentAmbiente],
    queryFn: async (): Promise<LoteOsAberta[]> => {
      const ambientePorCliente = await queryClient.fetchQuery(ambientePorClienteQuery());

      // `os_produtos_contratados` não está no schema tipado (nem o embed a partir
      // de ordem_servico), então o builder é destipado aqui e a forma da linha
      // volta a ser declarada em OsRow logo acima — daí os `any` justificados.
      const { data: osRows, error } = await (supabase.from('ordem_servico') as any)
        .select('id, numero_os, id_cliente, situacao, data_inicio, data_fim, observacoes, os_produtos_contratados(produto_segmento_id, produto_segmento(codigo, nome))')
        .eq('excluido', false)
        .in('situacao', OS_SITUACOES_ABERTAS)
        .order('numero_os');
      if (error) throw error;

      return ((osRows || []) as OsRow[])
        .filter(row => isDoAmbiente(row.id_cliente, ambientePorCliente))
        .map(row => ({
          id: row.id,
          numero_os: row.numero_os ?? null,
          cliente_id: row.id_cliente,
          situacao: row.situacao ?? null,
          data_inicio: row.data_inicio ?? null,
          data_fim: row.data_fim ?? null,
          observacoes: row.observacoes ?? null,
          produtos: (row.os_produtos_contratados || []).map(produto => ({
            produto_segmento_id: produto.produto_segmento_id,
            produto_codigo: produto.produto_segmento?.codigo ?? null,
            produto_nome: produto.produto_segmento?.nome ?? null,
          })),
        }));
    },
    enabled,
  });
}
