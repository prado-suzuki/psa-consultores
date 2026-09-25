import { useEffect, useRef, useState, type DragEvent } from 'react';
import { AtSign, Loader2, Paperclip, Reply, Send, Sparkles, X } from 'lucide-react';
import { AreaLoader } from '@/components/equipe/AreaLoader';
import type { AreaKey } from '@/config/areaCategories';
import { toast } from 'sonner';

import { OrgCommentEditor } from '@/components/comentarios/OrgCommentEditor';
import { OrgCommentBody } from '@/components/comentarios/OrgCommentBody';
import { Button } from '@/components/ui/button';
import { ButtonTooltip } from '@/components/ui/button-tooltip';
import { BotaoDitado } from '@/components/shared/BotaoDitado';
import type { MentionCandidate } from '@/lib/orgCommentMentions';
import {
  docEstaVazio,
  lerCorpo,
  mencoesDoDoc,
  restaurarMencoesDoCorpo,
  serializarDoc,
  textoPlanoDoCorpo,
} from '@/lib/orgCommentRichText';
import { cn } from '@/lib/utils';
import { useEnriquecerTexto } from '@/hooks/useEnriquecerTexto';
import type { TarefaSugeridaDoDitado } from '@/hooks/useDitado';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Só o primeiro nome — cabe no "Respondendo a ..." sem estourar a linha. */
function primeiroNome(name: string | null) {
  return (name || 'Usuário').trim().split(/\s+/)[0];
}

interface CommentComposerProps {
  compact?: boolean;
  /**
   * Desenho de CAIXA, no formato da caixa de mensagem do Slack: uma moldura só,
   * a barra de formatação como faixa colada no topo, o texto no meio e a barra
   * de ações (anexo, menção, áudio) embaixo, tudo dentro da mesma borda.
   *
   * É opt-in porque o compositor também vive dentro do painel da tarefa, que é
   * estreito: lá a caixa alta comeria a thread.
   */
  caixa?: boolean;
  /** Área da tela — define o glifo de carregamento (ver `AreaLoader`). */
  area?: AreaKey;
  isPending: boolean;
  mentionCandidates: MentionCandidate[];
  /** Muda de valor quando alguém pede o foco daqui de fora. */
  focusSignal?: number;
  /**
   * A pessoa apertou "@" e não há ninguém para oferecer. Quem passa isto vai
   * atrás da lista (no feed, escolhendo o destino) e responde se agora há gente;
   * respondendo `true`, o compositor reabre a menção sozinho.
   */
  aoMencionarSemGente?: () => Promise<boolean>;
  /** Autor do comentário raiz — vira o cabeçalho "Respondendo a ..." do compositor. */
  replyingToName?: string | null;
  onCancel?: () => void;
  onTarefaSugerida?: (tarefa: TarefaSugeridaDoDitado, usarComoComentario: () => void) => void;
  onSubmit: (body: string, files: File[], mentions: string[]) => Promise<void>;
}

