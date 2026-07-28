import { Download, FileText, ImageIcon, Loader2, Paperclip } from 'lucide-react';

import type { AreaKey } from '@/config/areaCategories';
import {
  abrirAnexoEmNovaAba,
  type OrgCommentAttachment,
  type OrgCommentEntityType,
  useDomainOrgComments,
} from '@/hooks/useDomainOrgComments';
import { cn } from '@/lib/utils';

/**
 * Anexos da thread de comentários — o card do arquivo e a listagem agregada.
 *
 * Não existe anexo "de tarefa": todo arquivo entra por um comentário
 * (`org_comment_attachments`). A listagem agregada é a visão de biblioteca
 * desses arquivos, para quem quer o anexo sem varrer a conversa.
 */
export function AttachmentButton({
  attachment,
  onOpen,
}: {
  attachment: OrgCommentAttachment;
  onOpen: (attachment: OrgCommentAttachment) => void;
}) {
  const isImage = attachment.file_type?.startsWith('image/');
  return (
    <button
      type="button"
      onClick={() => onOpen(attachment)}
      className="group flex min-w-0 items-center gap-2 rounded-lg border bg-background px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
    >
      {isImage ? (
        <ImageIcon className="h-4 w-4 shrink-0 text-primary" />
      ) : (
        <FileText className="h-4 w-4 shrink-0 text-primary" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium">{attachment.file_name}</span>
        <span className="block text-[11px] text-muted-foreground">
          {(attachment.file_size / 1024).toFixed(1)} KB
        </span>
      </span>
      <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
    </button>
  );
}

interface OrgEntityAttachmentsProps {
  entityType?: OrgCommentEntityType;
  entityId: string;
  projectId?: string | null;
  area: AreaKey;
  className?: string;
}

/**
 * Todos os anexos já enviados na thread da entidade, do mais antigo ao mais
 * novo. Consome a mesma query key do painel de atividade — não há requisição
 * extra quando os dois estão na tela.
 */
export function OrgEntityAttachments({
  entityType = 'org_task',
  entityId,
  projectId,
  area,
  className,
}: OrgEntityAttachmentsProps) {
  const { comments, isLoading, downloadAttachment } = useDomainOrgComments(
    entityType,
    entityId,
    area,
    projectId,
  );

  const attachments = comments
    .filter((comment) => !comment.excluido)
    .flatMap((comment) => comment.attachments);

  const openAttachment = async (attachment: OrgCommentAttachment) => {
    const result = await downloadAttachment.mutateAsync(attachment);
    abrirAnexoEmNovaAba(result.url, result.fileName);
  };

  if (isLoading) {
    return (
      <div className={cn('flex h-16 items-center justify-center', className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (attachments.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border border-dashed px-3 py-4 text-xs text-muted-foreground',
          className,
        )}
      >
        <Paperclip className="h-3.5 w-3.5" />
        Nenhum anexo ainda — envie arquivos junto com um comentário.
      </div>
    );
  }

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2', className)}>
      {attachments.map((attachment) => (
        <AttachmentButton key={attachment.id} attachment={attachment} onOpen={openAttachment} />
      ))}
    </div>
  );
}
