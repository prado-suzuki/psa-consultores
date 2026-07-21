// Anexos de um entregável (tabela `deliverable_attachments` + bucket de storage
// `deliverable-attachments`). Encapsula tabela E storage — telas não devem tocar
// supabase.from()/supabase.storage direto.

import {
  useQuery, useMutation, useQueryClient,
  type UseQueryResult, type UseMutationResult,
} from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { assertCanPerform } from '@/hooks/useRlsPrecheck';

export interface DeliverableAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string | null;
  uploaded_at: string;
}

const TABLE = 'deliverable_attachments';
const BUCKET = 'deliverable-attachments';

export function useDeliverableAttachments(
  deliverableId: string | undefined,
): UseQueryResult<DeliverableAttachment[]> {
  return useQuery<DeliverableAttachment[]>({
    queryKey: [TABLE, deliverableId],
    enabled: !!deliverableId,
    queryFn: async () => {
      if (!deliverableId) return [];
      const { data, error } = await supabase
        .from(TABLE as never)
        .select('*')
        .eq('deliverable_id', deliverableId)
        .order('uploaded_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as DeliverableAttachment[];
    },
  });
}

export function useUploadDeliverableAttachment(): UseMutationResult<
  void, Error, { deliverableId: string; file: File }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ deliverableId, file }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const fileExt = file.name.split('.').pop();
      const fileName = `${deliverableId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(fileName, file);
      if (uploadError) throw new Error(uploadError.message);

      const { error: dbError } = await supabase.from(TABLE as never).insert({
        deliverable_id: deliverableId,
        file_name: file.name,
        file_path: fileName,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: userData.user.id,
      } as never);
      if (dbError) throw new Error(dbError.message);
    },
    onSuccess: (_data, { deliverableId }) => {
      qc.invalidateQueries({ queryKey: [TABLE, deliverableId] });
    },
  });
}

export function useDeleteDeliverableAttachment(): UseMutationResult<
  void, Error, { id: string; filePath: string; deliverableId: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, filePath }) => {
      // Precheck antes do storage — evita perder o arquivo se RLS bloquear o delete na tabela.
      await assertCanPerform(TABLE, 'delete', id);
      await supabase.storage.from(BUCKET).remove([filePath]);
      const { error } = await supabase.from(TABLE as never).delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, { deliverableId }) => {
      qc.invalidateQueries({ queryKey: [TABLE, deliverableId] });
    },
  });
}

/** Baixa um anexo do storage e dispara o download no navegador. */
export async function downloadDeliverableAttachment(
  attachment: { file_path: string; file_name: string },
): Promise<void> {
  const { data, error } = await supabase.storage.from(BUCKET).download(attachment.file_path);
  if (error) throw new Error(error.message);
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = attachment.file_name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
