import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuditLog } from '@/hooks/useAuditLog';
import type { Database } from '@/integrations/supabase/types';

type RegraNCMRow = Database['public']['Tables']['pis_cofins_regra']['Row'];
type RegraNCMInsert = Database['public']['Tables']['pis_cofins_regra']['Insert'];
type RegraNCMUpdate = Database['public']['Tables']['pis_cofins_regra']['Update'];

const QUERY_KEY = ['regras-ncm-pis-cofins'];

export const useRegrasNCM = () => {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pis_cofins_regra')
        .select('*')
        .order('cod_ncm');
      if (error) throw error;
      return data as RegraNCMRow[];
    },
  });

  const createRegra = useMutation({
    mutationFn: async (regra: Omit<RegraNCMInsert, 'id' | 'id_segmento'>) => {
      const { data, error } = await supabase
        .from('pis_cofins_regra')
        .insert({ ...regra, id_segmento: 'geral' })
        .select()
        .single();
      if (error) throw error;
      return data as RegraNCMRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      logAction({
        area: 'dev',
        entity_type: 'regra_pis_cofins',
        entity_id: data.id,
        entity_name: data.cod_ncm ?? 'NCM',
        action: 'created',
      });
    },
  });

  const updateRegra = useMutation({
    mutationFn: async ({ id, ...updates }: RegraNCMUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('pis_cofins_regra')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as RegraNCMRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      logAction({
        area: 'dev',
        entity_type: 'regra_pis_cofins',
        entity_id: data.id,
        entity_name: data.cod_ncm ?? 'NCM',
        action: 'updated',
      });
    },
  });

  const deleteRegra = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pis_cofins_regra')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      logAction({
        area: 'dev',
        entity_type: 'regra_pis_cofins',
        entity_id: id,
        entity_name: 'Regra removida',
        action: 'deleted',
      });
    },
  });

  return {
    regras: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createRegra,
    updateRegra,
    deleteRegra,
  };
};
