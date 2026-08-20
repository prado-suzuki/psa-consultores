import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { assertCanPerform } from '@/hooks/useRlsPrecheck';

export interface ControleAcessosAreaInterna {
  id: string;
  name: string;
  responsible: string | null;
  description: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
  estrutura_area_id: string | null;
}

export interface ControleAcessosCadastroStats {
  clients: number;
  projects: number;
  processes: number;
}

export interface ControleAcessosCadastroPayload {
  name: string;
  responsible: string | null;
  description: string | null;
  color: string;
  estrutura_area_id: string | null;
}

interface EstruturaAreaMapping {
  color_index: number | null;
  id: string;
  name: string;
  color: string | null;
}

interface ControleAcessosCadastrosData {
  areas: ControleAcessosAreaInterna[];
  stats: ControleAcessosCadastroStats;
}

interface UpdateCatalogClientInput {
  id: string;
  payload: ControleAcessosCadastroPayload;
}

interface ToggleCatalogClientInput {
  id: string;
  isActive: boolean;
}

export const controleAcessosQueryKeys = {
  estruturaAreas: ['estrutura-areas-for-mapping'] as const,
  cadastros: ['controle-acessos', 'catalog-clients-cadastros'] as const,
};

const controleAcessosMutationKeys = {
  createCatalogClient: ['controle-acessos', 'catalog-clients', 'create'] as const,
  updateCatalogClient: ['controle-acessos', 'catalog-clients', 'update'] as const,
  toggleCatalogClient: ['controle-acessos', 'catalog-clients', 'toggle'] as const,
  deleteCatalogClient: ['controle-acessos', 'catalog-clients', 'delete'] as const,
};

export function useControleAcessosEstruturaAreas() {
  return useQuery<EstruturaAreaMapping[]>({
    queryKey: controleAcessosQueryKeys.estruturaAreas,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estrutura_areas')
        .select('id, name, color, color_index')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as EstruturaAreaMapping[];
    },
  });
}

export function useControleAcessosCadastros() {
  return useQuery<ControleAcessosCadastrosData>({
    queryKey: controleAcessosQueryKeys.cadastros,
    enabled: false,
    retry: false,
    queryFn: async () => {
      const { data: clientsData, error: clientsError } = await supabase
        .from('catalog_clients')
        .select('*')
        .order('name');

      if (clientsError) throw clientsError;

      const [projectsRes, processesRes] = await Promise.all([
        supabase.from('projects').select('id', { count: 'exact', head: true }),
        supabase.from('processes').select('id', { count: 'exact', head: true }),
      ]);
      const areas = (clientsData ?? []) as ControleAcessosAreaInterna[];

      return {
        areas,
        stats: {
          clients: areas.length,
          projects: projectsRes.count || 0,
          processes: processesRes.count || 0,
        },
      };
    },
  });
}

export function useControleAcessosCatalogMutations() {
  const queryClient = useQueryClient();
  const invalidateCadastros = () => {
    void queryClient.invalidateQueries({ queryKey: controleAcessosQueryKeys.cadastros });
  };

  const createCatalogClient = useMutation({
    mutationKey: controleAcessosMutationKeys.createCatalogClient,
    mutationFn: async (payload: ControleAcessosCadastroPayload) => {
      const { error } = await supabase.from('catalog_clients').insert(payload);
      if (error) throw error;
    },
    onSuccess: invalidateCadastros,
  });

  const updateCatalogClient = useMutation({
    mutationKey: controleAcessosMutationKeys.updateCatalogClient,
    mutationFn: async ({ id, payload }: UpdateCatalogClientInput) => {
      await assertCanPerform('catalog_clients', 'update', id);
      const { error } = await supabase.from('catalog_clients').update(payload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidateCadastros,
  });

  const toggleCatalogClient = useMutation({
    mutationKey: controleAcessosMutationKeys.toggleCatalogClient,
    mutationFn: async ({ id, isActive }: ToggleCatalogClientInput) => {
      await assertCanPerform('catalog_clients', 'update', id);
      const { error } = await supabase
        .from('catalog_clients')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: invalidateCadastros,
  });

  const deleteCatalogClient = useMutation({
    mutationKey: controleAcessosMutationKeys.deleteCatalogClient,
    mutationFn: async (id: string) => {
      await assertCanPerform('catalog_clients', 'delete', id);
      const { error } = await supabase.from('catalog_clients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidateCadastros,
  });

  return {
    createCatalogClient: createCatalogClient.mutateAsync,
    updateCatalogClient: updateCatalogClient.mutateAsync,
    toggleCatalogClient: toggleCatalogClient.mutateAsync,
    deleteCatalogClient: deleteCatalogClient.mutateAsync,
  };
}
