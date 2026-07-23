import { useMutation } from '@tanstack/react-query';
import { assertCanPerform } from '@/hooks/useRlsPrecheck';
import { supabase } from '@/integrations/supabase/client';
import { buildEquipeKanbanFilePath, type EquipeKanbanAttachment } from '@/lib/equipeKanban';

interface UploadAttachmentInput {
  deliverableId: string;
  file: File;
}

const mutationOptions = { retry: false, networkMode: 'always', onError: () => undefined } as const;

async function loadAttachments(deliverableId: string) {
  const { data } = await supabase
    .from('deliverable_attachments')
    .select('*')
    .eq('deliverable_id', deliverableId)
    .order('uploaded_at', { ascending: false });
  return (data || []) as EquipeKanbanAttachment[];
}

export function useEquipeKanbanAttachments() {
  const load = useMutation({
    mutationKey: ['domain-equipe-kanban', 'load-attachments'],
    mutationFn: loadAttachments,
    ...mutationOptions,
  });

  const upload = useMutation({
    mutationKey: ['domain-equipe-kanban', 'upload-attachment'],
    mutationFn: async ({ deliverableId, file }: UploadAttachmentInput) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');
      const filePath = buildEquipeKanbanFilePath(deliverableId, file);
      const { error: uploadError } = await supabase.storage
        .from('deliverable-attachments')
        .upload(filePath, file);
      if (uploadError) throw uploadError;
      const { error: metadataError } = await supabase.from('deliverable_attachments').insert({
        deliverable_id: deliverableId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: userData.user.id,
      });
      if (metadataError) throw metadataError;
      return loadAttachments(deliverableId);
    },
    ...mutationOptions,
  });

  const download = useMutation({
    mutationKey: ['domain-equipe-kanban', 'download-attachment'],
    mutationFn: async (filePath: string) => {
      const { data, error } = await supabase.storage
        .from('deliverable-attachments')
        .download(filePath);
      if (error) throw error;
      return data;
    },
    ...mutationOptions,
  });

  const remove = useMutation({
    mutationKey: ['domain-equipe-kanban', 'delete-attachment'],
    mutationFn: async (attachment: EquipeKanbanAttachment) => {
      await assertCanPerform('deliverable_attachments', 'delete', attachment.id);
      await supabase.storage.from('deliverable-attachments').remove([attachment.file_path]);
      await supabase.from('deliverable_attachments').delete().eq('id', attachment.id);
    },
    ...mutationOptions,
  });

  return { load, upload, download, remove };
}
