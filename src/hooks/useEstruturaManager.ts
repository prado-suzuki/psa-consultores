import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuditLog } from '@/hooks/useAuditLog';
import { toast } from 'sonner';
import { useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────

export interface Cluster {
  id: string;
  name: string;
  cost_center: string | null;
  empresa_id: string | null;
  is_active: boolean;
}

export interface Area {
  id: string;
  cluster_id: string;
  name: string;
  color: string | null;
  is_active: boolean;
  page_categories: string[];
  cost_center_id: string | null;
}

export interface AreaLider {
  id: string;
  area_id: string;
  user_id: string;
}

export interface Equipe {
  id: string;
  area_id: string;
  name: string;
  sublider_id: string | null;
  is_active: boolean;
}

export interface EquipeMembro {
  id: string;
  equipe_id: string;
  user_id: string;
}

export interface EmpresaFat {
  id: string;
  nome: string;
  cnpj: string | null;
  centro_custo_id: string | null;
  is_active: boolean;
}

export interface CentroCusto {
  id: string;
  codigo: string;
  nome: string;
  is_active: boolean;
}

// ── Queries ────────────────────────────────────────────────────────────

export const useEstruturaClusters = () =>
  useQuery({
    queryKey: ['estrutura-clusters'],
    queryFn: async () => {
      const { data, error } = await supabase.from('estrutura_clusters').select('*').order('name');
      if (error) throw error;
      return data as Cluster[];
    },
  });

export const useEstruturaAreas = () =>
  useQuery({
    queryKey: ['estrutura-areas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('estrutura_areas').select('*').order('name');
      if (error) throw error;
      return data as Area[];
    },
  });

export const useEstruturaLideres = () =>
  useQuery({
    queryKey: ['estrutura-lideres'],
    queryFn: async () => {
      const { data, error } = await supabase.from('estrutura_area_lideres').select('*');
      if (error) throw error;
      return data as AreaLider[];
    },
  });

export const useEstruturaEquipes = () =>
  useQuery({
    queryKey: ['estrutura-equipes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('estrutura_equipes').select('*').order('name');
      if (error) throw error;
      return data as Equipe[];
    },
  });

export const useEstruturaMembros = () =>
  useQuery({
    queryKey: ['estrutura-membros'],
    queryFn: async () => {
      const { data, error } = await supabase.from('estrutura_equipe_membros').select('*');
      if (error) throw error;
      return data as EquipeMembro[];
    },
  });

export const useEstruturaEmpresas = () =>
  useQuery({
    queryKey: ['empresas_faturamento'],
    queryFn: async () => {
      const { data, error } = await supabase.from('empresas_faturamento').select('*').eq('is_active', true).order('nome');
      if (error) throw error;
      return data as EmpresaFat[];
    },
  });

export const useEstruturaCentrosCusto = () =>
  useQuery({
    queryKey: ['centros_custo'],
    queryFn: async () => {
      const { data, error } = await supabase.from('centros_custo').select('*').eq('is_active', true).order('codigo');
      if (error) throw error;
      return data as CentroCusto[];
    },
  });

// ── Mutations ──────────────────────────────────────────────────────────

export const useEstruturaMutations = () => {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();

  const invalidateAll = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['estrutura-clusters'] });
    qc.invalidateQueries({ queryKey: ['estrutura-areas'] });
    qc.invalidateQueries({ queryKey: ['estrutura-lideres'] });
    qc.invalidateQueries({ queryKey: ['estrutura-equipes'] });
    qc.invalidateQueries({ queryKey: ['estrutura-membros'] });
  }, [qc]);

  // ─── Cluster ──────────────────────────────────────────────────
  const saveCluster = useCallback(async (
    form: { name: string; cost_center: string | null; empresa_id: string | null },
    editing: Cluster | null,
  ) => {
    if (!form.name.trim()) { toast.error('Nome é obrigatório'); return; }
    if (editing) {
      const { error } = await supabase.from('estrutura_clusters')
        .update({ name: form.name, cost_center: form.cost_center, empresa_id: form.empresa_id })
        .eq('id', editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Cluster atualizado');
      logAction({
        area: 'estrutura', entity_type: 'cluster', entity_id: editing.id,
        entity_name: form.name, action: 'updated',
        changed_fields: {
          name: { old: editing.name, new: form.name },
          empresa_id: { old: editing.empresa_id, new: form.empresa_id },
        },
      });
    } else {
      const { data, error } = await supabase.from('estrutura_clusters')
        .insert({ name: form.name, cost_center: form.cost_center, empresa_id: form.empresa_id })
        .select('id').single();
      if (error) { toast.error(error.message); return; }
      toast.success('Cluster criado');
      logAction({ area: 'estrutura', entity_type: 'cluster', entity_id: data.id, entity_name: form.name, action: 'created' });
    }
    invalidateAll();
  }, [logAction, invalidateAll]);

  const deleteCluster = useCallback(async (cluster: Cluster) => {
    const { error } = await supabase.from('estrutura_clusters').delete().eq('id', cluster.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Cluster excluído');
    logAction({ area: 'estrutura', entity_type: 'cluster', entity_id: cluster.id, entity_name: cluster.name, action: 'deleted' });
    invalidateAll();
  }, [logAction, invalidateAll]);

  // ─── Area ─────────────────────────────────────────────────────
  const saveArea = useCallback(async (
    form: { name: string; color: string; cluster_id: string; page_categories: string[]; cost_center_id: string | null },
    editing: Area | null,
  ) => {
    if (!form.name.trim()) { toast.error('Nome é obrigatório'); return; }
    if (editing) {
      const { error } = await supabase.from('estrutura_areas')
        .update({ name: form.name, color: form.color, page_categories: form.page_categories, cost_center_id: form.cost_center_id })
        .eq('id', editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Área atualizada');
      logAction({
        area: 'estrutura', entity_type: 'area', entity_id: editing.id,
        entity_name: form.name, action: 'updated',
        changed_fields: {
          name: { old: editing.name, new: form.name },
          color: { old: editing.color, new: form.color },
          page_categories: { old: editing.page_categories, new: form.page_categories },
        },
      });
    } else {
      const { data, error } = await supabase.from('estrutura_areas')
        .insert({ name: form.name, color: form.color, cluster_id: form.cluster_id, page_categories: form.page_categories, cost_center_id: form.cost_center_id })
        .select('id').single();
      if (error) { toast.error(error.message); return; }
      toast.success('Área criada');
      logAction({ area: 'estrutura', entity_type: 'area', entity_id: data.id, entity_name: form.name, action: 'created' });
    }
    invalidateAll();
  }, [logAction, invalidateAll]);

  const deleteArea = useCallback(async (area: Area) => {
    const { error } = await supabase.from('estrutura_areas').delete().eq('id', area.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Área excluída');
    logAction({ area: 'estrutura', entity_type: 'area', entity_id: area.id, entity_name: area.name, action: 'deleted' });
    invalidateAll();
  }, [logAction, invalidateAll]);

  // ─── Lider ────────────────────────────────────────────────────
  const setAreaLider = useCallback(async (areaId: string, userId: string | null, areaName: string, oldUserId: string | null) => {
    await supabase.from('estrutura_area_lideres').delete().eq('area_id', areaId);
    if (userId) {
      const { error } = await supabase.from('estrutura_area_lideres').insert({ area_id: areaId, user_id: userId });
      if (error) { toast.error(error.message); return; }
    }
    toast.success('Líder atualizado');
    logAction({
      area: 'estrutura', entity_type: 'lider', entity_id: areaId,
      entity_name: areaName, action: 'updated',
      changed_fields: { user_id: { old: oldUserId, new: userId } },
    });
    invalidateAll();
  }, [logAction, invalidateAll]);

  // ─── Equipe ───────────────────────────────────────────────────
  const saveEquipe = useCallback(async (
    form: { name: string; area_id: string; sublider_id: string | null },
    editing: Equipe | null,
  ) => {
    if (!form.name.trim()) { toast.error('Nome é obrigatório'); return; }
    if (editing) {
      const { error } = await supabase.from('estrutura_equipes')
        .update({ name: form.name, sublider_id: form.sublider_id })
        .eq('id', editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Equipe atualizada');
      logAction({
        area: 'estrutura', entity_type: 'equipe', entity_id: editing.id,
        entity_name: form.name, action: 'updated',
        changed_fields: {
          name: { old: editing.name, new: form.name },
          sublider_id: { old: editing.sublider_id, new: form.sublider_id },
        },
      });
    } else {
      const { data, error } = await supabase.from('estrutura_equipes')
        .insert({ name: form.name, area_id: form.area_id, sublider_id: form.sublider_id })
        .select('id').single();
      if (error) { toast.error(error.message); return; }
      toast.success('Equipe criada');
      logAction({ area: 'estrutura', entity_type: 'equipe', entity_id: data.id, entity_name: form.name, action: 'created' });
    }
    invalidateAll();
  }, [logAction, invalidateAll]);

  const deleteEquipe = useCallback(async (equipe: Equipe) => {
    const { error } = await supabase.from('estrutura_equipes').delete().eq('id', equipe.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Equipe excluída');
    logAction({ area: 'estrutura', entity_type: 'equipe', entity_id: equipe.id, entity_name: equipe.name, action: 'deleted' });
    invalidateAll();
  }, [logAction, invalidateAll]);

  // ─── Membros ──────────────────────────────────────────────────
  const addMembro = useCallback(async (equipeId: string, userId: string, equipeName: string, profileLabel: string) => {
    const { data, error } = await supabase.from('estrutura_equipe_membros')
      .insert({ equipe_id: equipeId, user_id: userId })
      .select('id').single();
    if (error) { toast.error(error.message); return; }
    toast.success('Membro adicionado');
    logAction({
      area: 'estrutura', entity_type: 'membro', entity_id: data.id,
      entity_name: profileLabel, action: 'created',
      details: `Adicionado à equipe ${equipeName}`,
    });
    invalidateAll();
  }, [logAction, invalidateAll]);

  const removeMembro = useCallback(async (id: string, profileLabel: string) => {
    const { error } = await supabase.from('estrutura_equipe_membros').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Membro removido');
    logAction({ area: 'estrutura', entity_type: 'membro', entity_id: id, entity_name: profileLabel, action: 'deleted' });
    invalidateAll();
  }, [logAction, invalidateAll]);

  return {
    saveCluster, deleteCluster,
    saveArea, deleteArea,
    setAreaLider,
    saveEquipe, deleteEquipe,
    addMembro, removeMembro,
    invalidateAll,
  };
};
