import { useRef, useState, type ClipboardEvent, type DragEvent } from 'react';
import { AtSign, Loader2, Paperclip, Reply, Send, X } from 'lucide-react';
import { toast } from 'sonner';

import {
  MentionTextField,
  type MentionTextFieldHandle,
} from '@/components/comentarios/MentionTextField';
import { Button } from '@/components/ui/button';
import { extrairMencoes, serializarMencoes, type MentionCandidate } from '@/lib/orgCommentMentions';
import { cn } from '@/lib/utils';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Só o primeiro nome — cabe no "Respondendo a ..." sem estourar a linha. */
function primeiroNome(name: string | null) {
  return (name || 'Usuário').trim().split(/\s+/)[0];
}

interface CommentComposerProps {
  compact?: boolean;
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
  isPending,
  mentionCandidates,
  focusSignal,
  replyingToName,
  onCancel,
  onSubmit,
}: CommentComposerProps) {
  /** Texto como a pessoa lê — `@Nome`, sem uuid. O token nasce só no `submit`. */
  const [body, setBody] = useState('');
  const [mencoes, setMencoes] = useState<MentionCandidate[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fieldRef = useRef<MentionTextFieldHandle>(null);

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

  const submit = async () => {
    const escrito = body.trim() || (files.length > 0 ? 'Adicionou anexos' : '');
    if (!escrito || isPending) return;
    // Fronteira com o banco: aqui o `@Nome` do campo vira `@[Nome](uuid)`.
    const corpo = serializarMencoes(escrito, mencoes);
    await onSubmit(corpo, files, extrairMencoes(corpo));
    setBody('');
    setMencoes([]);
    setFiles([]);
  };

  return (
    <div
      className={cn('relative rounded-xl border bg-background p-3 shadow-sm', compact && 'mt-3')}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      {replyingToName && (
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <Reply className="h-3.5 w-3.5" aria-hidden />
          Respondendo a {primeiroNome(replyingToName)}
        </p>
      )}

      <MentionTextField
        ref={fieldRef}
        value={body}
        mencoes={mencoes}
        candidates={mentionCandidates}
        onChange={(text, proximasMencoes) => {
          setBody(text);
          setMencoes(proximasMencoes);
        }}
        placeholder={
          compact ? 'Escreva uma resposta...' : 'Escreva um comentário... Use @ para mencionar'
        }
        rows={compact ? 2 : 3}
        focusSignal={focusSignal}
        // O campo de resposta nasce com o cursor dentro: ele só existe depois do
        // clique em "Responder", então focar na montagem não rouba o foco.
        focarNaMontagem={compact}
        idPrefixo={compact ? 'mencoes-resposta' : 'mencoes-raiz'}
        onPaste={handlePaste}
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Mencionar pessoa"
            onClick={() => fieldRef.current?.abrirMencao()}
          >
            <AtSign className="h-4 w-4" />
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
