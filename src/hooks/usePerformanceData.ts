import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { subDays, startOfDay, differenceInDays, parseISO, isBefore, subMonths, startOfMonth } from 'date-fns';
import { useMemo } from 'react';
import { normalizarMembrosEquipe, type MembroEquipeBruto } from '@/lib/performanceOperacional';
import {
  construirMapaDeClusters,
  type AreaComCluster, type BoardAreaKey, type ClusterBasico,
} from '@/lib/boardExecutivo';

// ── helpers ──
function getPeriodDays(periodo: string) {
  if (periodo === '7d') return 7;
  if (periodo === '30d') return 30;
  if (periodo === '90d') return 90;
  return 30;
}

function getStableDateRange(periodo: string, cicloInicio?: string, cicloFim?: string) {
  if (periodo === 'ciclo' && cicloInicio && cicloFim) {
    return { from: cicloInicio, to: cicloFim };
  }
  const days = getPeriodDays(periodo);
  const from = startOfDay(subDays(new Date(), days)).toISOString();
  // Snap "to" to end-of-current-minute to avoid unstable keys
  const now = new Date();
  now.setSeconds(0, 0);
  const to = now.toISOString();
  return { from, to };
}

const STABLE_STALE = 5 * 60 * 1000; // 5 min for stable queries

// ── Types ──
export interface PerformanceProject {
  id: string;
  name: string;
  client_name: string | null;
  area_name: string | null;
  /** Bucket do painel resolvido por CLUSTER (área → equipe → cliente). */
  area_key: BoardAreaKey | null;
  area_color: string | null;
  responsible_name: string | null;
  responsible_id: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  total_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  computed_status: 'em_dia' | 'em_risco' | 'atrasado';
}

// ── Main hook ──
/**
 * Snapshot do painel Operacional / Visão Executiva.
 *
 * Este hook devolve SEMPRE o conjunto completo: o recorte por área é do
 * consumidor (`filtrarPorArea` / `filtrarTarefasPorArea`, memoizados na tela).
 * Motivo: a resposta HTTP é idêntica para qualquer área — o recorte era
 * client-side — então `area` na queryKey só criava até 4 entradas de cache com o
 * mesmo payload e refazia o download inteiro de `org_tasks` a cada troca de
 * área. O 2º parâmetro sobrevive apenas por compatibilidade de chamada e é
 * IGNORADO.
 */
