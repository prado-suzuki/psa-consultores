import { useQuery } from '@tanstack/react-query';

import type { OrgCommentEntityType } from '@/hooks/useDomainOrgComments';
import { supabase } from '@/integrations/supabase/client';
import { ordenarCandidatos, type MentionCandidate } from '@/lib/orgCommentMentions';

/**
 * Quem pode ser mencionado num comentário de tarefa/projeto.
 *
 * A lista é a roda de gente daquele projeto: membros (`org_project_members`),
 * responsável e líder do projeto e, na tarefa, o executor e o revisor.
 *
 * ⚠️ REGRA DE SEGURANÇA: a lista é sempre derivada do projeto da thread aberta,
 * nunca do quadro de pessoas da empresa. O autocomplete exibe o nome da pessoa
 * dentro do contexto da tarefa — se qualquer perfil da empresa entrasse aqui, o
 * título da tarefa vazaria para quem não tem acesso a ela. Por isso o `enabled`
 * exige o projeto resolvido e os nomes só são buscados para ids já filtrados.
 */

export type { MentionCandidate };

export const mentionCandidatesQueryKey = (
  entityType: OrgCommentEntityType,
  entityId: string,
  projectId: string | null,
) => ['org-mention-candidates', entityType, entityId, projectId] as const;

interface TarefaPessoas {
  assigned_to: string | null;
  reviewer_id: string | null;
}

interface QueryResult<T> {
  data: T | null;
  error: { message: string } | null;
}

export function useDomainMentionCandidates(
  entityType: OrgCommentEntityType,
  entityId: string,
  projectId?: string | null,
) {
  // Na thread do projeto a própria entidade é o projeto; na da tarefa, o projeto
  // vem de quem abriu o painel.
  const resolvedProjectId = entityType === 'org_project' ? entityId : (projectId ?? null);

  const query = useQuery<MentionCandidate[]>({
    queryKey: mentionCandidatesQueryKey(entityType, entityId, resolvedProjectId),
    queryFn: async () => {
      const tarefaPromise: PromiseLike<QueryResult<TarefaPessoas>> =
        entityType === 'org_task'
          ? supabase
              .from('org_tasks')
              .select('assigned_to, reviewer_id')
              .eq('id', entityId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null });

      const [membros, projeto, tarefa] = await Promise.all([
        supabase.from('org_project_members').select('user_id').eq('project_id', resolvedProjectId!),
        supabase
          .from('org_projects')
          .select('responsible_id, leader_id')
          .eq('id', resolvedProjectId!)
          .maybeSingle(),
        tarefaPromise,
      ]);

      if (membros.error) throw membros.error;
      if (projeto.error) throw projeto.error;
      if (tarefa.error) throw tarefa.error;

      const ids = new Set<string>();
      for (const membro of membros.data ?? []) {
        if (membro.user_id) ids.add(membro.user_id);
      }
      for (const id of [
        projeto.data?.responsible_id,
        projeto.data?.leader_id,
        tarefa.data?.assigned_to,
        tarefa.data?.reviewer_id,
      ]) {
        if (id) ids.add(id);
      }
      if (ids.size === 0) return [];

      // Os nomes vêm de `profiles_safe` (só id + nome) e apenas para os ids já
      // recortados acima — a view nunca é lida inteira daqui.
      const { data: perfis, error } = await supabase
        .from('profiles_safe')
        .select('id, first_name, last_name')
        .in('id', [...ids]);
      if (error) throw error;

      const candidatos = (perfis ?? []).flatMap<MentionCandidate>((perfil) => {
        const name = [perfil.first_name, perfil.last_name].filter(Boolean).join(' ').trim();
        return perfil.id && name ? [{ id: perfil.id, name }] : [];
      });

      return ordenarCandidatos(candidatos);
    },
    enabled: !!resolvedProjectId,
    // A equipe de um projeto muda por exceção, não a cada comentário.
    staleTime: 5 * 60 * 1000,
  });

  return {
    candidates: query.data ?? [],
    isLoading: query.isLoading,
  };
}
