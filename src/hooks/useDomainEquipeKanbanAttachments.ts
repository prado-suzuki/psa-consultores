import { useMutation } from '@tanstack/react-query';
import { assertCanPerform } from '@/hooks/useRlsPrecheck';
import { supabase } from '@/integrations/supabase/client';
import { buildEquipeKanbanFilePath, type EquipeKanbanAttachment } from '@/lib/equipeKanban';

/**
 * De quem é o anexo. Tarefa da sprint é o caso de sempre, e por isso segue
 * aceitando o id cru; item do backlog vem em objeto (ver a migration
 * 20260922201001_anexos_do_item_do_backlog.sql).
 */
export type DonoDoAnexo = string | { backlogItemId: string };

type UploadAttachmentInput = { file: File } & (
  | { deliverableId: string }
  | { backlogItemId: string }
);

const colunaDoDono = (dono: DonoDoAnexo) =>
  typeof dono === 'string'
    ? { coluna: 'deliverable_id' as const, id: dono }
    : { coluna: 'backlog_item_id' as const, id: dono.backlogItemId };

const mutationOptions = { retry: false, networkMode: 'always', onError: () => undefined } as const;

async function loadAttachments(dono: DonoDoAnexo) {
  const { coluna, id } = colunaDoDono(dono);
  const { data } = await supabase
    .from('deliverable_attachments')
    .select('*')
    .eq(coluna, id)
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
    mutationFn: async (input: UploadAttachmentInput) => {
      const { file } = input;
      const dono: DonoDoAnexo =
        'deliverableId' in input ? input.deliverableId : { backlogItemId: input.backlogItemId };
      const { coluna, id } = colunaDoDono(dono);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');
      const filePath = buildEquipeKanbanFilePath(id, file);
      const { error: uploadError } = await supabase.storage
        .from('deliverable-attachments')
        .upload(filePath, file);
      if (uploadError) throw uploadError;
      const { error: metadataError } = await supabase.from('deliverable_attachments').insert({
        [coluna]: id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: userData.user.id,
      });
      if (metadataError) throw metadataError;
      return loadAttachments(dono);
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

  // URLs temporárias só para exibir miniatura de print no modal. O bucket é
  // privado, então sem isto a <img> não carrega.
  const previews = useMutation({
    mutationKey: ['domain-equipe-kanban', 'preview-attachments'],
    mutationFn: async (filePaths: string[]) => {
      if (filePaths.length === 0) return {} as Record<string, string>;
      const { data, error } = await supabase.storage
        .from('deliverable-attachments')
        .createSignedUrls(filePaths, 3600);
      if (error) throw error;
      const porCaminho: Record<string, string> = {};
      for (const item of data ?? []) {
        if (item.path && item.signedUrl) porCaminho[item.path] = item.signedUrl;
      }
      return porCaminho;
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

  return { load, upload, download, remove, previews };
}
