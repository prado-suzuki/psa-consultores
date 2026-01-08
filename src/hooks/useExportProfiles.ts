import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ExportProfile {
  id: string;
  user_id: string;
  name: string;
  columns: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function useExportProfiles() {
  const queryClient = useQueryClient();

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['export-profiles'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('export_profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      return data as ExportProfile[];
    },
  });

  const createProfile = useMutation({
    mutationFn: async ({ name, columns, isDefault }: { name: string; columns: string[]; isDefault?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Se for padrão, remover padrão dos outros
      if (isDefault) {
        await supabase
          .from('export_profiles')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      const { data, error } = await supabase
        .from('export_profiles')
        .insert({
          user_id: user.id,
          name,
          columns,
          is_default: isDefault || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-profiles'] });
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

      // Se for padrão, remover padrão dos outros
      if (isDefault) {
        await supabase
          .from('export_profiles')
          .update({ is_default: false })
          .eq('user_id', user.id);
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
      queryClient.invalidateQueries({ queryKey: ['export-profiles'] });
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
      queryClient.invalidateQueries({ queryKey: ['export-profiles'] });
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

      // Remover padrão de todos
      await supabase
        .from('export_profiles')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Definir novo padrão
      const { error } = await supabase
        .from('export_profiles')
        .update({ is_default: true })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-profiles'] });
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
