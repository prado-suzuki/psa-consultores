import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { AreaKey } from '@/config/areaCategories';
import { useAuditLog } from '@/hooks/useAuditLog';
import { assertCanPerform } from '@/hooks/useRlsPrecheck';
import { supabase } from '@/integrations/supabase/client';
import { computeFieldDiff } from '@/lib/diffUtils';
import { textoPlanoDoCorpo } from '@/lib/orgCommentRichText';

/**
 * Camada de dados dos comentários de tarefa/projeto (`org_comments`).
 *
 * Centraliza thread, menções, anexos, edição e exclusão lógica. Componentes
 * consumidores não conhecem Supabase nem o bucket privado.
 *
 * ⚠️ DÍVIDA TÉCNICA (`as never` / casts de shim): `src/integrations/supabase/types.ts`
 * é autogerado e ainda não conhece a view `org_comments_feed` nem a função
 * `criar_org_comment` (tarefas EDU-08 a EDU-13). Enquanto isso, o nome da view e
 * da RPC entram por cast — a checagem de tipo fica desligada exatamente na
 * fronteira com o banco. Ao regenerar `types.ts`, remover os shims abaixo e usar
 * os tipos gerados. Registrado em `docs/geral/divida-tipos-org-comments.md`.
 */
const VIEW = 'org_comments_feed';
const RPC = 'criar_org_comment';

export type OrgCommentEntityType = 'org_task' | 'org_project';

export type OrgCommentKind =
  | 'comment'
  | 'assignment_changed'
  | 'review_submitted'
  | 'review_approved'
  | 'review_adjustments'
  | 'status_changed';

/**
 * Espelha as colunas de `public.org_comments_feed`.
 *
 * A view **não** filtra `excluido` — quem filtra é o consumidor, seguindo a
 * convenção de soft delete do AGENTS.md. Esta fatia esconde os excluídos; a
 * fatia de responder/excluir (BER-24) vai precisar deles para não deixar as
 * respostas de um comentário apagado órfãs na thread.
 */
export interface OrgComment {
  id: string;
  entity_type: OrgCommentEntityType;
  entity_id: string;
  project_id: string;
  parent_id: string | null;
  kind: OrgCommentKind;
  body: string;
  metadata: Record<string, unknown>;
  author_id: string | null;
  author_name: string | null;
  editado_em: string | null;
  created_at: string;
  updated_at: string;
  entity_title: string | null;
  project_name: string | null;
  reply_count: number;
  attachment_count: number;
  attachments: OrgCommentAttachment[];
  excluido: boolean;
}

/** A linha da view sem os anexos — o que basta para citar um comentário. */
export type OrgCommentSemAnexos = Omit<OrgComment, 'attachments'>;

