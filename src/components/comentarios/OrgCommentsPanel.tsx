import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageSquare, MoreHorizontal, Pencil, Reply, Trash2 } from 'lucide-react';
import { AreaLoader } from '@/components/equipe/AreaLoader';

import { CommentComposer } from '@/components/comentarios/CommentComposer';
import { OrgCommentBody } from '@/components/comentarios/OrgCommentBody';
import { OrgCommentEditor } from '@/components/comentarios/OrgCommentEditor';
import { OrgCommentOrigem } from '@/components/comentarios/OrgCommentOrigem';
import { AttachmentButton } from '@/components/comentarios/OrgCommentAttachments';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AreaKey } from '@/config/areaCategories';
import { useAuth } from '@/contexts/AuthContext';
import { useDomainMentionCandidates } from '@/hooks/useDomainMentionCandidates';
import {
  abrirAnexoEmNovaAba,
  type OrgComment,
  type OrgCommentAttachment,
  type OrgCommentEntityType,
  useDomainOrgComments,
} from '@/hooks/useDomainOrgComments';
import { useMarcarMencoesLidasDaThread } from '@/hooks/useNotificacoesMencao';
import { iniciaisDoNome } from '@/lib/orgCommentMentions';
import { docEstaVazio, lerCorpo } from '@/lib/orgCommentRichText';
import { cn } from '@/lib/utils';

interface OrgCommentsPanelProps {
  /** Tarefa (padrão) ou projeto — a thread é a mesma nos dois casos. */
  entityType?: OrgCommentEntityType;
  entityId: string;
  projectId?: string | null;
  area: AreaKey;
  /**
   * A cada incremento, o compositor recebe o foco. É como a coluna de detalhes
   * manda o "Adicionar anexo" para cá, já que todo arquivo entra por um
   * comentário.
   */
  focusComposerSignal?: number;
  /**
   * Origem da entidade, exibida como primeiro item do feed. Vem de quem já tem
   * a tarefa em mão, não de `org_comments`: assim a linha vale também para o
   * que foi criado antes de o feed existir, sem gravar comentário de sistema.
   * `nome` nulo quando o perfil não foi encontrado.
   */
  criadoPor?: { nome: string | null; em: string };
  /**
   * No projeto, mostra também os comentários das tarefas vinculadas a ele — a
   * conversa do projeto deixa de ser só o que foi dito no cadastro e passa a ser
   * tudo que se falou dentro dele. Cada bloco anuncia sua origem, e responder a
   * uma tarefa grava na tarefa, não no projeto.
   */
  consolidarTarefas?: boolean;
}

const SYSTEM_LABELS: Record<Exclude<OrgComment['kind'], 'comment'>, string> = {
  assignment_changed: 'Responsável alterado',
  review_submitted: 'Enviado para revisão',
  review_approved: 'Revisão aprovada',
  review_adjustments: 'Ajustes solicitados',
  status_changed: 'Status alterado',
  documentos_solicitados: 'Documentos solicitados ao cliente',
  documentos_cobrados: 'Documentos cobrados do cliente',
  documentos_conferidos: 'Documentos conferidos',
};

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

