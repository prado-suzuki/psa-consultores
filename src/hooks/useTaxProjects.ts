import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────────

export interface TaxProject {
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
  objective: string | null;
  ordem_servico_id: string | null;
  // Joined data
  responsible?: { id: string; first_name: string; last_name: string } | null;
  leader?: { id: string; first_name: string; last_name: string } | null;
  area_ref?: { id: string; name: string } | null;
  external_client?: { id: string; nome: string } | null;
  contribuinte?: { id: string; nome_razao_social: string } | null;
  servico_contratado?: string | null;
  servico_nome?: string | null;
}

export interface TaxProjectMember {
  user_id: string;
  role: string;
}

export interface TaxProjectFormData {
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
  member_ids: string[];
  ordem_servico_id: string;
  servico_id: string;
}

// ── Queries ────────────────────────────────────────────────────────────

export const useTaxProjects = () => {
  return useQuery({
    queryKey: ['tax-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tax_projects')
        .select(`
          *,
          responsible:profiles!tax_projects_responsible_id_fkey(id, first_name, last_name),
          leader:profiles!tax_projects_leader_id_fkey(id, first_name, last_name),
          area_ref:estrutura_areas!tax_projects_estrutura_area_id_fkey(id, name)
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
        external_client: p.external_client_id ? { id: p.external_client_id, nome: clientMap[p.external_client_id] || 'Desconhecido' } : null,
        contribuinte: p.contribuinte_id ? { id: p.contribuinte_id, nome_razao_social: contribMap[p.contribuinte_id] || 'Desconhecido' } : null,
        servico_contratado: p.ordem_servico_id ? servicoMap[p.ordem_servico_id] || null : null,
        servico_nome: p.servico_id ? servicoNomeMap[p.servico_id] || null : null,
      })) as TaxProject[];
    },
  });
};

/** Lightweight list of active tax projects (for dropdowns) */
export const useTaxProjectsList = (onlyActive = true) => {
  return useQuery({
    queryKey: ['tax-projects-list', onlyActive],
    queryFn: async () => {
      let query = supabase.from('tax_projects').select('id, name, external_client_id, estrutura_area_id').order('name');
      if (onlyActive) query = query.eq('status', 'active');
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
};

export const useProjectMembers = (projectId: string | undefined) => {
  return useQuery({
    queryKey: ['tax-project-members', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('tax_project_members')
        .select('user_id, role')
        .eq('project_id', projectId);
      if (error) throw error;
      return data as TaxProjectMember[];
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

/** Aggregated estimated hours per project from fiscal_tasks */
export const useProjectHours = () => {
  return useQuery({
    queryKey: ['fiscal-project-hours'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fiscal_tasks')
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

export const useCreateTaxProject = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (data: TaxProjectFormData) => {
      const { data: project, error } = await supabase.from('tax_projects').insert({
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
        ordem_servico_id: data.ordem_servico_id || null,
        servico_id: data.servico_id || null,
        created_by: user?.id || null,
      }).select('id').single();
      if (error) throw error;

      // Insert project members
      const members = buildMembersList(project.id, data);
      if (members.length > 0) {
        const { error: mErr } = await supabase.from('tax_project_members').insert(members);
        if (mErr) throw mErr;
      }

      await logAction({
        area: 'tax', entity_type: 'project', entity_id: project.id,
        entity_name: data.name, action: 'created',
      });

      return project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-projects'] });
      toast.success('Projeto criado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao criar projeto: ' + error.message);
    },
  });
};

export const useUpdateTaxProject = () => {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({
      id, data, oldProject, oldMembers,
    }: {
      id: string;
      data: TaxProjectFormData;
      oldProject: TaxProject;
      oldMembers: TaxProjectMember[];
    }) => {
      // Build changed fields diff
      const changedFields: Record<string, { old: unknown; new: unknown }> = {};
      const comparisons: [string, unknown, unknown][] = [
        ['name', oldProject.name, data.name],
        ['status', oldProject.status, data.status],
        ['start_date', oldProject.start_date || null, data.start_date || null],
        ['end_date', oldProject.end_date || null, data.end_date || null],
        ['estrutura_area_id', oldProject.estrutura_area_id || null, data.estrutura_area_id || null],
        ['description', oldProject.description || null, data.description || null],
        ['responsible_id', oldProject.responsible_id || null, data.responsible_id || null],
        ['leader_id', oldProject.leader_id || null, data.leader_ids[0] || null],
        ['external_client_id', oldProject.external_client_id || null, data.external_client_id || null],
        ['contribuinte_id', oldProject.contribuinte_id || null, data.contribuinte_id || null],
        ['ordem_servico_id', oldProject.ordem_servico_id || null, data.ordem_servico_id || null],
        ['servico_id', (oldProject as any).servico_id || null, data.servico_id || null],
      ];
      for (const [field, oldVal, newVal] of comparisons) {
        if (oldVal !== newVal) changedFields[field] = { old: oldVal, new: newVal };
      }

      // Compare member_ids arrays
      const oldMemberIds = oldMembers.filter(m => m.role === 'member').map(m => m.user_id).sort();
      const newMemberIds = [...data.member_ids].sort();
      if (JSON.stringify(oldMemberIds) !== JSON.stringify(newMemberIds)) {
        changedFields.member_ids = { old: oldMemberIds, new: newMemberIds };
      }

      // Update project
      const { error } = await supabase.from('tax_projects').update({
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
        ordem_servico_id: data.ordem_servico_id || null,
        servico_id: data.servico_id || null,
      }).eq('id', id);
      if (error) throw error;

      // Upsert project members + remove stale ones
      const members = buildMembersList(id, data);
      if (members.length > 0) {
        const { error: mErr } = await supabase.from('tax_project_members').upsert(members, { onConflict: 'project_id,user_id' });
        if (mErr) throw mErr;
      }
      const newMemberUserIds = new Set(members.map(m => m.user_id));
      const oldMemberUserIds = oldMembers.map(m => m.user_id);
      const removedMembers = oldMemberUserIds.filter(uid => !newMemberUserIds.has(uid));
      if (removedMembers.length > 0) {
        await supabase.from('tax_project_members').delete().eq('project_id', id).in('user_id', removedMembers);
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
      queryClient.invalidateQueries({ queryKey: ['tax-projects'] });
      queryClient.invalidateQueries({ queryKey: ['tax-project-members'] });
      toast.success('Projeto atualizado');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });
};

export const useDeleteTaxProject = () => {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('tax_projects').delete().eq('id', id);
      if (error) throw error;

      await logAction({
        area: 'tax', entity_type: 'project', entity_id: id,
        entity_name: name, action: 'deleted',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-projects'] });
      toast.success('Projeto excluído');
    },
    onError: (error) => {
      toast.error('Erro ao excluir: ' + error.message);
    },
  });
};

// ── Helpers ────────────────────────────────────────────────────────────

function buildMembersList(projectId: string, data: TaxProjectFormData) {
  const members: { project_id: string; user_id: string; role: string }[] = [];
  for (const uid of data.leader_ids) {
    members.push({ project_id: projectId, user_id: uid, role: 'leader' });
  }
  for (const uid of data.member_ids) {
    if (!members.some(m => m.user_id === uid)) {
      members.push({ project_id: projectId, user_id: uid, role: 'member' });
    }
  }
  return members;
}
