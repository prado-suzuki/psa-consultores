import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
 * OS abertas (não concluídas nem canceladas) com seus produtos contratados e o
 * nome do cliente.
 *
 * Existe para o seletor de "Criar Projeto" poder mostrar só os clientes que têm
 * OS com produto sem projeto — decisão que depende de todas as OS de uma vez, e
 * não da OS de um cliente já escolhido (useClienteOrdens).
 *
 * O nome do cliente vem junto porque `ordem_servico.id_cliente` NÃO é FK de
 * `cliente` (logo não há embed no PostgREST) e porque a identidade útil aqui é o
 * nome: `get_ordens_by_client_name` casa OS por nome justamente porque o mesmo
 * cliente tem UUIDs diferentes em dev e prod. Agrupar por id esconderia as OS de
 * quem abre o app em preview.
 */
export function useOsAbertasComProdutos(enabled = true) {
  return useQuery({
    queryKey: ['os-abertas-com-produtos'],
    queryFn: async (): Promise<LoteOsAberta[]> => {
      // `os_produtos_contratados` não está no schema tipado (nem o embed a partir
      // de ordem_servico), então o builder é destipado aqui e a forma da linha
      // volta a ser declarada em OsRow logo abaixo — daí os `any` justificados.
      const { data: osRows, error } = await (supabase.from('ordem_servico') as any)
        .select('id, numero_os, id_cliente, situacao, data_inicio, data_fim, observacoes, os_produtos_contratados(produto_segmento_id, produto_segmento(codigo, nome))')
        .eq('excluido', false)
        .in('situacao', OS_SITUACOES_ABERTAS)
        .order('numero_os');
      if (error) throw error;

      // Sem filtro de ambiente de propósito: a OS pode apontar para o UUID do
      // cliente no outro ambiente, e é esse nome que precisamos resolver.
      const { data: clientes, error: clientesError } = await supabase
        .from('cliente')
        .select('id, nome')
        .eq('excluido', false);
      if (clientesError) throw clientesError;

      const nomeById = new Map((clientes || []).map(cliente => [cliente.id, cliente.nome]));

      return ((osRows || []) as OsRow[]).map(row => ({
        id: row.id,
        numero_os: row.numero_os ?? null,
        cliente_id: row.id_cliente,
        cliente_nome: nomeById.get(row.id_cliente) ?? '',
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
