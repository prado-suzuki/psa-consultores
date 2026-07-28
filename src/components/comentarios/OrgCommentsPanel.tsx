import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type DragEvent } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  AtSign,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Reply,
  Send,
  Trash2,
  X,
} from 'lucide-react';

import { AttachmentButton } from '@/components/comentarios/OrgCommentAttachments';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import type { AreaKey } from '@/config/areaCategories';
import { useAuth } from '@/contexts/AuthContext';
import {
  abrirAnexoEmNovaAba,
  type OrgComment,
  type OrgCommentAttachment,
  type OrgCommentEntityType,
  useDomainOrgComments,
} from '@/hooks/useDomainOrgComments';
import { cn } from '@/lib/utils';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface MentionCandidate {
  id: string;
  name: string;
}

interface OrgCommentsPanelProps {
  /** Tarefa (padrão) ou projeto — a thread é a mesma nos dois casos. */
  entityType?: OrgCommentEntityType;
  entityId: string;
  projectId?: string | null;
  area: AreaKey;
  mentionCandidates: MentionCandidate[];
  /**
   * A cada incremento, o compositor recebe o foco. É como a coluna de detalhes
   * manda o "Adicionar anexo" para cá, já que todo arquivo entra por um
   * comentário.
   */
  focusComposerSignal?: number;
}

const SYSTEM_LABELS: Record<Exclude<OrgComment['kind'], 'comment'>, string> = {
  assignment_changed: 'Responsável alterado',
  review_submitted: 'Enviado para revisão',
  review_approved: 'Revisão aprovada',
  review_adjustments: 'Ajustes solicitados',
  status_changed: 'Status alterado',
};

function initials(name: string | null) {
  return (name || 'Usuário')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function displayBody(body: string) {
  return body.replace(/\[\[review-rich-text:v1\]\]/g, '');
}

function systemEventBody(comment: OrgComment) {
  if (comment.kind === 'review_submitted') {
    return comment.body.replace(/^Enviado para revisão(?: de [^:]+)?:\s*/, '');
  }
  if (comment.kind === 'review_adjustments') {
    return comment.body.replace(/^Devolvido para ajustes:\s*/, '');
  }
  if (comment.kind === 'review_approved' && comment.body === 'Tarefa aprovada') return '';
  return comment.body;
}

function CommentBody({ body }: { body: string }) {
  const parts = displayBody(body).split(/(@\[[^\]]+\]\([^)]+\))/g);
  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground/90">
      {parts.map((part, index) => {
        const mention = part.match(/^@\[([^\]]+)\]\([^)]+\)$/);
        return mention ? (
          <span
            key={`${part}-${index}`}
            className="rounded bg-primary/10 px-1 font-medium text-primary"
          >
            @{mention[1]}
          </span>
        ) : (
          part
        );
      })}
    </p>
  );
}

interface ComposerProps {
  compact?: boolean;
  isPending: boolean;
  mentionCandidates: MentionCandidate[];
  /** Muda de valor quando alguém pede o foco daqui de fora (ver `focusComposerSignal`). */
  focusSignal?: number;
  onCancel?: () => void;
  onSubmit: (body: string, files: File[], mentions: string[]) => Promise<void>;
}

