import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectAssignee {
  id: string;
  name: string;
}

export interface ProjectPeopleSource {
  id: string;
  responsible_id: string | null;
  leader_id: string | null;
}

/**
 * Quem pode receber uma tarefa em cada projeto: a roda de gente do projeto —
 * membros (`org_project_members`), responsável executor e líder. É a mesma
 * regra do autocomplete de menções (`useDomainMentionCandidates`), aqui em lote
 * para a lista, que mostra muitos projetos de uma vez.
 *
 * Não serve o quadro de pessoas do cluster: reatribuir tarefa para quem não
 * está no projeto entrega trabalho a quem não consegue nem abrir a tarefa (a
 * RLS de `org_tasks` passa por `can_view_org_project`).
 *
 * Uma consulta para todos os projetos visíveis — uma por linha da lista
 * multiplicaria por dezenas o número de requisições.
 */
export const useOrgProjectAssignees = (projects: ProjectPeopleSource[]) => {
  // A chave da query é derivada dos ids: o array de projetos é recriado a cada
  // render do painel e sozinho invalidaria o cache sem parar.
  const projectIds = useMemo(
    () => [...new Set(projects.map(project => project.id))].sort(),
    [projects],
  );
  const chefiaPorProjeto = useMemo(() => projects.map(project => ({
    id: project.id,
    ids: [project.responsible_id, project.leader_id].filter((id): id is string => !!id),
  })), [projects]);

  const query = useQuery({
    queryKey: ['org-project-assignees', projectIds, chefiaPorProjeto.flatMap(item => item.ids).sort()],
    queryFn: async () => {
      const { data: membros, error: membrosError } = await supabase
        .from('org_project_members')
        .select('project_id, user_id')
        .in('project_id', projectIds);
      if (membrosError) throw membrosError;

      const idsPorProjeto = new Map<string, Set<string>>();
      const add = (projectId: string, userId: string | null | undefined) => {
        if (!userId) return;
        if (!idsPorProjeto.has(projectId)) idsPorProjeto.set(projectId, new Set());
        idsPorProjeto.get(projectId)!.add(userId);
      };
      for (const membro of membros ?? []) add(membro.project_id, membro.user_id);
      // Responsável e líder entram mesmo sem linha em org_project_members: o
      // `buildMembersList` grava uma linha por pessoa, mas projeto antigo pode
      // ter só a coluna preenchida.
      for (const projeto of chefiaPorProjeto) {
        for (const id of projeto.ids) add(projeto.id, id);
      }

      const todosOsIds = [...new Set([...idsPorProjeto.values()].flatMap(set => [...set]))];
      if (todosOsIds.length === 0) return {} as Record<string, ProjectAssignee[]>;

      // Só id e nome, e apenas dos ids já recortados acima — a view nunca é
      // lida inteira daqui.
      const { data: perfis, error: perfisError } = await supabase
        .from('profiles_safe')
        .select('id, first_name, last_name')
        .in('id', todosOsIds);
      if (perfisError) throw perfisError;

      const nomePorId = new Map<string, string>();
      for (const perfil of perfis ?? []) {
        const name = [perfil.first_name, perfil.last_name].filter(Boolean).join(' ').trim();
        if (perfil.id && name) nomePorId.set(perfil.id, name);
      }

      const resultado: Record<string, ProjectAssignee[]> = {};
      for (const [projectId, ids] of idsPorProjeto) {
        resultado[projectId] = [...ids]
          .flatMap(id => {
            const name = nomePorId.get(id);
            return name ? [{ id, name }] : [];
          })
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      }
      return resultado;
    },
    enabled: projectIds.length > 0,
    // A equipe de um projeto muda por exceção, não a cada troca de responsável.
    staleTime: 5 * 60 * 1000,
  });

  return query.data ?? {};
};
