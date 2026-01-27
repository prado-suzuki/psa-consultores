import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type ExportToolType = 'xml' | 'efd';

export interface ExportProfile {
  id: string;
  user_id: string;
  name: string;
  columns: string[];
  is_default: boolean;
  tool_type: ExportToolType;
  created_at: string;
  updated_at: string;
}

export function useExportProfiles(toolType: ExportToolType = 'xml') {
  const queryClient = useQueryClient();

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['export-profiles', toolType],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('export_profiles')
        .select('*')
        .eq('user_id', user.id)
        .eq('tool_type', toolType)
        .order('name');

      if (error) throw error;
      return data as ExportProfile[];
    },
  });

  const createProfile = useMutation({
    mutationFn: async ({ name, columns, isDefault }: { name: string; columns: string[]; isDefault?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Se for padrão, remover padrão dos outros do mesmo tipo
      if (isDefault) {
        await supabase
          .from('export_profiles')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .eq('tool_type', toolType);
      }

      const { data, error } = await supabase
        .from('export_profiles')
        .insert({
          user_id: user.id,
          name,
          columns,
          tool_type: toolType,
          is_default: isDefault || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-profiles', toolType] });
      toast({ title: 'Perfil criado', description: 'O perfil de exportação foi salvo com sucesso.' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar perfil', description: error.message, variant: 'destructive' });
    },
  });

  const updateProfile = useMutation({
    mutationFn: async ({ id, name, columns, isDefault }: { id: string; name?: string; columns?: string[]; isDefault?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Se for padrão, remover padrão dos outros do mesmo tipo
      if (isDefault) {
        await supabase
          .from('export_profiles')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .eq('tool_type', toolType);
      }

      const updateData: Partial<ExportProfile> = {};
      if (name !== undefined) updateData.name = name;
      if (columns !== undefined) updateData.columns = columns;
      if (isDefault !== undefined) updateData.is_default = isDefault;

      const { data, error } = await supabase
        .from('export_profiles')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-profiles', toolType] });
      toast({ title: 'Perfil atualizado', description: 'O perfil foi atualizado com sucesso.' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar perfil', description: error.message, variant: 'destructive' });
    },
  });

  const deleteProfile = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('export_profiles')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-profiles', toolType] });
      toast({ title: 'Perfil excluído', description: 'O perfil foi excluído com sucesso.' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao excluir perfil', description: error.message, variant: 'destructive' });
    },
  });

  const setDefaultProfile = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Remover padrão de todos do mesmo tipo
      await supabase
        .from('export_profiles')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('tool_type', toolType);

      // Definir novo padrão
      const { error } = await supabase
        .from('export_profiles')
        .update({ is_default: true })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-profiles', toolType] });
      toast({ title: 'Perfil padrão definido', description: 'Este perfil será carregado automaticamente.' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao definir padrão', description: error.message, variant: 'destructive' });
    },
  });

  const defaultProfile = profiles?.find(p => p.is_default);

  return {
    profiles: profiles || [],
    isLoading,
    defaultProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    setDefaultProfile,
  };
}