function CommentComposer({
  compact,
  isPending,
  mentionCandidates,
  focusSignal,
  onCancel,
  onSubmit,
}: ComposerProps) {
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!focusSignal) return;
    textareaRef.current?.focus();
  }, [focusSignal]);

  const addFiles = (incoming: File[]) => {
    const valid = incoming.filter((file) => file.size <= MAX_FILE_SIZE);
    if (valid.length !== incoming.length) toast.error('Cada anexo deve ter no máximo 10 MB');
    if (files.length + valid.length > MAX_FILES) toast.error('Você pode anexar até 5 arquivos');
    setFiles((current) => [...current, ...valid].slice(0, MAX_FILES));
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedFiles = Array.from(event.clipboardData.files);
    if (pastedFiles.length > 0) addFiles(pastedFiles);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    addFiles(Array.from(event.dataTransfer.files));
  };

  const insertMention = (candidate: MentionCandidate) => {
    setBody(
      (current) =>
        `${current}${current && !current.endsWith(' ') ? ' ' : ''}@[${candidate.name}](${candidate.id}) `,
    );
    setMentionOpen(false);
  };

  const submit = async () => {
    const trimmedBody = body.trim() || (files.length > 0 ? 'Adicionou anexos' : '');
    if (!trimmedBody || isPending) return;
    const mentions = Array.from(
      trimmedBody.matchAll(/@\[[^\]]+\]\(([^)]+)\)/g),
      (match) => match[1],
    );
    await onSubmit(trimmedBody, files, mentions);
    setBody('');
    setFiles([]);
  };

  return (
    <div
      className={cn('rounded-xl border bg-background p-3 shadow-sm', compact && 'mt-3')}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <Textarea
        ref={textareaRef}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onPaste={handlePaste}
        placeholder={
          compact ? 'Escreva uma resposta...' : 'Escreva um comentário... Use @ para mencionar'
        }
        rows={compact ? 2 : 3}
        className="resize-none border-0 p-0 shadow-none focus-visible:ring-0"
      />

      {files.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {files.map((file, index) => (
            <span
              key={`${file.name}-${index}`}
              className="flex max-w-full items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"
            >
              <Paperclip className="h-3 w-3" />
              <span className="max-w-44 truncate">{file.name}</span>
              <button
                type="button"
                aria-label={`Remover ${file.name}`}
                onClick={() =>
                  setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))
                }
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t pt-2">
        <div className="flex items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => addFiles(Array.from(event.target.files ?? []))}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Adicionar anexos"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Popover open={mentionOpen} onOpenChange={setMentionOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Mencionar pessoa"
              >
                <AtSign className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <p className="px-2 pb-2 text-xs font-medium text-muted-foreground">
                Mencionar pessoa
              </p>
              <ScrollArea className="max-h-48">
                {mentionCandidates.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted"
                    onClick={() => insertMention(candidate)}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px]">
                        {initials(candidate.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{candidate.name}</span>
                  </button>
                ))}
              </ScrollArea>
            </PopoverContent>
          </Popover>
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            Até 5 arquivos de 10 MB
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            disabled={isPending || (!body.trim() && files.length === 0)}
            onClick={submit}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="ml-2">Publicar</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function OrgCommentsPanel({
  entityType = 'org_task',
  entityId,
  projectId,
  area,
  mentionCandidates,
  focusComposerSignal,
}: OrgCommentsPanelProps) {
  const { user } = useAuth();
  const {
    comments,
    isLoading,
    createComment,
    isCreating,
    updateComment,
    deleteComment,
    downloadAttachment,
  } = useDomainOrgComments(entityType, entityId, area, projectId);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState('');

  const roots = useMemo(() => comments.filter((comment) => !comment.parent_id), [comments]);
  const repliesByRoot = useMemo(() => {
    const map = new Map<string, OrgComment[]>();
    comments
      .filter((comment) => comment.parent_id && !comment.excluido)
      .forEach((comment) => {
        const replies = map.get(comment.parent_id!) ?? [];
        replies.push(comment);
        map.set(comment.parent_id!, replies);
      });
    return map;
  }, [comments]);

  const openAttachment = async (attachment: OrgCommentAttachment) => {
    const result = await downloadAttachment.mutateAsync(attachment);
    abrirAnexoEmNovaAba(result.url, result.fileName);
  };

  const saveEdit = async (comment: OrgComment) => {
    const body = editingBody.trim();
    if (!body) return;
    await updateComment.mutateAsync({ id: comment.id, body });
    setEditingId(null);
  };

  const renderComment = (comment: OrgComment, nested = false) => {
    const isSystem = comment.kind !== 'comment';
    const replies = repliesByRoot.get(comment.id) ?? [];
    if (comment.excluido && replies.length === 0) return null;

    return (
      <div key={comment.id} className={cn('relative', nested && 'ml-10')}>
        <div className="flex gap-3 py-3">
          <Avatar className={cn('h-8 w-8 border', isSystem && 'bg-primary/10')}>
            <AvatarFallback className={cn('text-[10px] font-semibold', isSystem && 'text-primary')}>
              {isSystem ? 'PSA' : initials(comment.author_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold">
                {isSystem ? SYSTEM_LABELS[comment.kind] : comment.author_name || 'Usuário removido'}
              </span>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
              {!isSystem && comment.author_id === user?.id && !comment.excluido && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="ml-auto h-7 w-7">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingId(comment.id);
                        setEditingBody(comment.body);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => deleteComment.mutate(comment.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {comment.excluido ? (
              <p className="mt-1 text-sm italic text-muted-foreground">Comentário excluído</p>
            ) : editingId === comment.id ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={editingBody}
                  onChange={(event) => setEditingBody(event.target.value)}
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingId(null)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={updateComment.isPending}
                    onClick={() => saveEdit(comment)}
                  >
                    Salvar
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  'mt-1',
                  isSystem && 'rounded-lg border-l-2 border-primary/40 bg-muted/35 px-3 py-2',
                )}
              >
                {(!isSystem || systemEventBody(comment)) && (
                  <CommentBody body={isSystem ? systemEventBody(comment) : comment.body} />
                )}
                {comment.editado_em && (
                  <span className="text-[10px] text-muted-foreground">editado</span>
                )}
              </div>
            )}

            {comment.attachments.length > 0 && !comment.excluido && (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {comment.attachments.map((attachment) => (
                  <AttachmentButton
                    key={attachment.id}
                    attachment={attachment}
                    onOpen={openAttachment}
                  />
                ))}
              </div>
            )}

            {!nested && !isSystem && !comment.excluido && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-1 h-7 px-1 text-xs text-muted-foreground"
                onClick={() => setReplyingTo(comment.id)}
              >
                <Reply className="mr-1 h-3.5 w-3.5" />
                Responder
              </Button>
            )}
          </div>
        </div>
        {replies.map((reply) => renderComment(reply, true))}
        {replyingTo === comment.id && (
          <div className="ml-11">
            <CommentComposer
              compact
              isPending={isCreating}
              mentionCandidates={mentionCandidates}
              onCancel={() => setReplyingTo(null)}
              onSubmit={async (body, files, mentions) => {
                await createComment.mutateAsync({ body, files, mentions, parentId: comment.id });
                setReplyingTo(null);
              }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="flex h-full min-h-0 flex-col bg-muted/20">
      <div className="border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Atividade</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {comments.filter((comment) => !comment.excluido).length}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Comentários, anexos e atualizações {entityType === 'org_project' ? 'do projeto' : 'da tarefa'}
        </p>
      </div>

      <ScrollArea className="min-h-0 flex-1 px-5">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : roots.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center text-center">
            <div className="rounded-full bg-primary/10 p-3">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <p className="mt-3 text-sm font-medium">Nenhuma atividade ainda</p>
            <p className="mt-1 max-w-56 text-xs text-muted-foreground">
              Compartilhe uma atualização, mencione alguém ou anexe um arquivo.
            </p>
          </div>
        ) : (
          <div className="divide-y">{roots.map((comment) => renderComment(comment))}</div>
        )}
      </ScrollArea>

      <div className="border-t bg-background p-4">
        <CommentComposer
          isPending={isCreating}
          mentionCandidates={mentionCandidates}
          focusSignal={focusComposerSignal}
          onSubmit={async (body, files, mentions) => {
            await createComment.mutateAsync({ body, files, mentions });
          }}
        />
      </div>
    </aside>
  );
}
