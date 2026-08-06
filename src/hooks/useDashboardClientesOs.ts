import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Ambiente } from '@/config/api';
import {
  buildClienteRows,
  buildOsRows,
  buildProjetoRows,
  buildRateioPorOs,
  buildRateioProdutoPorOs,
} from '@/lib/dashboardClientesOs/aggregations';
import type {
  RawCliente,
  RawOrdemServico,
  RawOrgProject,
  RawOrgTask,
  RawClienteCluster,
  RawEstruturaCluster,
  RawEstruturaArea,
  RawEstruturaEquipe,
  RawServico,
  RawProfile,
  RawSetorRegiao,
  RawDistribuicaoReceita,
  RawCentroCusto,
  RawOsProduto,
  RawProdutoSegmento,
  ClienteRow,
  OsRow,
  ProjetoRow,
  FatiaRateio,
} from '@/lib/dashboardClientesOs/types';

/**
 * Hook do dashboard nativo "Clientes e OS".
 *
 * Reproduz ao vivo, a partir do Supabase, as 3 views do BigQuery que hoje
 * alimentam o iframe do Looker. Toda a lógica de agregação vive em funções
 * puras (`@/lib/dashboardClientesOs/aggregations`) — aqui só buscamos as
 * tabelas-fonte e montamos as linhas.
 *
 * Regras de leitura (CLAUDE.md): `.eq('excluido', false)` sempre; `.eq('ambiente')`
 * só onde a coluna existe — apenas `cliente` tem `ambiente`. `ordem_servico`,
 * `org_projects`, `org_tasks` não têm: o escopo de ambiente vem do INNER/LEFT
 * JOIN com os clientes já filtrados (igual às views do BQ).
 */
interface RawBundle {
  clientes: RawCliente[];
  os: RawOrdemServico[];
  projetos: RawOrgProject[];
  tasks: RawOrgTask[];
  clienteClusters: RawClienteCluster[];
  estruturaClusters: RawEstruturaCluster[];
  servicos: RawServico[];
  areas: RawEstruturaArea[];
  equipes: RawEstruturaEquipe[];
  profiles: RawProfile[];
  setorRegiao: RawSetorRegiao[];
  distribuicaoReceita: RawDistribuicaoReceita[];
  centrosCusto: RawCentroCusto[];
  osProdutos: RawOsProduto[];
  produtos: RawProdutoSegmento[];
}

export interface DashboardClientesOsData {
  clienteRows: ClienteRow[];
  osRows: OsRow[];
  projetoRows: ProjetoRow[];
  /** Rateio da receita por OS (chave = os_id) para a visão por centro de custo. */
  rateioPorOs: Map<string, FatiaRateio[]>;
  /** Idem para a visão por produto (dividido pelas horas contratadas). */
  rateioProdutoPorOs: Map<string, FatiaRateio[]>;
}

function unwrap<T>(res: { data: unknown; error: { message?: string } | null }, label: string): T[] {
  if (res.error) {
    throw new Error(`Falha ao carregar ${label}: ${res.error.message ?? 'erro desconhecido'}`);
  }
  return (res.data ?? []) as T[];
}