export function OrgCommentsPanel({
  entityType = 'org_task',
  entityId,
  projectId,
  area,
  focusComposerSignal,
  criadoPor,
  consolidarTarefas = false,
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
  } = useDomainOrgComments(entityType, entityId, area, projectId, { consolidarTarefas });
  const consolidado = consolidarTarefas && entityType === 'org_project';
  /**
   * Quem pode ser mencionado sai daqui, e só daqui: a roda de gente do projeto
   * desta thread. A tela nunca recebe uma lista pronta de fora, para não voltar
   * a oferecer o quadro inteiro da empresa no autocomplete.
   */
  const { candidates: mentionCandidates } = useDomainMentionCandidates(
    entityType,
    entityId,
    projectId,
  );
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  /** Corpo do comentário em edição, no mesmo formato de gravação. */
  const [editingBody, setEditingBody] = useState('');
  const [pendingDelete, setPendingDelete] = useState<OrgComment | null>(null);
  const scrollRootRef = useRef<HTMLDivElement>(null);
  /** Enquanto verdadeiro, a próxima renderização da lista desce para o fim. */
  const ancoraPendente = useRef(true);

  /**
   * Thread aberta é menção lida: baixa do sino as menções que estão nestes
   * comentários. Sem isso o contador ficaria pendurado mesmo depois de a pessoa
   * ler o comentário aqui, e só o clique no sino o limparia.
   */
  useMarcarMencoesLidasDaThread(useMemo(() => comments.map((comment) => comment.id), [comments]));

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

  /**
   * Raízes que de fato chegam à tela — a excluída sem resposta some, como manda
   * o corte de `renderComment`. A lista precisa existir aqui para o cabeçalho de
   * origem não anunciar uma tarefa cujo único comentário não vai aparecer.
   */
  const raizesVisiveis = useMemo(
    () => roots.filter((root) => !root.excluido || (repliesByRoot.get(root.id)?.length ?? 0) > 0),
    [roots, repliesByRoot],
  );

  /**
   * A thread abre no fim: ao abrir o modal, o que interessa é a última mensagem,
   * e o compositor está logo abaixo dela. A ordem cronológica da lista continua
   * ascendente — muda só onde o viewport nasce.
   */
  const ancorarNoFim = useCallback(() => {
    const viewport = scrollRootRef.current?.querySelector<HTMLElement>(
      '[data-radix-scroll-area-viewport]',
    );
    if (!viewport) return;
    // Um frame depois: anexos e respostas ainda estão medindo a altura final.
    requestAnimationFrame(() => {
      viewport.scrollTop = viewport.scrollHeight;
    });
  }, []);

  // Troca de tarefa/projeto reabre a thread, e ela volta a ancorar no fim.
  useEffect(() => {
    ancoraPendente.current = true;
  }, [entityType, entityId]);

  useEffect(() => {
    if (isLoading || comments.length === 0 || !ancoraPendente.current) return;
    ancorarNoFim();
    ancoraPendente.current = false;
  }, [ancorarNoFim, comments.length, isLoading]);

  const openAttachment = async (attachment: OrgCommentAttachment) => {
    const result = await downloadAttachment.mutateAsync(attachment);
    abrirAnexoEmNovaAba(result.url, result.fileName);
  };

  const saveEdit = async (comment: OrgComment) => {
    const corpo = lerCorpo(editingBody);
    const vazio = corpo.formato === 'rich' ? docEstaVazio(corpo.doc) : !corpo.texto.trim();
    if (vazio) return;
    await updateComment.mutateAsync({ id: comment.id, body: editingBody });
    setEditingId(null);
  };

  /**
   * `ultima` só existe por causa do fio: a última resposta encerra o traço no
   * próprio cotovelo, em vez de deixá-lo escorrer para fora da thread.
   */
  const renderComment = (
    comment: OrgComment,
    { nested = false, ultima = false }: { nested?: boolean; ultima?: boolean } = {},
  ) => {
    const isSystem = comment.kind !== 'comment';
    const replies = repliesByRoot.get(comment.id) ?? [];
    if (comment.excluido && replies.length === 0) return null;
    const isReplying = replyingTo === comment.id;
    const abreThread = !nested && (replies.length > 0 || isReplying);

    return (
      <div
        key={comment.id}
        className="relative"
        data-comment-root={nested ? undefined : comment.id}
      >
        {nested && (
          <>
            {/* Cotovelo que entra no avatar da resposta, saindo do fio da raiz. */}
            {/*
              `-left-6` devolve o cotovelo ao eixo do fio: a resposta mora dentro
              do `pl-10` do bloco, e o fio corre 24px à esquerda dela, no centro
              do avatar da raiz.
            */}
            <span
              aria-hidden
              data-thread-connector
              className="absolute -left-6 top-0 h-[22px] w-6 rounded-bl-lg border-b border-l border-border"
            />
            {/* Enquanto houver resposta abaixo, o fio segue descendo. */}
            {!ultima && (
              <span aria-hidden className="absolute -left-6 top-0 h-full w-px bg-border" />
            )}
          </>
        )}
        <div className={cn('relative flex gap-3 py-3', nested && 'gap-2.5 pt-2')}>
          {/*
            Trecho do fio que desce do avatar da raiz e acompanha o corpo dela
            até o começo das respostas — é o que faz raiz e respostas lerem como
            um bloco só, e não como comentários vizinhos.
          */}
          {abreThread && (
            <span aria-hidden className="absolute bottom-0 left-4 top-11 w-px bg-border" />
          )}
          <Avatar
            className={cn('border', nested ? 'h-7 w-7' : 'h-8 w-8', isSystem && 'bg-primary/10')}
          >
            <AvatarFallback
              className={cn(
                'font-semibold',
                nested ? 'text-[9px]' : 'text-[10px]',
                isSystem && 'text-primary',
              )}
            >
              {isSystem ? 'PSA' : iniciaisDoNome(comment.author_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={cn('truncate font-semibold', nested ? 'text-[13px]' : 'text-sm')}>
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="ml-auto h-7 w-7"
                      aria-label="Ações do comentário"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        // O editor abre qualquer das formas de corpo, inclusive o
                        // texto plano legado, com as menções já como chip.
                        setEditingId(comment.id);
                        setEditingBody(comment.body);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setPendingDelete(comment)}
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
              <div className="mt-2 space-y-2 rounded-lg border bg-background p-2">
                <OrgCommentEditor
                  value={editingBody}
                  onChange={setEditingBody}
                  candidates={mentionCandidates}
                  minHeight="min-h-12"
                  focarNaMontagem
                  onPublicar={() => saveEdit(comment)}
                  ariaLabel="Editar comentário"
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
                  <OrgCommentBody body={isSystem ? systemEventBody(comment) : comment.body} />
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

            {!nested && !isSystem && !comment.excluido && !isReplying && (
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

        {/*
          O fio da thread continua aqui dentro: cada resposta desenha seu próprio
          trecho e o cotovelo que entra no avatar. Segundo nível não existe — o
          trigger 2 do banco rejeita resposta de resposta, então o bloco só se
          abre na raiz.
        */}
        {abreThread && (
          <div className="relative pb-2 pl-10">
            {replies.map((reply, index) =>
              renderComment(reply, {
                nested: true,
                ultima: !isReplying && index === replies.length - 1,
              }),
            )}
            {isReplying && (
              <CommentComposer
                compact
                area={area}
                isPending={isCreating}
                mentionCandidates={mentionCandidates}
                replyingToName={comment.author_name}
                onCancel={() => setReplyingTo(null)}
                onSubmit={async (body, files, mentions) => {
                  // `respondidoId` junto do `parentId`: aqui os dois coincidem
                  // (só a raiz oferece "Responder"), mas é ele que faz o autor
                  // respondido receber a notificação, então vai explícito.
                  //
                  // O `alvo` é a entidade da raiz, não a do painel: na thread
                  // consolidada do projeto, responder ao comentário de uma
                  // tarefa grava na tarefa. Fora dela os dois coincidem.
                  await createComment.mutateAsync({
                    body,
                    files,
                    mentions,
                    parentId: comment.id,
                    respondidoId: comment.id,
                    alvo: { entityType: comment.entity_type, entityId: comment.entity_id },
                  });
                  setReplyingTo(null);
                }}
              />
            )}
          </div>
        )}
      </div>
    );
  };

  /**
   * Marco de origem, sempre no topo e fora da paginação: não é comentário, é a
   * criação da tarefa. Usa o mesmo desenho dos eventos de sistema para ler como
   * parte da thread, mas sem ações de editar, excluir ou responder.
   */
  const itemCriacao = criadoPor ? (
    <div className="flex items-center gap-2 py-3">
      <span className="truncate text-sm font-semibold">
        Tarefa criada por {criadoPor.nome ?? 'outro usuário'}
      </span>
      <span className="shrink-0 text-[11px] text-muted-foreground">
        {formatDistanceToNow(new Date(criadoPor.em), { addSuffix: true, locale: ptBR })}
      </span>
    </div>
  ) : null;

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
          Comentários, anexos e atualizações{' '}
          {consolidado
            ? 'do projeto e das tarefas dele'
            : entityType === 'org_project'
              ? 'do projeto'
              : 'da tarefa'}
        </p>
      </div>

      <ScrollArea ref={scrollRootRef} className="min-h-0 flex-1 px-5">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <AreaLoader area={area} size={40} />
          </div>
        ) : (
          <div className="divide-y">
            {itemCriacao}
            {raizesVisiveis.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center text-center">
                <div className="rounded-full bg-primary/10 p-3">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <p className="mt-3 text-sm font-medium">Nenhum comentário ainda</p>
                <p className="mt-1 max-w-56 text-xs text-muted-foreground">
                  Compartilhe uma atualização, mencione alguém ou anexe um arquivo.
                </p>
              </div>
            ) : (
              raizesVisiveis.map((comment, index) => {
                /*
                  A origem é anunciada só quando muda — falas seguidas da mesma
                  tarefa seguem como um bloco de conversa. O primeiro bloco,
                  quando é do próprio projeto, dispensa a etiqueta: é o painel
                  dele, e ninguém precisa que digam isso de novo.
                */
                const anterior = raizesVisiveis[index - 1];
                const mostraOrigem =
                  consolidado &&
                  anterior?.entity_id !== comment.entity_id &&
                  !(index === 0 && comment.entity_type === 'org_project');

                return (
                  <div key={comment.id}>
                    {mostraOrigem && <OrgCommentOrigem comentario={comment} />}
                    {renderComment(comment)}
                  </div>
                );
              })
            )}
          </div>
        )}
      </ScrollArea>

      <div className="border-t bg-background p-4">
        <CommentComposer
          area={area}
          isPending={isCreating}
          mentionCandidates={mentionCandidates}
          focusSignal={focusComposerSignal}
          onSubmit={async (body, files, mentions) => {
            await createComment.mutateAsync({ body, files, mentions });
            // O que acabei de publicar entra no fim da lista: desce até ele.
            ancoraPendente.current = true;
            ancorarNoFim();
          }}
        />
      </div>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir comentário?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete && (repliesByRoot.get(pendingDelete.id)?.length ?? 0) > 0
                ? 'O texto sai da thread e dá lugar ao aviso de comentário excluído, para as respostas não ficarem soltas.'
                : 'O comentário deixa de aparecer na thread. Não é possível desfazer pela tela.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteComment.isPending}
              onClick={async (event) => {
                event.preventDefault();
                if (!pendingDelete) return;
                try {
                  await deleteComment.mutateAsync(pendingDelete.id);
                  setPendingDelete(null);
                } catch {
                  // O toast vem do `onError` da mutation; o dialog fica aberto
                  // para uma nova tentativa em vez de sumir com o erro.
                }
              }}
            >
              {deleteComment.isPending ? <AreaLoader area={area} size={18} /> : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
