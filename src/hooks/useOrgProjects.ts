import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { assertCanPerform } from '@/hooks/useRlsPrecheck';
import { toast } from 'sonner';

// ── Helpers ────────────────────────────────────────────────────────────
function formatProjectError(error: any, action: 'create' | 'update' | 'delete'): string {
  const msg = (error?.message || '').toLowerCase();
  const isRls =
    error?.code === '42501' ||
    msg.includes('row-level security') ||
    msg.includes('row level security') ||
    msg.includes('permission denied') ||
    msg.includes('violates row');

  if (isRls) {
    switch (action) {
      case 'create':
        return 'Sem permissão para criar projetos. Apenas usuários com perfil Sublíder, Líder ou Admin podem criar projetos. Solicite acesso à liderança.';
      case 'update':
        return 'Sem permissão para editar este projeto. É necessário ser membro do projeto ou ter perfil Sublíder ou superior.';
      case 'delete':
        return 'Sem permissão para excluir este projeto. Apenas o criador ou um Líder/Admin pode excluir.';
    }
  }
  const fallback =
    action === 'create' ? 'Erro ao criar projeto'
    : action === 'update' ? 'Erro ao atualizar projeto'
    : 'Erro ao excluir projeto';
  return `${fallback}: ${error?.message ?? 'erro desconhecido'}`;
}

// ── Types (org_projects rebuild) ───────────────────────────────────────

export interface OrgProject {
  id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  responsible_id: string | null;
  leader_id: string | null;
  external_client_id: string | null;
  contribuinte_id: string | null;
  estrutura_area_id: string | null;
  equipe_id: string | null;
  is_multidisciplinar: boolean;
  objective: string | null;
  ordem_servico_id: string | null;
  // Joined data
  responsible?: { id: string; first_name: string; last_name: string } | null;
  leader?: { id: string; first_name: string; last_name: string } | null;
  area_ref?: { id: string; name: string } | null;
  equipe_ref?: { id: string; name: string } | null;
  external_client?: { id: string; nome: string } | null;
  contribuinte?: { id: string; nome_razao_social: string } | null;
  servico_contratado?: string | null;
  servico_nome?: string | null;
}

export interface OrgProjectMember {
  user_id: string;
  role: string;
}

export interface OrgProjectFormData {
  name: string;
  description: string;
  status: string;
  start_date: string;
  end_date: string;
  leader_ids: string[];
  responsible_id: string;
  external_client_id: string;
  contribuinte_id?: string;
  estrutura_area_id: string;
  equipe_id: string;
  is_multidisciplinar: boolean;
  member_ids: string[];
  ordem_servico_id: string;
  servico_id: string;
}

// ── @deprecated aliases (backward compat) ──────────────────────────────
/** @deprecated Use OrgProject */
export type TaxProject = OrgProject;
/** @deprecated Use OrgProjectMember */
export type TaxProjectMember = OrgProjectMember;
/** @deprecated Use OrgProjectFormData */
export type TaxProjectFormData = OrgProjectFormData;

// ── Queries ────────────────────────────────────────────────────────────

