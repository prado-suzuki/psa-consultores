// Hook de leitura de public.estrutura_clusters — fonte de verdade dos
// clusters/empresas do portfólio. Usado por dropdowns (filtros e formulários)
// no MAPA pra substituir a antiga lista hardcoded em src/utils/clusters.ts.

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Cluster {
  id: string;
  nome: string;
  ativo: boolean;
}

type DbRow = { id: string; name: string; is_active: boolean };

export function useClusters(): UseQueryResult<Cluster[]> {
  return useQuery<Cluster[]>({
    queryKey: ['estrutura_clusters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estrutura_clusters')
        .select('id, name, is_active')
        .order('name');
      if (error) throw new Error(error.message);
      return ((data ?? []) as DbRow[]).map(r => ({
        id:    r.id,
        nome:  r.name,
        ativo: r.is_active,
      }));
    },
  });
}

/** Apenas clusters ativos — versão útil pra dropdowns de cadastro. */
export function useClustersAtivos(): UseQueryResult<Cluster[]> {
  const q = useClusters();
  return {
    ...q,
    data: q.data?.filter(c => c.ativo),
  } as UseQueryResult<Cluster[]>;
}

/**
 * Opções pra <select> de filtro (inclui "Todos os clusters" como primeiro).
 * Inativos aparecem no fim (caso o usuário precise filtrar legado).
 */
export function useClusterFiltroOpcoes(): { value: string; label: string }[] {
  const { data = [] } = useClusters();
  return useMemo(() => {
    const ativos = data.filter(c => c.ativo);
    const inativos = data.filter(c => !c.ativo);
    return [
      { value: '', label: 'Todos os clusters' },
      ...ativos.map(c => ({ value: c.id, label: c.nome })),
      ...inativos.map(c => ({ value: c.id, label: `${c.nome} (inativo)` })),
    ];
  }, [data]);
}

/**
 * Opções pra <select> de cadastro (inclui "— (sem cluster)" como primeiro).
 * Só clusters ativos — não faz sentido vincular legado num cadastro novo.
 */
export function useClusterCadastroOpcoes(): { value: string; label: string }[] {
  const { data = [] } = useClusters();
  return useMemo(
    () => [
      { value: '', label: '— (sem cluster)' },
      ...data.filter(c => c.ativo).map(c => ({ value: c.id, label: c.nome })),
    ],
    [data],
  );
}
