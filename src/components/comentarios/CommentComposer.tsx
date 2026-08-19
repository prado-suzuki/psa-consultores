import { useRef, useState, type DragEvent } from 'react';
import { Paperclip, Reply, Send, X } from 'lucide-react';
import { AreaLoader } from '@/components/equipe/AreaLoader';
import type { AreaKey } from '@/config/areaCategories';
import { toast } from 'sonner';

import { OrgCommentEditor } from '@/components/comentarios/OrgCommentEditor';
import { Button } from '@/components/ui/button';
import type { MentionCandidate } from '@/lib/orgCommentMentions';
import { docEstaVazio, lerCorpo, mencoesDoDoc, serializarDoc } from '@/lib/orgCommentRichText';
import { cn } from '@/lib/utils';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Só o primeiro nome — cabe no "Respondendo a ..." sem estourar a linha. */
function primeiroNome(name: string | null) {
  return (name || 'Usuário').trim().split(/\s+/)[0];
}

interface CommentComposerProps {
  compact?: boolean;
  /** Área da tela — define o glifo de carregamento (ver `AreaLoader`). */
  area?: AreaKey;
  isPending: boolean;
  mentionCandidates: MentionCandidate[];
  /** Muda de valor quando alguém pede o foco daqui de fora. */
  focusSignal?: number;
  /** Autor do comentário raiz — vira o cabeçalho "Respondendo a ..." do compositor. */
  replyingToName?: string | null;
  onCancel?: () => void;
  onSubmit: (body: string, files: File[], mentions: string[]) => Promise<void>;
}

export function CommentComposer({
  compact,
  area,
  isPending,
  mentionCandidates,
  focusSignal,
  replyingToName,
  onCancel,
  onSubmit,
}: CommentComposerProps) {
  /** Corpo já no formato de gravação (marcador + JSON) — é o que o editor emite. */
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  /** Zera o editor depois de publicar sem precisar sincronizar `value` de volta. */
  const [geracao, setGeracao] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const corpo = lerCorpo(body);
  const vazio = corpo.formato === 'rich' ? docEstaVazio(corpo.doc) : !corpo.texto.trim();

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

    await onSubmit(documento, files, mencoes);
    setBody('');
    setFiles([]);
    setGeracao((atual) => atual + 1);
  };

  return (
    <div
      className={cn(
        'relative rounded-xl border bg-background p-3 shadow-sm',
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
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-primary">
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
          compact ? 'Escreva uma resposta...' : 'Escreva um comentário... Use @ para mencionar'
        }
        minHeight={compact ? 'min-h-12' : 'min-h-16'}
        focusSignal={focusSignal}
        // O campo de resposta nasce com o cursor dentro: ele só existe depois do
        // clique em "Responder", então focar na montagem não rouba o foco.
        focarNaMontagem={compact}
        onArquivos={addFiles}
        onPublicar={submit}
        ariaLabel={compact ? 'Escrever resposta' : 'Escrever comentário'}
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
            disabled={isPending || (vazio && files.length === 0)}
            onClick={submit}
          >
            {isPending ? (
              <AreaLoader area={area} size={18} />
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