export const useOrgProjects = () => {
  return useQuery({
    queryKey: ['org-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_projects')
        .select(`
          *,
          responsible:profiles!org_projects_responsible_id_fkey(id, first_name, last_name),
          leader:profiles!org_projects_leader_id_fkey(id, first_name, last_name),
          area_ref:estrutura_areas!org_projects_estrutura_area_id_fkey(id, name),
          equipe_ref:estrutura_equipes!org_projects_equipe_id_fkey(id, name)
        `)
        .order('name');
      if (error) throw error;

      // Resolve external_client and contribuinte names via environment-aware tables
      const clientIds = [...new Set((data || []).filter(p => p.external_client_id).map(p => p.external_client_id as string))];
      const contribIds = [...new Set((data || []).filter(p => p.contribuinte_id).map(p => p.contribuinte_id as string))];

      const clientMap: Record<string, string> = {};
      const contribMap: Record<string, string> = {};

      if (clientIds.length > 0) {
        const { data: clients } = await supabase.from('cliente').select('id, nome').in('id', clientIds).eq('excluido', false);
        (clients || []).forEach(c => { clientMap[c.id] = c.nome; });
      }

      if (contribIds.length > 0) {
        const { data: contribs } = await supabase.from('contribuinte').select('id, nome_razao_social').in('id', contribIds).eq('excluido', false);
        (contribs || []).forEach(c => { contribMap[c.id] = c.nome_razao_social; });
      }

      // Resolve servico_contratado via os_produtos_contratados → produto_segmento
      const osIds = [...new Set((data || []).filter(p => p.ordem_servico_id).map(p => p.ordem_servico_id as string))];
      const servicoMap: Record<string, string> = {};

      if (osIds.length > 0) {
        // os_produtos_contratados não está no schema tipado — cast justificado
        const { data: osProdutos } = await (supabase
          .from('os_produtos_contratados' as any) as any)
          .select('ordem_servico_id, produto_segmento_id, produto_segmento:produto_segmento(id, codigo, nome)')
          .in('ordem_servico_id', osIds);

        // Group by OS and concatenate product codes
        const osProductMap: Record<string, string[]> = {};
        for (const row of (osProdutos || []) as any[]) {
          const osId = row.ordem_servico_id as string;
          const label = row.produto_segmento
            ? `${row.produto_segmento.codigo} — ${row.produto_segmento.nome}`
            : null;
          if (label) {
            if (!osProductMap[osId]) osProductMap[osId] = [];
            osProductMap[osId].push(label);
          }
        }
        for (const [osId, labels] of Object.entries(osProductMap)) {
          servicoMap[osId] = labels.join(', ');
        }
      }

      // Resolve servico_id → nome via servicos_prestados
      const servicoIds = [...new Set((data || []).filter(p => p.servico_id).map(p => p.servico_id as string))];
      const servicoNomeMap: Record<string, string> = {};

      if (servicoIds.length > 0) {
        const { data: servicos } = await (supabase.from('servicos_prestados' as any) as any)
          .select('id, nome')
          .in('id', servicoIds);
        (servicos || []).forEach((s: any) => { servicoNomeMap[s.id] = s.nome; });
      }

      return (data || []).map(p => ({
        ...p,
        // is_multidisciplinar ainda ausente do schema tipado gerado — coerce a boolean
        is_multidisciplinar: !!(p as { is_multidisciplinar?: boolean }).is_multidisciplinar,
        external_client: p.external_client_id ? { id: p.external_client_id, nome: clientMap[p.external_client_id] || 'Desconhecido' } : null,
        contribuinte: p.contribuinte_id ? { id: p.contribuinte_id, nome_razao_social: contribMap[p.contribuinte_id] || 'Desconhecido' } : null,
        servico_contratado: p.ordem_servico_id ? servicoMap[p.ordem_servico_id] || null : null,
        servico_nome: p.servico_id ? servicoNomeMap[p.servico_id] || null : null,
      })) as OrgProject[];
    },
  });
};

/** Lightweight list of active org projects (for dropdowns) */
export const useOrgProjectsList = (onlyActive = true) => {
  return useQuery({
    queryKey: ['org-projects-list', onlyActive],
    queryFn: async () => {
      let query = supabase.from('org_projects').select('id, name, external_client_id, estrutura_area_id, equipe_id').order('name');
      if (onlyActive) query = query.in('status', ['active', 'planned']);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
};

export const useProjectMembers = (projectId: string | undefined) => {
  return useQuery({
    queryKey: ['org-project-members', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('org_project_members')
        .select('user_id, role')
        .eq('project_id', projectId);
      if (error) throw error;
      return data as OrgProjectMember[];
    },
    enabled: !!projectId,
  });
};

export const useOrgProjectClusterIds = (projectId: string | undefined) => {
  return useQuery({
    queryKey: ['org-project-cluster-ids', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase.rpc('org_project_cluster_ids', {
        _project_id: projectId,
      });
      if (error) throw error;
      return [...new Set(data || [])].sort();
    },
    enabled: !!projectId,
  });
};

export const useProjectServicos = (projectId: string | undefined) => {
  return useQuery({
    queryKey: ['project-servicos', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await (supabase.from('project_servicos' as any) as any)
        .select('servico_id')
        .eq('project_id', projectId);
      if (error) throw error;
      return data as { servico_id: string }[];
    },
    enabled: !!projectId,
  });
};

/** Aggregated estimated hours per project from org_tasks */
export const useProjectHours = () => {
  return useQuery({
    queryKey: ['fiscal-project-hours'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_tasks')
        .select('project_id, estimated_hours');
      if (error) throw error;
      const map: Record<string, number> = {};
      (data || []).forEach((t: any) => {
        if (t.project_id && t.estimated_hours) {
          map[t.project_id] = (map[t.project_id] || 0) + t.estimated_hours;
        }
      });
      return map;
    },
  });
};

// ── Mutations ──────────────────────────────────────────────────────────

type LogActionFn = ReturnType<typeof useAuditLog>['logAction'];

/** Insere um projeto + membros e registra auditoria. Fonte única usada pela criação única e em lote. */
async function insertProjectWithMembers(data: OrgProjectFormData, userId: string | null, logAction: LogActionFn) {
  const { data: project, error } = await supabase.from('org_projects').insert({
    name: data.name,
    description: data.description || null,
    status: data.status,
    start_date: data.start_date || null,
    end_date: data.end_date || null,
    responsible_id: data.responsible_id || null,
    leader_id: data.leader_ids[0] || null,
    external_client_id: data.external_client_id || null,
    contribuinte_id: data.contribuinte_id || null,
    estrutura_area_id: data.estrutura_area_id || null,
    equipe_id: data.equipe_id || null,
    is_multidisciplinar: data.is_multidisciplinar,
    ordem_servico_id: data.ordem_servico_id || null,
    servico_id: data.servico_id || null,
    created_by: userId || null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- is_multidisciplinar ainda ausente do schema tipado gerado
  } as any).select('id').single();
  if (error) throw error;

  // Insert project members
  const members = buildMembersList(project.id, data);
  if (members.length > 0) {
    const { error: mErr } = await supabase.from('org_project_members').insert(members);
    if (mErr) throw mErr;
  }

  await logAction({
    area: 'tax', entity_type: 'project', entity_id: project.id,
    entity_name: data.name, action: 'created',
  });

  return project;
}

export const useCreateOrgProject = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: (data: OrgProjectFormData) => insertProjectWithMembers(data, user?.id || null, logAction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-projects'] });
      toast.success('Projeto criado com sucesso');
    },
    onError: (error) => {
      toast.error(formatProjectError(error, 'create'));
    },
  });
};

