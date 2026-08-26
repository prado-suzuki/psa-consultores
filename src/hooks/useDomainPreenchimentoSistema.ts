import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  AreaCadastroPreenchimento, ProjetoPreenchimento, OsPreenchimento, ClientePreenchimento,
} from '@/lib/preenchimentoSistema';

const STALE_TIME = 5 * 60 * 1000;

export interface DomainPreenchimentoSistema {
  areasQuery: UseQueryResult<AreaCadastroPreenchimento[]>;
  projetosQuery: UseQueryResult<ProjetoPreenchimento[]>;
  osQuery: UseQueryResult<OsPreenchimento[]>;
  clientesQuery: UseQueryResult<ClientePreenchimento[]>;
}

/**
 * Query dedicada e enxuta do bloco "Preenchimento do sistema" (Estratégico).
 *
 * Deliberadamente SEPARADA de `usePerformanceData`: aquele hook já busca
 * `org_projects`, mas sem `responsible_id`/`equipe_id`/`ordem_servico_id` —
 * inflar a query compartilhada com colunas que só este bloco usa afetaria
 * toda tela que consome `usePerformanceData`. Aqui só as colunas necessárias
 * para medir lacuna de cadastro, nas 4 fontes: `estrutura_areas`,
 * `org_projects`, `ordem_servico`, `cliente`.
 *
 * Cada query falha (e é consumida) de forma INDEPENDENTE — uma fonte fora do
 * ar não pode apagar o que as outras três ainda conseguem medir. As funções
 * puras de `@/lib/preenchimentoSistema` recebem `null` (não array vazio)
 * quando a query falhou, para nunca fabricar um "zero" de elogio indevido.
 */
export function useDomainPreenchimentoSistema(): DomainPreenchimentoSistema {
  const areasQuery = useQuery<AreaCadastroPreenchimento[]>({
    queryKey: ['preenchimento-sistema-areas'],
    staleTime: STALE_TIME,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estrutura_areas')
        .select('id, name, is_active, cost_center_id')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data ?? []) as AreaCadastroPreenchimento[];
    },
  });

  const projetosQuery = useQuery<ProjetoPreenchimento[]>({
    queryKey: ['preenchimento-sistema-projetos'],
    staleTime: STALE_TIME,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_projects')
        .select('id, name, estrutura_area_id, responsible_id, equipe_id, start_date, end_date, ordem_servico_id');
      if (error) throw error;
      return (data ?? []) as ProjetoPreenchimento[];
    },
  });

  // `ordem_servico` não tem coluna `ambiente` (o recorte dev/prod dela vem do
  // cliente, ver AGENTS.md) -- só o soft delete se aplica aqui.
  const osQuery = useQuery<OsPreenchimento[]>({
    queryKey: ['preenchimento-sistema-os'],
    staleTime: STALE_TIME,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordem_servico')
        .select('id, numero_os, data_inicio')
        .eq('excluido', false);
      if (error) throw error;
      return (data ?? []) as OsPreenchimento[];
    },
  });

  // `cliente` tem `ambiente`: 'prod' é a carteira real (dev é cadastro de
  // teste, prefixado `[TESTE] `, com composição diferente -- ver AGENTS.md).
  const clientesQuery = useQuery<ClientePreenchimento[]>({
    queryKey: ['preenchimento-sistema-clientes'],
    staleTime: STALE_TIME,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cliente')
        .select('id, nome, uf, categoria')
        .eq('ambiente', 'prod')
        .eq('excluido', false);
      if (error) throw error;
      return (data ?? []) as ClientePreenchimento[];
    },
  });

  return { areasQuery, projetosQuery, osQuery, clientesQuery };
}