export function CommentComposer({
  compact,
  caixa,
  area,
  isPending,
  mentionCandidates,
  focusSignal,
  aoMencionarSemGente,
  replyingToName,
  onCancel,
  onTarefaSugerida,
  onSubmit,
}: CommentComposerProps) {
  /** Corpo já no formato de gravação (marcador + JSON) — é o que o editor emite. */
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  /** Zera o editor depois de publicar sem precisar sincronizar `value` de volta. */
  const [geracao, setGeracao] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** A ação de inserir "@" vem de dentro do editor — ver `inserirMencaoRef`. */
  const inserirMencaoRef = useRef<(() => void) | null>(null);
  /** A de recomeçar a menção depois que a lista de gente chegou. */
  const reabrirMencaoRef = useRef<(() => void) | null>(null);
  const inserirTextoRef = useRef<((texto: string) => void) | null>(null);
  /** Há um "@" esperando a lista de gente aparecer para ser reaberto. */
  const [mencaoPendente, setMencaoPendente] = useState(false);
  const [corpoNaSolicitacao, setCorpoNaSolicitacao] = useState<string | null>(null);
  const [ditadoOcupado, setDitadoOcupado] = useState(false);
  const formatacao = useEnriquecerTexto('comentario-para-tarefa', {
    destinos: { titulo: 'simples', descricao: 'rico' } as const,
  });

  /*
    A menção só reabre no render em que os candidatos JÁ ESTÃO aqui. Chamar
    logo depois da promessa não serve: ela resolve num microtask, e o editor
    ainda estaria com a lista velha (vazia), o que reabriria o "@" para nada.
  */
  useEffect(() => {
    if (!mencaoPendente || mentionCandidates.length === 0) return;
    setMencaoPendente(false);
    reabrirMencaoRef.current?.();
  }, [mencaoPendente, mentionCandidates]);

  const corpo = lerCorpo(body);
  const vazio = corpo.formato === 'rich' ? docEstaVazio(corpo.doc) : !corpo.texto.trim();
  const campoSugerido = formatacao.data
    ? formatacao.data.estruturado === true
      ? formatacao.data.campos.descricao
      : formatacao.data.resultado
    : undefined;
  const sugestao =
    campoSugerido?.destino === 'rico'
      ? restaurarMencoesDoCorpo(campoSugerido.conteudo, corpoNaSolicitacao ?? '')
      : null;
  const sugestaoAtual = corpoNaSolicitacao === body;

  const addFiles = (incoming: File[]) => {
    const valid = incoming.filter((file) => file.size <= MAX_FILE_SIZE);
    if (valid.length !== incoming.length) toast.error('Cada anexo deve ter no máximo 10 MB');
    if (files.length + valid.length > MAX_FILES) toast.error('Você pode anexar até 5 arquivos');
    setFiles((current) => [...current, ...valid].slice(0, MAX_FILES));
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    addFiles(Array.from(event.dataTransfer.files));
  };

  const submit = async () => {
    if (isPending) return;
    if (vazio && files.length === 0) return;

    // Anexo sem texto continua tendo corpo: a thread mostra a linha do anexo.
    const documento = vazio
      ? serializarDoc({
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Adicionou anexos' }] }],
        })
      : body;
    const doc = lerCorpo(documento);
    const mencoes = doc.formato === 'rich' ? mencoesDoDoc(doc.doc) : [];

    /*
      O rascunho só some quando a fala foi gravada. Publicação que falha, e
      envio que a pessoa desistiu no meio (no feed, o Enter abre a escolha de
      destino e o Esc desfaz), devolvem o texto intacto: perder o parágrafo
      escrito por causa de uma tecla é o pior desfecho possível aqui. Quem
      avisa do erro é a mutation, que já mostra o toast.
    */
    try {
      await onSubmit(documento, files, mencoes);
    } catch {
      return;
    }
    setBody('');
    setFiles([]);
    formatacao.reset();
    setCorpoNaSolicitacao(null);
    setGeracao((atual) => atual + 1);
  };

  const formatarComIa = async () => {
    if (vazio || formatacao.isPending) return;
    formatacao.reset();
    setCorpoNaSolicitacao(body);
    try {
      await formatacao.mutateAsync(textoPlanoDoCorpo(body));
    } catch (erro) {
      setCorpoNaSolicitacao(null);
      toast.error(erro instanceof Error ? erro.message : 'Não foi possível formatar o texto');
    }
  };

  const usarSugestao = () => {
    if (!sugestao || !sugestaoAtual) return;
    if (sugestao.mencoesAusentes.length > 0) {
      toast.error(`A IA não preservou ${sugestao.mencoesAusentes.join(', ')}. Revise o texto.`);
      return;
    }
    setBody(serializarDoc(sugestao.doc));
    formatacao.reset();
    setCorpoNaSolicitacao(null);
  };

  const descartarSugestao = () => {
    formatacao.reset();
    setCorpoNaSolicitacao(null);
  };

  return (
    <div
      className={cn(
        'relative rounded-md border bg-background shadow-sm',
        // Sem `overflow-hidden`: a lista de menção SOBE a partir do rodapé da tela, e
        // recortada pela moldura o "@" inseria o caractere sem mostrar a lista.
        caixa
          ? 'rounded-lg border-border/80 shadow-none transition-shadow focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10'
          : 'p-3',
        // O campo de resposta é ESTADO, não decoração: ele existe só enquanto se
        // responde, então é ele que carrega o acento da área. Antes tinha o
        // `bg-background` — que vale o MESMO que `--card`, a superfície do bloco
        // do feed em volta — e a borda base `220 13% 91%`, um cinza azulado que
        // nenhuma área redeclara: ~1,2:1 contra o entorno, quando um contorno de
        // componente precisa de 3:1 para ser visto. Some na tela, e foi assim que
        // ele foi encontrado ("quase não enxerguei").
        compact && 'mt-3 border-primary shadow-md ring-2 ring-primary/10',
      )}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      {replyingToName && (
        <p
          className={cn(
            'flex items-center gap-1.5 text-[11px] font-medium text-primary',
            caixa ? 'border-b px-3 py-1.5' : 'mb-2',
          )}
        >
          <Reply className="h-3.5 w-3.5" aria-hidden />
          Respondendo a {primeiroNome(replyingToName)}
        </p>
      )}

      <OrgCommentEditor
        key={geracao}
        value={body}
        onChange={setBody}
        candidates={mentionCandidates}
        placeholder={
          compact
            ? 'Escreva uma resposta...'
            : caixa
              ? 'Escreva e aperte Enter: o destino vem depois'
              : 'Escreva um comentário... Use @ para mencionar'
        }
        minHeight={compact ? 'min-h-12' : caixa ? 'min-h-20' : 'min-h-16'}
        classeDoTexto={caixa ? 'px-3 py-2.5' : undefined}
        barraEmFaixa={caixa}
        // Na caixa o "@" desce para a barra de ações, junto de anexo e áudio,
        // que é onde o Slack o põe; a barra de cima fica só com formatação.
        botaoDeMencao={!caixa}
        inserirMencaoRef={inserirMencaoRef}
        inserirTextoRef={inserirTextoRef}
        reabrirMencaoRef={reabrirMencaoRef}
        aoMencionarSemGente={
          aoMencionarSemGente &&
          (() => {
            void aoMencionarSemGente().then((temGente) => setMencaoPendente(temGente));
          })
        }
        focusSignal={focusSignal}
        // O campo de resposta nasce com o cursor dentro: ele só existe depois do
        // clique em "Responder", então focar na montagem não rouba o foco.
        focarNaMontagem={compact}
        onArquivos={addFiles}
        onPublicar={submit}
        // Na caixa do feed o Enter envia (e abre a escolha de destino); a
        // quebra de linha passa a ser Shift+Enter, como no Slack.
        enviarComEnter={caixa}
        // A roda de gente vem do projeto, e no feed o projeto é escolhido no
        // envio: antes da primeira fala o "@" não tem ninguém para oferecer.
        avisoSemMencoes={
          caixa
            ? 'A lista de quem dá para mencionar vem do projeto, e ele é escolhido no envio.'
            : undefined
        }
        ariaLabel={compact ? 'Escrever resposta' : 'Escrever comentário'}
      />

      {caixa && sugestao && (
        <div className="mx-2 mb-2 rounded-md border border-primary/20 bg-primary/[0.04] p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Sugestão da IA
          </div>
          <OrgCommentBody body={serializarDoc(sugestao.doc)} />
          {!sugestaoAtual && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
              O texto mudou depois da solicitação. Formate novamente para gerar outra sugestão.
            </p>
          )}
          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={descartarSugestao}>
              Descartar
            </Button>
            <Button type="button" size="sm" disabled={!sugestaoAtual} onClick={usarSugestao}>
              Usar sugestão
            </Button>
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className={cn('flex flex-wrap gap-2', caixa ? 'px-3 pb-2' : 'mt-2')}>
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

      <div
        className={cn(
          'flex items-center justify-between border-t',
          caixa ? 'border-border/60 px-2 py-1.5' : 'mt-3 pt-2',
        )}
      >
        <div className="flex items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => addFiles(Array.from(event.target.files ?? []))}
          />
          <ButtonTooltip text="Anexar arquivo">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              aria-label="Adicionar anexos"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </ButtonTooltip>
          {caixa && (
            <>
              <ButtonTooltip text="Mencionar pessoa">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  aria-label="Mencionar pessoa"
                  // O foco não pode sair do editor antes da inserção: o `@` é
                  // inserido na posição do cursor.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => inserirMencaoRef.current?.()}
                >
                  <AtSign className="h-4 w-4" />
                </Button>
              </ButtonTooltip>
              <ButtonTooltip text="Formatar com IA">
                <span className="inline-flex">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={vazio || formatacao.isPending || isPending}
                    className="h-8 w-8 text-muted-foreground"
                    aria-label="Formatar com IA"
                    onClick={formatarComIa}
                  >
                    {formatacao.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Sparkles className="h-4 w-4" aria-hidden />
                    )}
                  </Button>
                </span>
              </ButtonTooltip>
              <BotaoDitado
                ditado="comentario"
                alvo={{ inserirTexto: (texto) => inserirTextoRef.current?.(texto) }}
                disabled={isPending || formatacao.isPending}
                onTarefaSugerida={
                  onTarefaSugerida
                    ? (tarefa) =>
                        onTarefaSugerida(tarefa, () =>
                          inserirTextoRef.current?.(tarefa.transcricaoOriginal),
                        )
                    : undefined
                }
                onEstadoChange={(estado) =>
                  setDitadoOcupado(estado === 'gravando' || estado === 'transcrevendo')
                }
              />
            </>
          )}
          {!caixa && (
            <span className="hidden text-[11px] text-muted-foreground sm:inline">
              Até 5 arquivos de 10 MB
            </span>
          )}
        </div>
        <div className="flex min-w-0 items-center gap-2">
          {caixa && (
            <span className="hidden text-[11px] text-muted-foreground sm:inline">Enter envia</span>
          )}
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            disabled={
              isPending || formatacao.isPending || ditadoOcupado || (vazio && files.length === 0)
            }
            onClick={submit}
          >
            {isPending ? <AreaLoader area={area} size={18} /> : <Send className="h-4 w-4" />}
            <span className="ml-2">Publicar</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
