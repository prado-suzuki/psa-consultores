// Card de uma das 4 gavetas da área do cliente. Saiu de ColetaDocumentosCliente
// na EDU-27, antes de crescer: aquele arquivo tinha dois componentes e já
// estava em 387 das 600 linhas que o AGENTS.md permite.
import { useId, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Building2, ChevronDown, FilePlus2, FileText, Landmark, Loader2, Lock, Trash2, UploadCloud, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DocumentoArquivoRow } from '@/hooks/useDocumentoArquivo';
import { ACCEPT, MAX_BYTES, formatBytes } from '@/components/equipe/osg/documentos/docMeta';
import type { GrupoColeta } from '@/lib/coletaDocumentosCliente';
import type { GrupoDocumentoKey } from '@/lib/agrupadorDocumentos';

const GRUPO_ICON: Record<GrupoDocumentoKey, LucideIcon> = {
  pf: Users,
  pj: Building2,
  bens_imoveis: Landmark,
  outros: FilePlus2,
};

/** Anel de foco dos botões nativos, no padrão das outras telas do cliente. */
const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40';

interface CardGrupoColetaProps {
  grupo: GrupoColeta;
  enviando: boolean;
  /** Pedido encerrado: os arquivos continuam à vista e o envio desliga. */
  somenteLeitura: boolean;
  onArquivos: (files: File[]) => void;
  onRemover: (doc: DocumentoArquivoRow) => void;
}

/**
 * Card de um grupo: gaveta de entrada com drag and drop, lista do que já foi
 * enviado ali e a relação recolhível dos documentos pedidos naquele grupo, cada
 * um com a instrução que a PSA escreveu.
 */
export function CardGrupoColeta({
  grupo,
  enviando,
  somenteLeitura,
  onArquivos,
  onRemover,
}: CardGrupoColetaProps) {
  const Icon = GRUPO_ICON[grupo.key];
  const inputRef = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const [listaAberta, setListaAberta] = useState(false);
  const listaId = useId();
  const discreto = grupo.key === 'outros';

  const onInput = (e: ChangeEvent<HTMLInputElement>) => {
    onArquivos(Array.from(e.target.files ?? []));
    e.target.value = '';
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setArrastando(false);
    if (somenteLeitura) return;
    onArquivos(Array.from(e.dataTransfer.files ?? []));
  };

  return (
    <Card
      className={cn(
        'flex flex-col p-6',
        discreto && 'border-2 border-dashed bg-transparent shadow-none',
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
              discreto ? 'bg-slate-100 text-slate-500' : 'bg-teal-50 text-teal-700',
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className={cn('font-semibold', discreto ? 'text-slate-600' : 'text-foreground')}>
              {grupo.titulo}
            </h3>
            <p className="text-[11px] text-muted-foreground">{grupo.subtitulo}</p>
          </div>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold',
            grupo.arquivos.length > 0
              ? 'bg-teal-600 text-white'
              : 'bg-slate-100 text-muted-foreground',
          )}
        >
          {grupo.arquivos.length} {grupo.arquivos.length === 1 ? 'arquivo' : 'arquivos'}
        </span>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!somenteLeitura) setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={onDrop}
        disabled={enviando || somenteLeitura}
        className={cn(
          'mb-4 flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-7 text-center transition-colors',
          FOCO,
          arrastando
            ? 'border-teal-500 bg-teal-50'
            : 'border-slate-300 bg-slate-50/60 hover:border-teal-400 hover:bg-teal-50/40',
          enviando && 'cursor-wait opacity-70',
          somenteLeitura && 'cursor-not-allowed opacity-60 hover:border-slate-300 hover:bg-slate-50/60',
        )}
      >
        {somenteLeitura ? (
          <Lock className="h-7 w-7 text-slate-400" />
        ) : enviando ? (
          <Loader2 className="h-7 w-7 animate-spin text-teal-700" />
        ) : (
          <UploadCloud className="h-7 w-7 text-teal-700/70" />
        )}
        <span
          className={cn('text-sm font-medium', somenteLeitura ? 'text-slate-500' : 'text-teal-800')}
        >
          {somenteLeitura
            ? 'Este pedido foi encerrado'
            : enviando
              ? 'Enviando...'
              : 'Arraste os arquivos aqui ou clique para escolher'}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {somenteLeitura
            ? 'Os arquivos enviados continuam disponíveis'
            : `PDF, imagens e Office, até ${formatBytes(MAX_BYTES)}`}
        </span>
        {!somenteLeitura && (
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={onInput}
          />
        )}
      </button>

      {grupo.arquivos.length > 0 && (
        <ul className="mb-4 space-y-2">
          {grupo.arquivos.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-2 rounded-md border bg-slate-50/60 px-3 py-2"
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                {doc.nome_original}
              </span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {formatBytes(doc.tamanho)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => onRemover(doc)}
                title="Remover"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {grupo.documentos.length > 0 && (
        <div className="mt-auto">
          <button
            type="button"
            onClick={() => setListaAberta((v) => !v)}
            aria-expanded={listaAberta}
            aria-controls={listaId}
            className={cn(
              'inline-flex items-center gap-1 rounded text-xs font-bold text-teal-700 hover:underline',
              FOCO,
            )}
          >
            Ver quais documentos ({grupo.documentos.length})
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', listaAberta && 'rotate-180')}
            />
          </button>
          {listaAberta && (
            <ul
              id={listaId}
              className="mt-3 max-h-[240px] list-disc space-y-2 overflow-y-auto border-t pl-5 pt-3 text-xs text-muted-foreground duration-200 animate-in fade-in-0"
            >
              {grupo.documentos.map((doc) => (
                <li key={doc.nome}>
                  <span className="font-medium text-foreground">{doc.nome}</span>
                  {doc.instrucao && (
                    <span className="mt-0.5 block leading-snug">{doc.instrucao}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

export default CardGrupoColeta;