export function useDashboardClientesOs(ambiente: Ambiente) {
  // "Hoje" no fuso America/Sao_Paulo (as views usam CURRENT_DATE('America/Sao_Paulo')).
  const hoje = useMemo(
    () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }),
    [],
  );

  const query = useQuery<RawBundle>({
    queryKey: ['dashboard-clientes-os', ambiente],
    staleTime: 60_000,
    queryFn: async () => {
      const [
        cliRes, osRes, projRes, taskRes, ccRes, ecRes, servRes, areaRes, eqRes, profRes, srRes,
        drRes, cCustoRes, osProdRes, prodRes,
      ] = await Promise.all([
        supabase
          .from('cliente')
          .select('id, nome, fixo, categoria, ativo, uf, created_at')
          .eq('excluido', false)
          .eq('ambiente', ambiente),
        supabase
          .from('ordem_servico')
          .select('id, numero_os, id_cliente, id_servico, cluster_id, situacao, data_emissao, data_inicio, data_fim, valor_projeto')
          .eq('excluido', false),
        supabase
          .from('org_projects')
          .select('id, name, status, external_client_id, ordem_servico_id, estrutura_area_id, equipe_id, responsible_id'),
        supabase
          .from('org_tasks')
          .select('project_id, parent_task_id, estimated_hours, status'),
        supabase.from('cliente_clusters').select('cliente_id, cluster_id, created_at'),
        supabase.from('estrutura_clusters').select('id, name, is_active'),
        supabase.from('servicos_prestados').select('id, nome'),
        supabase.from('estrutura_areas').select('id, name, cluster_id'),
        supabase.from('estrutura_equipes').select('id, name'),
        supabase.from('profiles').select('id, first_name, last_name'),
        // View (não tipada no `from` gerado) — segue o padrão de useGestaoClientes.
        (supabase.from('cliente_setor_regiao_atual' as never) as never as {
          select: (c: string) => Promise<{ data: unknown; error: { message?: string } | null }>;
        }).select('id_cliente, setor_cliente, regiao'),
        supabase
          .from('distribuicao_receita')
          .select('id_ordem_servico, id_centro_custo, percentual_rateio')
          .eq('excluido', false),
        supabase.from('centros_custo').select('id, codigo, nome'),
        supabase
          .from('os_produtos_contratados')
          .select('ordem_servico_id, produto_segmento_id, horas_contratadas'),
        supabase.from('produto_segmento').select('id, codigo, nome'),
      ]);

      return {
        clientes: unwrap<RawCliente>(cliRes, 'clientes'),
        os: unwrap<RawOrdemServico>(osRes, 'ordens de serviço'),
        projetos: unwrap<RawOrgProject>(projRes, 'projetos'),
        tasks: unwrap<RawOrgTask>(taskRes, 'tarefas'),
        clienteClusters: unwrap<RawClienteCluster>(ccRes, 'vínculos de cluster'),
        estruturaClusters: unwrap<RawEstruturaCluster>(ecRes, 'clusters'),
        servicos: unwrap<RawServico>(servRes, 'serviços prestados'),
        areas: unwrap<RawEstruturaArea>(areaRes, 'áreas'),
        equipes: unwrap<RawEstruturaEquipe>(eqRes, 'equipes'),
        profiles: unwrap<RawProfile>(profRes, 'perfis'),
        setorRegiao: unwrap<RawSetorRegiao>(srRes, 'setor/região'),
        distribuicaoReceita: unwrap<RawDistribuicaoReceita>(drRes, 'rateio de receita'),
        centrosCusto: unwrap<RawCentroCusto>(cCustoRes, 'centros de custo'),
        osProdutos: unwrap<RawOsProduto>(osProdRes, 'produtos das OS'),
        produtos: unwrap<RawProdutoSegmento>(prodRes, 'produtos/segmentos'),
      };
    },
  });

  const data = useMemo<DashboardClientesOsData | null>(() => {
    const b = query.data;
    if (!b) return null;
    return {
      clienteRows: buildClienteRows({
        clientes: b.clientes,
        os: b.os,
        clienteClusters: b.clienteClusters,
        estruturaClusters: b.estruturaClusters,
        setorRegiao: b.setorRegiao,
        hoje,
      }),
      osRows: buildOsRows({
        os: b.os,
        clientes: b.clientes,
        clienteClusters: b.clienteClusters,
        estruturaClusters: b.estruturaClusters,
        servicos: b.servicos,
        hoje,
      }),
      projetoRows: buildProjetoRows({
        projetos: b.projetos,
        clientes: b.clientes,
        os: b.os,
        tasks: b.tasks,
        clienteClusters: b.clienteClusters,
        estruturaClusters: b.estruturaClusters,
        areas: b.areas,
        equipes: b.equipes,
        profiles: b.profiles,
      }),
      rateioPorOs: buildRateioPorOs(b.distribuicaoReceita, b.centrosCusto),
      rateioProdutoPorOs: buildRateioProdutoPorOs(b.osProdutos, b.produtos),
    };
  }, [query.data, hoje]);

  return { data, isLoading: query.isLoading, error: query.error as Error | null, hoje };
}