export interface BatchProjectResult {
  created: number;
  failures: { name: string; error: string }[];
}

/**
 * Cria vários projetos em sequência (1 por produto de uma OS, por ex.).
 * Cada projeto é inserido individualmente com seus membros e auditoria; falhas
 * são acumuladas sem abortar o lote, e um único toast resume o resultado.
 */
export const useCreateOrgProjectsBatch = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (items: OrgProjectFormData[]): Promise<BatchProjectResult> => {
      const failures: { name: string; error: string }[] = [];
      let created = 0;
      for (const data of items) {
        try {
          await insertProjectWithMembers(data, user?.id || null, logAction);
          created += 1;
        } catch (error) {
          failures.push({ name: data.name, error: formatProjectError(error, 'create') });
        }
      }
      return { created, failures };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['org-projects'] });
      const total = result.created + result.failures.length;
      if (result.failures.length === 0) {
        toast.success(`${result.created} projeto${result.created !== 1 ? 's' : ''} criado${result.created !== 1 ? 's' : ''} com sucesso`);
      } else if (result.created > 0) {
        toast.warning(`${result.created} de ${total} projetos criados. Falharam: ${result.failures.map(f => f.name).join(', ')}`);
      } else {
        toast.error(`Nenhum projeto criado. ${result.failures[0]?.error || ''}`);
      }
    },
    onError: (error) => {
      toast.error(formatProjectError(error, 'create'));
    },
  });
};

