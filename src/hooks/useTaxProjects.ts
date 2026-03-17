import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { isProductionEnvironment } from '@/config/api';
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
  area_id: string | null;
  objective: string | null;
  ordem_servico_id: string | null;
  // Joined data
  responsible?: { id: string; first_name: string; last_name: string } | null;
  leader?: { id: string; first_name: string; last_name: string } | null;
  area_ref?: { id: string; nome: string } | null;
  external_client?: { id: string; nome: string } | null;
  contribuinte?: { id: string; nome_razao_social: string } | null;
  servico_contratado?: string | null;
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
  sublider_ids: string[];
  external_client_id: string;
  contribuinte_id: string;
  area_id: string;
  objective: string;
  category_ids: string[];
  member_ids: string[];
  ordem_servico_id: string;
}

// ── Helper constants ───────────────────────────────────────────────────

const clienteTable = isProductionEnvironment ? 'cliente' : 'cliente_dev';
const contribuinteTable = isProductionEnvironment ? 'contribuinte' : 'contribuinte_dev';
const fallbackClienteTable = isProductionEnvironment ? 'cliente_dev' : 'cliente';
const fallbackContribuinteTable = isProductionEnvironment ? 'contribuinte_dev' : 'contribuinte';

// ── Queries ────────────────────────────────────────────────────────────

export const useTaxProjects = () => {
  return useQuery({
    queryKey: ['tax-projects', clienteTable, contribuinteTable],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tax_projects')
        .select(`
          *,
          responsible:profiles!tax_projects_responsible_id_fkey(id, first_name, last_name),
          leader:profiles!tax_projects_leader_id_fkey(id, first_name, last_name),
          area_ref:tax_areas!tax_projects_area_id_fkey(id, nome)
        `)
        .order('name');
      if (error) throw error;

      // Resolve external_client and contribuinte names via environment-aware tables
      const clientIds = [...new Set((data || []).filter(p => p.external_client_id).map(p => p.external_client_id as string))];
      const contribIds = [...new Set((data || []).filter(p => p.contribuinte_id).map(p => p.contribuinte_id as string))];

      const clientMap: Record<string, string> = {};
      const contribMap: Record<string, string> = {};

      if (clientIds.length > 0) {
        const { data: clients } = await supabase.from(clienteTable).select('id, nome').in('id', clientIds);
        (clients || []).forEach(c => { clientMap[c.id] = c.nome; });
        // Fallback for missing IDs
        if (!isProductionEnvironment) {
          const missing = clientIds.filter(id => !clientMap[id]);
          if (missing.length > 0) {
            const { data: fb } = await supabase.from('cliente').select('id, nome').in('id', missing);
            (fb || []).forEach(c => { clientMap[c.id] = c.nome; });
          }
        }
      }

      if (contribIds.length > 0) {
        const { data: contribs } = await supabase.from(contribuinteTable).select('id, nome_razao_social').in('id', contribIds).eq('excluido', false);
        (contribs || []).forEach(c => { contribMap[c.id] = c.nome_razao_social; });
        if (!isProductionEnvironment) {
          const missing = contribIds.filter(id => !contribMap[id]);
          if (missing.length > 0) {
            const { data: fb } = await supabase.from('contribuinte').select('id, nome_razao_social').in('id', missing);
            (fb || []).forEach(c => { contribMap[c.id] = c.nome_razao_social; });
          }
        }
      }

      // Resolve servico_contratado via ordem_servico → id_servico → servicos_prestados
      const osIds = [...new Set((data || []).filter(p => p.ordem_servico_id).map(p => p.ordem_servico_id as string))];
      const servicoMap: Record<string, string> = {};

      if (osIds.length > 0) {
        // Cast needed: ordem_servico not in generated types
        const { data: osRows } = await (supabase.from('ordem_servico' as any) as any)
          .select('id, id_servico')
          .in('id', osIds);
        const servicoIds = [...new Set((osRows || []).filter((o: any) => o.id_servico).map((o: any) => o.id_servico as string))];
        let servicoNames: Record<string, string> = {};
        if (servicoIds.length > 0) {
          const { data: servicos } = await supabase.from('servicos_prestados').select('id, nome').in('id', servicoIds);
          (servicos || []).forEach((s: any) => { servicoNames[s.id] = s.nome; });
        }
        (osRows || []).forEach((o: any) => {
          if (o.id_servico && servicoNames[o.id_servico]) {
            servicoMap[o.id] = servicoNames[o.id_servico];
          }
        });
      }

      return (data || []).map(p => ({
        ...p,
        external_client: p.external_client_id ? { id: p.external_client_id, nome: clientMap[p.external_client_id] || 'Desconhecido' } : null,
        contribuinte: p.contribuinte_id ? { id: p.contribuinte_id, nome_razao_social: contribMap[p.contribuinte_id] || 'Desconhecido' } : null,
        servico_contratado: p.ordem_servico_id ? servicoMap[p.ordem_servico_id] || null : null,
      })) as TaxProject[];
    },
  });
};

