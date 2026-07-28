import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/supabasePagination';
import {
  STATUS_ENTREGAVEL_CONCLUIDO,
  type EntradaDigital,
  type EntregavelDigital,
  type EquipeAreaDigital,
  type JanelaDigital,
  type ProjetoDigital,
  type SprintDigital,
} from '@/lib/trabalhoDigital';

const STALE_TIME = 5 * 60 * 1000;

/**
 * Snapshot do trabalho da área Digital, que NÃO vive em `org_projects`/`org_tasks`
 * (fonte do resumo atual do Board) mas em `sprint_deliverables` + na tabela
 * ANTIGA `projects`. As funções puras que resumem isto estão em
 * `@/lib/trabalhoDigital` — inclusive a regra de atribuição de área e seus
 * furos, documentados no cabeçalho de lá.
 *
 * A queryKey começa com `board-` de propósito: o botão "Atualizar" invalida por
 * predicate os prefixos `perf`/`board-`
 * (`src/pages/gerencial/performance/PerformanceDashboard.tsx:75`). Uma chave com
 * outro prefixo ficaria fora do refresh e a linha da Digital envelheceria
 * calada.
 *
 * ─── AVISO DE RLS (leia antes de confiar no número) ───────────────────────
 * `sprint_deliverables_select` é `USING (public.sprint_visivel(sprint_id))`
 * (`supabase/migrations/20260709180727_9973ff63-9efd-4321-9f17-5891ce479a9e.sql:62`).
 * `sprint_visivel` (mesmo arquivo, :14-27) permite: `has_role(admin)` OU
 * `is_membro_digital(uid)` OU sprint cujo `projects.cluster_id` esteja em
 * `resolve_user_cluster_ids(uid)`. NÃO há piso de papel: um `lider` que não é da
 * área Digital e não tem vínculo em `estrutura_*` lê ZERO linhas — e a linha
 * "Digital" apareceria zerada em vez de erro. Por isso o hook devolve
 * `podeLerEntregaveis`/`podeLerProjetos`: a tela DEVE distinguir "não há dado"
 * de "você não pode ver o dado". Os erros do PostgREST são lançados (`throw`),
 * nunca trocados por `[]`.
 */
export interface UseDomainTrabalhoDigitalOptions {
  /** Janela de análise. Vem do MESMO filtro de Período da tela. */
  janela: JanelaDigital;
  enabled?: boolean;
}

export interface TrabalhoDigitalSnapshot extends Omit<EntradaDigital, 'janela'> {
  /** `false` = o usuário não enxerga NENHUM entregável (RLS), não que não exista. */
  podeLerEntregaveis: boolean;
  /** `false` = `rls_projects_select` barrou tudo — sem projeto não há área. */
  podeLerProjetos: boolean;
  /** `true` = bateu no teto de páginas: o resumo está sobre uma FATIA. */
  entregaveisTruncados: boolean;
}

type EquipeComArea = {
  id: string;
  area: { name: string | null } | null;
};

/**
 * Uma query só (um `queryFn`) porque os 4 selects são inseparáveis: sem
 * `projects` + `estrutura_equipes` não existe área, e sem área o entregável não
 * tem onde cair. Meia resposta aqui é pior do que nenhuma.
 */
export function useDomainTrabalhoDigital({
  janela,
  enabled = true,
}: UseDomainTrabalhoDigitalOptions) {
  const snapshotQuery = useQuery<TrabalhoDigitalSnapshot>({
    // Janela na chave: sem ela o cache de um período serviria outro.
    queryKey: ['board-trabalho-digital', janela.desdeISO, janela.ateISO],
    queryFn: async () => {
      const [entregaveis, projetosRes, sprintsRes, equipesRes] = await Promise.all([
        // `sprint_deliverables` é lida inteira e o PostgREST corta em 1000
        // linhas SEM avisar — o Kanban já sofreu disso
        // (`src/hooks/useDomainEquipeKanbanQueries.ts:20-22`). Paginado, senão a
        // pontualidade sairia calculada sobre uma fatia arbitrária.
        fetchAllRows<EntregavelDigital>((from, to) =>
          supabase
            .from('sprint_deliverables')
            .select('id, status, due_date, completed_at, project_id, sprint_id, parent_id', {
              count: 'exact',
            })
            .order('id', { ascending: true })
            .range(from, to),
        ),
        // Sem filtro de status: projeto 'completed'/'archived' ainda é a ponte
        // até a área dos entregáveis históricos. O recorte "ativo"
        // (`status = 'active'`) é aplicado pelas funções puras.
        supabase.from('projects').select('id, status, equipe_id, area, end_date'),
        supabase.from('sprints').select('id, project_id'),
        supabase
          .from('estrutura_equipes')
          .select('id, area:estrutura_areas!estrutura_equipes_area_id_fkey(name)'),
      ]);

      // Erro sobe. Devolver `[]` aqui pintaria "Digital: 0 entregas" — o tipo
      // exato de mentira que este painel existe para eliminar.
      if (entregaveis.error) throw entregaveis.error;
      if (projetosRes.error) throw projetosRes.error;
      if (sprintsRes.error) throw sprintsRes.error;
      if (equipesRes.error) throw equipesRes.error;

      const equipes: EquipeAreaDigital[] = ((equipesRes.data ?? []) as unknown as EquipeComArea[])
        .map((e) => ({ id: e.id, area_name: e.area?.name ?? null }));

      return {
        entregaveis: entregaveis.rows,
        projetos: (projetosRes.data ?? []) as ProjetoDigital[],
        sprints: (sprintsRes.data ?? []) as SprintDigital[],
        equipes,
        // RLS silenciosa: 0 linhas com 0 erro é indistinguível de "tabela
        // vazia" no PostgREST. A tela precisa poder dizer isso ao sócio.
        podeLerEntregaveis: entregaveis.rows.length > 0,
        podeLerProjetos: (projetosRes.data ?? []).length > 0,
        entregaveisTruncados: entregaveis.truncated,
      };
    },
    enabled: enabled && !!janela.desdeISO && !!janela.ateISO,
    staleTime: STALE_TIME,
  });

  return { snapshotQuery };
}

/**
 * Contagem de entregáveis concluídos que o sócio consegue LER, sem baixar a
 * tabela. Serve de sonda de RLS: se `useDomainTrabalhoDigital` devolve 0
 * entregáveis, esta query dizendo 0 também confirma que o problema é permissão
 * (ou ausência real de dado) e não paginação/filtro do outro hook.
 */
export function useDomainTrabalhoDigitalSonda({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<number>({
    queryKey: ['board-trabalho-digital-sonda'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('sprint_deliverables')
        .select('id', { count: 'exact', head: true })
        .eq('status', STATUS_ENTREGAVEL_CONCLUIDO);
      if (error) throw error;
      return count ?? 0;
    },
    enabled,
    staleTime: STALE_TIME,
  });
}