export const usePerformanceData = (periodo: string, _areaIgnorada?: string) => {
  const { user } = useAuth();

  // Preferences
  const prefsQuery = useQuery({
    queryKey: ['perf-prefs', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('performance_preferencias' as any)
        .select('*')
        .eq('usuario_id', user.id)
        .maybeSingle();
      return data as any;
    },
    enabled: !!user?.id,
    staleTime: STABLE_STALE,
  });

  // Active cycle
  const cicloQuery = useQuery({
    queryKey: ['perf-ciclo-ativo'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ciclos_avaliacao')
        .select('*')
        .eq('status', 'em_andamento')
        .limit(1)
        .maybeSingle();
      return data;
    },
    staleTime: STABLE_STALE,
  });

  const ciclo = cicloQuery.data;
  const { from: periodFrom, to: periodTo } = useMemo(
    () => getStableDateRange(periodo, ciclo?.data_inicio, ciclo?.data_fim),
    [periodo, ciclo?.data_inicio, ciclo?.data_fim]
  );

  // Projects + tasks + members — PARALLELIZED
  // queryKey sem `area` (recorte é client-side, no consumidor) e sem
  // `periodFrom` (nunca foi usado no queryFn: `computed_status` compara com
  // `new Date()`). Uma entrada de cache só, compartilhada pelas duas telas.
  const projectsQuery = useQuery({
    queryKey: ['perf-projects'],
    queryFn: async () => {
      // Fire all 3 queries in parallel
      const [
        projectsRes, tasksRes, membersRes, areasRes, clustersRes, clienteClustersRes,
      ] = await Promise.all([
        // `is_active` NÃO existe em org_projects (sobra da época de
        // `tax_projects`): o PostgREST devolvia 42703, o erro subia na linha
        // abaixo e o painel mostrava ZERO projetos para todo mundo, inclusive
        // admin. "Ativo" aqui é o mesmo recorte de `useOrgProjects` (:189).
        // `estrutura_area_id` é OPCIONAL no cadastro (não entra em
        // `validateProjectForm`) e só é preenchido quando a equipe escolhida tem
        // área — projeto antigo fica NULL e cai em "Outros". `equipe_id`, esse
        // sim, é obrigatório, então a equipe é o caminho de recuperação: mesma
        // regra que `ProjectDetailsDialog` já usa (área da equipe ?? do projeto).
        (supabase.from('org_projects') as any).select(`
          id, name, status, start_date, end_date,
          external_client_id,
          estrutura_area_id, equipe_id,
          cliente:cliente!org_projects_external_client_id_fkey(nome),
          area:estrutura_areas!org_projects_estrutura_area_id_fkey(name, color, cluster_id),
          equipe_ref:estrutura_equipes!org_projects_equipe_id_fkey(id, name, area_id)
        `).in('status', ['active', 'planned']),
        // ATENÇÃO: sem `.limit()` e sem paginação. O PostgREST corta em 1000
        // linhas por padrão — passando disso os números param de crescer EM
        // SILÊNCIO (progresso e pontualidade ficariam calculados sobre uma
        // fatia). Paginar é tarefa separada, deliberadamente fora desta rodada.
        supabase.from('org_tasks').select('id, status, due_date, project_id, assigned_to, updated_at'),
        supabase.from('org_project_members').select('project_id, user_id'),
        // ── Base da classificação: CLUSTER ──────────────────────────────
        // O sistema inteiro é organizado por cluster; área é opcional e fica
        // NULL em boa parte dos projetos, o que jogava tudo em "Outros".
        // `estrutura_areas.page_categories` é o de-para canônico cluster↔área
        // do painel (mesma fonte de `useClusterIdByPageCategory`).
        supabase.from('estrutura_areas').select('id, name, cluster_id, page_categories'),
        supabase.from('estrutura_clusters').select('id, name'),
        // Todo projeto tem cliente (obrigatório no cadastro) e todo cliente tem
        // cluster — é o caminho que resolve o projeto sem área nem equipe.
        supabase.from('cliente_clusters').select('cliente_id, cluster_id'),
      ]);

      // Os três erros sobem. Antes só o de `org_projects` era tratado: quando
      // `org_tasks` falhava, todo projeto ficava com 0 tarefas →
      // `completionRatio = 1` → TODO projeto virava "em dia" e a Taxa
      // Pontualidade inflava para 100%. Número fabricado é pior que erro.
      if (projectsRes.error) throw projectsRes.error;
      if (tasksRes.error) throw tasksRes.error;
      if (membersRes.error) throw membersRes.error;
      // As 3 fontes de CLASSIFICAÇÃO são auxiliares: se falharem (RLS, coluna,
      // rede), o projeto continua aparecendo e volta a ser classificado pelo
      // NOME da área (`bucketDoItem` cai em `classificarArea`). Derrubar o
      // painel inteiro por causa do rótulo seria pior que o rótulo impreciso —
      // ao contrário de projetos/tarefas, onde o erro vira número fabricado.
      if (areasRes.error) console.warn('[perf] estrutura_areas indisponível — classificação cai no nome da área', areasRes.error);
      if (clustersRes.error) console.warn('[perf] estrutura_clusters indisponível', clustersRes.error);
      if (clienteClustersRes.error) console.warn('[perf] cliente_clusters indisponível — projeto sem área não resolve pelo cliente', clienteClustersRes.error);

      const projects = projectsRes.data || [];
      const allTasks = tasksRes.data || [];
      const allMembers = membersRes.data || [];

      const areas = (areasRes.data || []) as AreaComCluster[];
      const { bucketDoCluster } = construirMapaDeClusters({
        areas,
        clusters: (clustersRes.data || []) as ClusterBasico[],
      });
      // Resolvemos área→cluster por este mapa em vez de join aninhado no
      // PostgREST: `estrutura_areas` apareceria duas vezes no mesmo select
      // (direto e via equipe) e a query inteira falhava.
      const areaPorId = new Map(areas.map((a) => [a.id, a]));
      const clusterPorCliente = new Map<string, string>();
      for (const linha of (clienteClustersRes.data || []) as { cliente_id: string; cluster_id: string | null }[]) {
        if (linha.cliente_id && linha.cluster_id && !clusterPorCliente.has(linha.cliente_id)) {
          clusterPorCliente.set(linha.cliente_id, linha.cluster_id);
        }
      }
      const projectIds = new Set(projects.map((p: any) => p.id));

      // Filter tasks/members to only relevant projects client-side
      const tasks = allTasks.filter((t: any) => projectIds.has(t.project_id));
      const members = allMembers.filter((m: any) => projectIds.has(m.project_id));

      const now = new Date();

      // Sem recorte por área aqui: a lista COMPLETA é necessária para
      // classificar tarefa→projeto→área (senão as tarefas das outras áreas caem
      // no bucket "Outros" e o gráfico inventa uma área gigante). O recorte
      // visual é do consumidor, via `filtrarPorArea` de `@/lib/boardExecutivo`.
      const enriched: PerformanceProject[] = projects.map((p: any) => {
        const pTasks = tasks.filter((t: any) => t.project_id === p.id);
        const total = pTasks.length;
        const completed = pTasks.filter((t: any) => t.status === 'done').length;
        const overdue = pTasks.filter((t: any) =>
          t.due_date && isBefore(parseISO(t.due_date), now) && t.status !== 'done'
        ).length;

        const overdueRatio = total > 0 ? overdue / total : 0;
        const completionRatio = total > 0 ? completed / total : 1;
        const endDate = p.end_date ? parseISO(p.end_date) : null;
        const daysLeft = endDate ? differenceInDays(endDate, now) : 999;

        let computedStatus: 'em_dia' | 'em_risco' | 'atrasado' = 'em_dia';
        if ((endDate && isBefore(endDate, now)) || overdueRatio > 0.4) {
          computedStatus = 'atrasado';
        } else if (overdueRatio > 0.2 || (daysLeft < 15 && completionRatio < 0.7)) {
          computedStatus = 'em_risco';
        }

        const projectMembers = members.filter((m: any) => m.project_id === p.id);
        const responsible = projectMembers[0];

        // Cadeia de resolução, do mais específico ao mais confiável:
        // 1) área do projeto → cluster;  2) área da equipe → cluster;
        // 3) cluster do CLIENTE — todo projeto tem cliente e todo cliente tem
        //    cluster, então é aqui que os projetos sem área param de cair em
        //    "Outros". `area_key` tem precedência sobre o nome na classificação.
        const areaDaEquipe = p.equipe_ref?.area_id ? areaPorId.get(p.equipe_ref.area_id) : undefined;
        const clusterDoProjeto = p.area?.cluster_id
          ?? areaDaEquipe?.cluster_id
          ?? (p.external_client_id ? clusterPorCliente.get(p.external_client_id) : undefined)
          ?? null;
        const areaKey = clusterDoProjeto ? bucketDoCluster.get(clusterDoProjeto) ?? null : null;

        return {
          id: p.id,
          name: p.name,
          client_name: p.cliente?.nome || null,
          area_name: p.area?.name || areaDaEquipe?.name || null,
          area_key: areaKey,
          area_color: p.area?.color || null,
          responsible_name: null, // resolved separately if needed
          responsible_id: responsible?.user_id || null,
          start_date: p.start_date,
          end_date: p.end_date,
          status: p.status,
          total_tasks: total,
          completed_tasks: completed,
          overdue_tasks: overdue,
          computed_status: computedStatus,
        };
      });

      return enriched;
    },
    staleTime: STABLE_STALE,
  });

  // Query de `tickets` removida: baixava a tabela inteira a cada visita ao
  // painel e o resultado era desestruturado sem NENHUM uso na tela.

  // Active members — vínculo pessoa → equipe → área, base do recorte por área
  // dos KPIs de pessoas (Contribuição Individual e Metas do Ciclo).
  const membersQuery = useQuery({
    queryKey: ['perf-members'],
    queryFn: async () => {
      const [membersRes, profilesRes] = await Promise.all([
        supabase.from('estrutura_equipe_membros').select(`
          user_id,
          equipe:estrutura_equipes!estrutura_equipe_membros_equipe_id_fkey(
            area:estrutura_areas!estrutura_equipes_area_id_fkey(name, page_categories)
          )
        `),
        supabase.from('profiles_safe' as any).select('id, first_name, last_name'),
      ]);

      if (membersRes.error) throw membersRes.error;
      if (profilesRes.error) throw profilesRes.error;

      return {
        // Uma linha por vínculo (a contagem de "membros ativos" não muda),
        // achatada em `{ user_id, area_name }`.
        members: normalizarMembrosEquipe((membersRes.data || []) as unknown as MembroEquipeBruto[]),
        profiles: profilesRes.data || [],
      };
    },
    staleTime: STABLE_STALE,
  });

  // Metas do ciclo ativo
  const metasQuery = useQuery({
    queryKey: ['perf-metas', ciclo?.id],
    queryFn: async () => {
      if (!ciclo?.id) return [];
      const { data, error } = await supabase
        .from('metas')
        .select('*')
        .eq('ciclo_id', ciclo.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!ciclo?.id,
  });

  // Tasks with period filter for individual contribution.
  // As três queries de `org_tasks` abaixo também NÃO têm `.limit()` — mesmo
  // aviso do teto de 1000 linhas do PostgREST. E o erro agora sobe: silenciar a
  // falha fazia a tela dizer "sem dados" quando o certo é "falhou".
  const periodTasksQuery = useQuery({
    queryKey: ['perf-period-tasks', periodFrom, periodTo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_tasks')
        .select('id, status, due_date, assigned_to, updated_at, project_id')
        .gte('updated_at', periodFrom)
        .lte('updated_at', periodTo);
      if (error) throw error;
      return data || [];
    },
  });

  // Heatmap tasks — fixed 90-day window independent of global period
  const heatmap90From = startOfDay(subDays(new Date(), 90)).toISOString();
  const heatmapTasksQuery = useQuery({
    queryKey: ['perf-heatmap-tasks', heatmap90From],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_tasks')
        .select('id, status, due_date, assigned_to, updated_at, project_id')
        .gte('updated_at', heatmap90From);
      if (error) throw error;
      return data || [];
    },
  });

  // Last 3 months tasks — fixed window for area comparison chart
  const last3MonthsFrom = startOfMonth(subMonths(new Date(), 2)).toISOString();
  const last3MonthsTasksQuery = useQuery({
    queryKey: ['perf-last3months-tasks', last3MonthsFrom],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_tasks')
        .select('id, status, due_date, assigned_to, updated_at, project_id')
        .gte('updated_at', last3MonthsFrom);
      if (error) throw error;
      return data || [];
    },
  });

  // Economia/ROI: removido daqui. Este hook buscava `process_improvements`
  // com `select('*')` e o consumidor somava `total_savings_monthly` — coluna
  // que não existe no schema (economia sempre R$ 0). A fonte única passou a ser
  // `useDomainMelhoriasRoi`, compartilhada com o Board → Dashboard.

  // `cicloQuery` NÃO é exportada: só serve para resolver o range do período
  // ('ciclo'). Era desestruturada na tela e nunca usada.
  return {
    prefsQuery,
    projectsQuery,
    membersQuery,
    metasQuery,
    periodTasksQuery,
    heatmapTasksQuery,
    last3MonthsTasksQuery,
    periodFrom,
    periodTo,
  };
};

// ── Save preferences ──
export const useSavePerformancePrefs = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prefs: { periodo_padrao?: string; area_padrao?: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data, error } = await (supabase.from('performance_preferencias' as any) as any)
        .upsert({
          usuario_id: user.id,
          ...prefs,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'usuario_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perf-prefs'] });
    },
  });
};