/** Lightweight list of active tax projects (for dropdowns) */
export const useTaxProjectsList = (onlyActive = true) => {
  return useQuery({
    queryKey: ['tax-projects-list', onlyActive],
    queryFn: async () => {
      let query = supabase.from('tax_projects').select('id, name, external_client_id, area_id').order('name');
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
        responsible_id: data.leader_ids[0] || null,
        leader_id: data.leader_ids[0] || null,
        external_client_id: data.external_client_id || null,
        contribuinte_id: data.contribuinte_id || null,
        area_id: data.area_id || null,
        objective: data.objective || null,
        ordem_servico_id: data.ordem_servico_id || null,
        created_by: user?.id || null,
      }).select('id').single();
      if (error) throw error;

      // Insert project servicos
      if (data.category_ids.length > 0) {
        const rows = data.category_ids.map(catId => ({ project_id: project.id, servico_id: catId }));
        const { error: catError } = await (supabase.from('project_servicos' as any) as any).insert(rows);
        if (catError) throw catError;
      }

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
      id, data, oldProject, oldMembers, oldCategoryIds,
    }: {
      id: string;
      data: TaxProjectFormData;
      oldProject: TaxProject;
      oldMembers: TaxProjectMember[];
      oldCategoryIds: string[];
    }) => {
      // Build changed fields diff
      const changedFields: Record<string, { old: unknown; new: unknown }> = {};
      const comparisons: [string, unknown, unknown][] = [
        ['name', oldProject.name, data.name],
        ['status', oldProject.status, data.status],
        ['start_date', oldProject.start_date || null, data.start_date || null],
        ['end_date', oldProject.end_date || null, data.end_date || null],
        ['area_id', oldProject.area_id || null, data.area_id || null],
        ['description', oldProject.description || null, data.description || null],
        ['responsible_id', oldProject.responsible_id || null, data.leader_ids[0] || null],
        ['leader_id', oldProject.leader_id || null, data.leader_ids[0] || null],
        ['external_client_id', oldProject.external_client_id || null, data.external_client_id || null],
        ['contribuinte_id', oldProject.contribuinte_id || null, data.contribuinte_id || null],
        ['objective', oldProject.objective || null, data.objective || null],
        ['ordem_servico_id', oldProject.ordem_servico_id || null, data.ordem_servico_id || null],
      ];
      for (const [field, oldVal, newVal] of comparisons) {
        if (oldVal !== newVal) changedFields[field] = { old: oldVal, new: newVal };
      }

      // Compare category_ids arrays
      const sortedOld = [...oldCategoryIds].sort();
      const sortedNew = [...data.category_ids].sort();
      if (JSON.stringify(sortedOld) !== JSON.stringify(sortedNew)) {
        changedFields.category_ids = { old: sortedOld, new: sortedNew };
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
        responsible_id: data.leader_ids[0] || null,
        leader_id: data.leader_ids[0] || null,
        external_client_id: data.external_client_id || null,
        contribuinte_id: data.contribuinte_id || null,
        area_id: data.area_id || null,
        objective: data.objective || null,
      }).eq('id', id);
      if (error) throw error;

      // Upsert project servicos + remove stale ones
      if (data.category_ids.length > 0) {
        const rows = data.category_ids.map(catId => ({ project_id: id, servico_id: catId }));
        await (supabase.from('project_servicos' as any) as any).upsert(rows, { onConflict: 'project_id,servico_id' });
      }
      const removedCats = oldCategoryIds.filter(cid => !data.category_ids.includes(cid));
      if (removedCats.length > 0) {
        await (supabase.from('project_servicos' as any) as any).delete().eq('project_id', id).in('servico_id', removedCats);
      }

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
      queryClient.invalidateQueries({ queryKey: ['project-servicos'] });
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
  for (const uid of data.sublider_ids) {
    if (!members.some(m => m.user_id === uid)) {
      members.push({ project_id: projectId, user_id: uid, role: 'sublider' });
    }
  }
  for (const uid of data.member_ids) {
    if (!members.some(m => m.user_id === uid)) {
      members.push({ project_id: projectId, user_id: uid, role: 'member' });
    }
  }
  return members;
}