export interface OrgCommentAttachment {
  id: string;
  comment_id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  file_type: string | null;
  width: number | null;
  height: number | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

/** Payload de anexo aceito pela RPC (fatia futura — sempre `[]` nesta). */
export interface OrgCommentAttachmentInput {
  file_path: string;
  file_name: string;
  file_size: number;
  file_type: string;
  width?: number | null;
  height?: number | null;
}

/** Parâmetros nomeados de `public.criar_org_comment` — contrato acordado com o banco. */
export interface CriarOrgCommentParams {
  _id: string;
  _entity_type: OrgCommentEntityType;
  _entity_id: string;
  _parent_id: string | null;
  _body: string;
  _mentions: string[];
  _attachments: OrgCommentAttachmentInput[];
}

export interface CreateOrgCommentInput {
  body: string;
  parentId?: string | null;
  mentions?: string[];
  files?: File[];
}

export const orgCommentsQueryKey = (entityType: OrgCommentEntityType, entityId: string) =>
  ['org-comments', entityType, entityId] as const;

interface SupabaseResult<T> {
  data: T | null;
  error: { message: string } | null;
}

/** Shim mínimo da view enquanto `types.ts` não a conhece (ver dívida no topo). */
interface FeedViewQuery {
  select: (columns: string) => FeedViewQuery;
  eq: (column: string, value: unknown) => FeedViewQuery;
  order: (
    column: string,
    options?: { ascending?: boolean },
  ) => PromiseLike<SupabaseResult<OrgComment[]>>;
}

/** Shim mínimo da view para buscar linhas por id (ver dívida no topo). */
interface FeedByIdQuery {
  select: (columns: string) => FeedByIdQuery;
  eq: (column: string, value: unknown) => FeedByIdQuery;
  in: (
    column: string,
    values: string[],
  ) => PromiseLike<SupabaseResult<OrgCommentSemAnexos[]>>;
}

interface AttachmentQuery {
  select: (columns: string) => AttachmentQuery;
  in: (column: string, values: string[]) => AttachmentQuery;
  order: (
    column: string,
    options?: { ascending?: boolean },
  ) => PromiseLike<SupabaseResult<OrgCommentAttachment[]>>;
}

interface UpdateCommentQuery {
  update: (values: Record<string, unknown>) => UpdateCommentQuery;
  eq: (column: string, value: unknown) => PromiseLike<SupabaseResult<unknown>>;
}

/** Shim mínimo da RPC enquanto `types.ts` não a conhece (ver dívida no topo). */
type CriarOrgCommentRpc = (
  fn: string,
  params: CriarOrgCommentParams,
) => PromiseLike<SupabaseResult<string>>;

const AUDIT_FIELDS = ['entity_type', 'entity_id', 'parent_id', 'body', 'mentions', 'attachments'];
const RESUMO_MAX = 80;
const BUCKET = 'comment-attachments';

/**
 * `entity_name` do audit: recorte legível do corpo, sem quebras de linha.
 *
 * Passa pelo texto plano porque o corpo é documento rico — logar o JSON não
 * diria nada a quem lê a trilha de auditoria.
 */
function resumoDoCorpo(body: string): string {
  const limpo = textoPlanoDoCorpo(body).trim().replace(/\s+/g, ' ');
  return limpo.length <= RESUMO_MAX ? limpo : `${limpo.slice(0, RESUMO_MAX)}…`;
}

function extensaoDoArquivo(file: File): string {
  const extension = file.name
    .split('.')
    .pop()
    ?.replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
  return extension ? `.${extension}` : '';
}

async function dimensoesDaImagem(
  file: File,
): Promise<{ width: number | null; height: number | null }> {
  if (!file.type.startsWith('image/')) return { width: null, height: null };

  try {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  } catch {
    return { width: null, height: null };
  }
}

/**
 * Anexos dos comentários informados, indexados por `comment_id`.
 *
 * Uma ida ao banco para o lote inteiro — é o que evita N+1 tanto na thread
 * quanto no feed de comentários, que reusa esta função para hidratar a página.
 */
export async function buscarAnexosPorComentario(
  commentIds: string[],
): Promise<Map<string, OrgCommentAttachment[]>> {
  const porComentario = new Map<string, OrgCommentAttachment[]>();
  if (commentIds.length === 0) return porComentario;

  const { data, error } = await (
    supabase.from('org_comment_attachments' as never) as unknown as AttachmentQuery
  )
    .select('*')
    .in('comment_id', commentIds)
    .order('uploaded_at', { ascending: true });

  if (error) throw error;
  for (const attachment of data ?? []) {
    const atuais = porComentario.get(attachment.comment_id) ?? [];
    atuais.push(attachment);
    porComentario.set(attachment.comment_id, atuais);
  }
  return porComentario;
}

/**
 * Comentários da view pelos ids, indexados por id — sem anexos.
 *
 * Existe para a caixa de menções, que parte da linha de `org_comment_mentions`
 * e precisa do comentário citado com título da entidade e nome do projeto (só a
 * view junta isso). Fica aqui, junto do shim da view, para o nome da view
 * continuar aparecendo num lugar só quando a dívida de tipos for paga.
 *
 * Filtra `excluido` na leitura, como manda a convenção de soft delete: menção a
 * comentário apagado não deve virar notificação.
 */
export async function buscarComentariosPorId(
  commentIds: string[],
): Promise<Map<string, OrgCommentSemAnexos>> {
  const porId = new Map<string, OrgCommentSemAnexos>();
  if (commentIds.length === 0) return porId;

  const { data, error } = await (supabase.from(VIEW as never) as unknown as FeedByIdQuery)
    .select('*')
    .eq('excluido', false)
    .in('id', commentIds);

  if (error) throw error;
  for (const comentario of data ?? []) porId.set(comentario.id, comentario);
  return porId;
}

/**
 * URL assinada de um anexo, para abrir sem tornar o bucket público.
 *
 * Fica separado da thread porque o feed de comentários também abre anexo, e ele
 * não monta o painel da entidade.
 */
export function useDownloadOrgCommentAttachment() {
  return useMutation({
    mutationFn: async (attachment: OrgCommentAttachment) => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(attachment.file_path, 60);
      if (error) throw error;
      return { url: data.signedUrl, fileName: attachment.file_name };
    },
    onError: (error: Error) => toast.error('Erro ao abrir anexo: ' + error.message),
  });
}

