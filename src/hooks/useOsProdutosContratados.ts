import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OsProdutoContratado {
  id: string;
  ordem_servico_id: string;
  produto_segmento_id: string;
  produto_codigo?: string;
  produto_nome?: string;
  horas_contratadas?: number;
}

/**
 * Hook centralizado para buscar produtos contratados de uma ou mais OS.
 * Faz JOIN com produto_segmento para obter codigo e nome.
 */
export function useOsProdutosContratados(osIds: string[]) {
  return useQuery({
    queryKey: ['os-produtos-contratados', osIds],
    queryFn: async () => {
      if (osIds.length === 0) return [];
      // os_produtos_contratados não está no schema tipado — cast justificado
      const { data, error } = await (supabase
        .from('os_produtos_contratados' as any) as any)
        .select('id, ordem_servico_id, produto_segmento_id, produto_segmento:produto_segmento(id, codigo, nome)')
        .in('ordem_servico_id', osIds);
      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        ordem_servico_id: row.ordem_servico_id,
        produto_segmento_id: row.produto_segmento_id,
        produto_codigo: row.produto_segmento?.codigo || null,
        produto_nome: row.produto_segmento?.nome || null,
      })) as OsProdutoContratado[];
    },
    enabled: osIds.length > 0,
  });
}

/**
 * Agrupa produtos contratados por ordem_servico_id.
 */
export function groupByOs(produtos: OsProdutoContratado[]): Record<string, OsProdutoContratado[]> {
  const map: Record<string, OsProdutoContratado[]> = {};
  for (const p of produtos) {
    if (!map[p.ordem_servico_id]) map[p.ordem_servico_id] = [];
    map[p.ordem_servico_id].push(p);
  }
  return map;
}
