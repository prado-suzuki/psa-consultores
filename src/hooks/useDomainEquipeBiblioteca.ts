import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { assertCanPerform } from '@/hooks/useRlsPrecheck';
import { toast } from 'sonner';

export interface ProjectDocument {
  id: string;
  title: string;
  description: string | null;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  category: string | null;
  sprint_id: string | null;
  process_id: string | null;
  uploaded_by: string | null;
  created_at: string;
  sprints?: { name: string } | null;
  profiles?: { first_name: string; last_name: string } | null;
  processes?: { name: string; code: string | null } | null;
}

interface UploadDocumentInput {
  file: File | null;
  userId: string | undefined;
  title: string;
  description: string;
  category: string;
  sprintId: string;
}

interface UseDomainEquipeBibliotecaOptions {
  onUploadStart: () => void;
  onUploadSuccess: () => void;
  onUploadSettled: () => void;
}

const projectDocumentsQueryKey = ['project-documents'] as const;
const processesListQueryKey = ['processes-list'] as const;
const sprintsListQueryKey = ['sprints-list'] as const;

export function useDomainEquipeBiblioteca({
  onUploadStart,
  onUploadSuccess,
  onUploadSettled,
}: UseDomainEquipeBibliotecaOptions) {
  const queryClient = useQueryClient();

  const documentsQuery = useQuery({
    queryKey: projectDocumentsQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_documents')
        .select(`
          *,
          sprints:sprint_id(name),
          profiles:uploaded_by(first_name, last_name),
          processes:process_id(name, code)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProjectDocument[];
    },
  });

  const processesQuery = useQuery({
    queryKey: processesListQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('processes')
        .select('id, name, code')
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  const sprintsQuery = useQuery({
    queryKey: sprintsListQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sprints')
        .select('id, name')
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({
      file,
      userId,
      title,
      description,
      category,
      sprintId,
    }: UploadDocumentInput) => {
      if (!file || !userId) throw new Error('Arquivo e usuário necessários');

      onUploadStart();

      const filePath = `${userId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from('project_documents').insert({
        title,
        description: description || null,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        category,
        sprint_id: sprintId || null,
        uploaded_by: userId,
      });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      toast.success('Documento enviado com sucesso');
      void queryClient.invalidateQueries({ queryKey: projectDocumentsQueryKey });
      onUploadSuccess();
    },
    onError: (error: Error) => {
      toast.error('Erro ao enviar documento: ' + error.message);
    },
    onSettled: () => {
      onUploadSettled();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (doc: ProjectDocument) => {
      await assertCanPerform('project_documents', 'delete', doc.id);

      const { error: storageError } = await supabase.storage
        .from('project-documents')
        .remove([doc.file_path]);

      if (storageError) console.warn('Storage delete error:', storageError);

      const { error: deleteError } = await supabase
        .from('project_documents')
        .delete()
        .eq('id', doc.id);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      toast.success('Documento excluído');
      void queryClient.invalidateQueries({ queryKey: projectDocumentsQueryKey });
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir: ' + error.message);
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async (doc: ProjectDocument) => {
      const { data, error } = await supabase.storage
        .from('project-documents')
        .download(doc.file_path);

      if (error) throw error;
      return data;
    },
    onError: () => {
      toast.error('Erro ao baixar arquivo');
    },
  });

  const previewMutation = useMutation({
    mutationFn: async (doc: ProjectDocument) => {
      const { data, error } = await supabase.storage
        .from('project-documents')
        .download(doc.file_path);

      if (error) throw error;
      return data;
    },
    onError: () => {
      toast.error('Erro ao carregar preview');
    },
  });

  return {
    documents: documentsQuery.data ?? [],
    processesList: processesQuery.data ?? [],
    sprints: sprintsQuery.data ?? [],
    isLoading: documentsQuery.isLoading,
    uploadMutation,
    deleteMutation,
    downloadMutation,
    previewMutation,
  };
}