export const useUpdateOrgProject = () => {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({
      id, data, oldProject, oldMembers,
    }: {
      id: string;
      data: OrgProjectFormData;
      oldProject: OrgProject;
      oldMembers: OrgProjectMember[];
    }) => {
      // Build changed fields diff
      const changedFields: Record<string, { old: unknown; new: unknown }> = {};
      const comparisons: [string, unknown, unknown][] = [
        ['name', oldProject.name, data.name],
        ['status', oldProject.status, data.status],
        ['start_date', oldProject.start_date || null, data.start_date || null],
        ['end_date', oldProject.end_date || null, data.end_date || null],
        ['estrutura_area_id', oldProject.estrutura_area_id || null, data.estrutura_area_id || null],
        ['equipe_id', oldProject.equipe_id || null, data.equipe_id || null],
        ['is_multidisciplinar', !!oldProject.is_multidisciplinar, !!data.is_multidisciplinar],
        ['description', oldProject.description || null, data.description || null],
        ['responsible_id', oldProject.responsible_id || null, data.responsible_id || null],
        ['leader_id', oldProject.leader_id || null, data.leader_ids[0] || null],
        ['external_client_id', oldProject.external_client_id || null, data.external_client_id || null],
        ['contribuinte_id', oldProject.contribuinte_id || null, data.contribuinte_id || null],
        ['ordem_servico_id', oldProject.ordem_servico_id || null, data.ordem_servico_id || null],
        ['servico_id', (oldProject as any).servico_id || null, data.servico_id || null],
      ];
      // Patch isolado: monta o payload só com as colunas que realmente mudaram,
      // reaproveitando o mesmo diff da auditoria. Assim uma edição nunca reescreve
      // (nem zera) colunas que o formulário não gerencia — ex.: contribuinte_id,
      // que o modal não expõe e antes era forçado a null a cada save.
      const updatePayload: Record<string, unknown> = {};
      for (const [field, oldVal, newVal] of comparisons) {
        if (oldVal !== newVal) {
          changedFields[field] = { old: oldVal, new: newVal };
          updatePayload[field] = newVal;
        }
      }

      // Compare member_ids arrays
      const oldMemberIds = oldMembers.filter(m => m.role === 'member').map(m => m.user_id).sort();
      const newMemberIds = [...data.member_ids].sort();
      if (JSON.stringify(oldMemberIds) !== JSON.stringify(newMemberIds)) {
        changedFields.member_ids = { old: oldMemberIds, new: newMemberIds };
      }

      // Update project — só dispara quando alguma coluna mudou (patch isolado acima).
      if (Object.keys(updatePayload).length > 0) {
        await assertCanPerform('org_projects', 'update', id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- is_multidisciplinar ainda ausente do schema tipado gerado
        const { error } = await supabase.from('org_projects').update(updatePayload as any).eq('id', id);
        if (error) throw error;
      }

      // Upsert project members + remove stale ones
      const members = buildMembersList(id, data);
      if (members.length > 0) {
        // Upsert pode virar update — precheck só roda quando já existe linha pro projeto.
        const { data: sampleMember } = await supabase
          .from('org_project_members')
          .select('id')
          .eq('project_id', id)
          .limit(1)
          .maybeSingle();
        if (sampleMember?.id) {
          await assertCanPerform('org_project_members', 'update', sampleMember.id);
        }
        const { error: mErr } = await supabase.from('org_project_members').upsert(members, { onConflict: 'project_id,user_id' });
        if (mErr) throw mErr;
      }
      const newMemberUserIds = new Set(members.map(m => m.user_id));
      const oldMemberUserIds = oldMembers.map(m => m.user_id);
      const removedMembers = oldMemberUserIds.filter(uid => !newMemberUserIds.has(uid));
      if (removedMembers.length > 0) {
        // Precheck do delete em lote — amostra um id antes pra rodar can_perform.
        const { data: sampleToDelete } = await supabase
          .from('org_project_members')
          .select('id')
          .eq('project_id', id)
          .in('user_id', removedMembers)
          .limit(1)
          .maybeSingle();
        if (sampleToDelete?.id) {
          await assertCanPerform('org_project_members', 'delete', sampleToDelete.id);
        }
        await supabase.from('org_project_members').delete().eq('project_id', id).in('user_id', removedMembers);
      }

      // Log only if something changed
      if (Object.keys(changedFields).length > 0) {
        await logAction({
          area: 'tax', entity_type: 'project', entity_id: id,
          entity_name: data.name, action: 'updated',
          changed_fields: changedFields,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-projects'] });
      queryClient.invalidateQueries({ queryKey: ['org-project-members'] });
      toast.success('Projeto atualizado');
    },
    onError: (error) => {
      toast.error(formatProjectError(error, 'update'));
    },
  });
};

export const useDeleteOrgProject = () => {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      await assertCanPerform('org_projects', 'delete', id);
      const { error } = await supabase.from('org_projects').delete().eq('id', id);
      if (error) throw error;

      await logAction({
        area: 'tax', entity_type: 'project', entity_id: id,
        entity_name: name, action: 'deleted',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-projects'] });
      toast.success('Projeto excluído');
    },
    onError: (error) => {
      toast.error(formatProjectError(error, 'delete'));
    },
  });
};

// ── @deprecated aliases (backward compat) ──────────────────────────────
/** @deprecated Use useOrgProjects */
export const useTaxProjects = useOrgProjects;
/** @deprecated Use useOrgProjectsList */
export const useTaxProjectsList = useOrgProjectsList;
/** @deprecated Use useCreateOrgProject */
export const useCreateTaxProject = useCreateOrgProject;
/** @deprecated Use useUpdateOrgProject */
export const useUpdateTaxProject = useUpdateOrgProject;
/** @deprecated Use useDeleteOrgProject */
export const useDeleteTaxProject = useDeleteOrgProject;

// ── Helpers ────────────────────────────────────────────────────────────

function buildMembersList(projectId: string, data: OrgProjectFormData) {
  const members: { project_id: string; user_id: string; role: string }[] = [];

  // Responsible executor
  if (data.responsible_id) {
    members.push({ project_id: projectId, user_id: data.responsible_id, role: 'responsible' });
  }

  // Leaders
  for (const uid of data.leader_ids) {
    if (!members.some(m => m.user_id === uid)) {
      members.push({ project_id: projectId, user_id: uid, role: 'leader' });
    }
  }

  // Members
  for (const uid of data.member_ids) {
    if (!members.some(m => m.user_id === uid)) {
      members.push({ project_id: projectId, user_id: uid, role: 'member' });
    }
  }

  return members;
}