/** Abre a URL assinada do anexo em nova aba, preservando o nome original. */
export function abrirAnexoEmNovaAba(url: string, fileName: string) {
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function useDomainOrgComments(
  entityType: OrgCommentEntityType,
  entityId: string,
  area: AreaKey = 'tax',
  projectId?: string | null,
) {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  const commentsQuery = useQuery<OrgComment[]>({
    queryKey: orgCommentsQueryKey(entityType, entityId),
    queryFn: async () => {
      const { data, error } = await (supabase.from(VIEW as never) as unknown as FeedViewQuery)
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      const comments = data ?? [];
      if (comments.length === 0) return [];

      const attachmentsByComment = await buscarAnexosPorComentario(
        comments.map((comment) => comment.id),
      );

      return comments.map((comment) => ({
        ...comment,
        attachments: attachmentsByComment.get(comment.id) ?? [],
      }));
    },
    enabled: !!entityId,
  });

  const createComment = useMutation({
    mutationFn: async ({
      body,
      parentId = null,
      mentions = [],
      files = [],
    }: CreateOrgCommentInput) => {
      // O id nasce no cliente de propósito: as fatias de anexo sobem o arquivo
      // num caminho derivado do id do comentário, antes do comentário existir.
      const id = crypto.randomUUID();
      const uploadedPaths: string[] = [];

      const attachmentInputs: OrgCommentAttachmentInput[] = [];
      try {
        for (const file of files) {
          const filePath = `${projectId ?? commentsQuery.data?.[0]?.project_id ?? entityId}/${id}/${crypto.randomUUID()}${extensaoDoArquivo(file)}`;
          const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, file);
          if (uploadError) throw uploadError;
          uploadedPaths.push(filePath);

          const dimensions = await dimensoesDaImagem(file);
          attachmentInputs.push({
            file_path: filePath,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type || 'application/octet-stream',
            ...dimensions,
          });
        }

        const params: CriarOrgCommentParams = {
          _id: id,
          _entity_type: entityType,
          _entity_id: entityId,
          _parent_id: parentId,
          _body: body,
          _mentions: [...new Set(mentions)],
          _attachments: attachmentInputs,
        };

        const { data, error } = await (supabase.rpc as unknown as CriarOrgCommentRpc)(RPC, params);
        if (error) throw error;

        const commentId = data ?? id;

        await logAction({
          area: area as 'tax' | 'osg',
          entity_type: 'org_comment',
          entity_id: commentId,
          entity_name: resumoDoCorpo(body),
          action: 'created',
          changed_fields: computeFieldDiff(
            null,
            {
              entity_type: entityType,
              entity_id: entityId,
              parent_id: parentId,
              body,
              mentions: [...new Set(mentions)],
              attachments: attachmentInputs.map((attachment) => attachment.file_name),
            },
            AUDIT_FIELDS,
          ),
        });

        return commentId;
      } catch (error) {
        if (uploadedPaths.length > 0) await supabase.storage.from(BUCKET).remove(uploadedPaths);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgCommentsQueryKey(entityType, entityId) });
    },
    onError: (error: Error) => {
      toast.error('Erro ao publicar comentário: ' + error.message);
    },
  });

  const updateComment = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) => {
      const current = commentsQuery.data?.find((comment) => comment.id === id);
      await assertCanPerform('org_comments', 'update', id);
      const { error } = await (
        supabase.from('org_comments' as never) as unknown as UpdateCommentQuery
      )
        .update({ body })
        .eq('id', id);
      if (error) throw error;

      await logAction({
        area: area as 'tax' | 'osg',
        entity_type: 'org_comment',
        entity_id: id,
        entity_name: resumoDoCorpo(body),
        action: 'updated',
        changed_fields: computeFieldDiff({ ...current }, { ...current, body }, ['body']),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgCommentsQueryKey(entityType, entityId) });
    },
    onError: (error: Error) => toast.error('Erro ao editar comentário: ' + error.message),
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const current = commentsQuery.data?.find((comment) => comment.id === id);
      await assertCanPerform('org_comments', 'update', id);
      const { error } = await (
        supabase.from('org_comments' as never) as unknown as UpdateCommentQuery
      )
        .update({ excluido: true })
        .eq('id', id);
      if (error) throw error;

      await logAction({
        area: area as 'tax' | 'osg',
        entity_type: 'org_comment',
        entity_id: id,
        entity_name: resumoDoCorpo(current?.body ?? 'Comentário'),
        action: 'deleted',
        changed_fields: computeFieldDiff({ ...current }, { ...current, excluido: true }, [
          'excluido',
        ]),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgCommentsQueryKey(entityType, entityId) });
    },
    onError: (error: Error) => toast.error('Erro ao excluir comentário: ' + error.message),
  });

  const downloadAttachment = useDownloadOrgCommentAttachment();

  useEffect(() => {
    if (!entityId) return;
    const channel = supabase
      .channel(`org-comments:${entityType}:${entityId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'org_comments', filter: `entity_id=eq.${entityId}` },
        () =>
          queryClient.invalidateQueries({ queryKey: orgCommentsQueryKey(entityType, entityId) }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [entityId, entityType, queryClient]);

  return {
    comments: commentsQuery.data ?? [],
    isLoading: commentsQuery.isLoading,
    error: commentsQuery.error,
    createComment,
    isCreating: createComment.isPending,
    updateComment,
    deleteComment,
    downloadAttachment,
  };
}
