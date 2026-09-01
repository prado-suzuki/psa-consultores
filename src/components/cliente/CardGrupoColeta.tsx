// Card de uma das 4 gavetas da área do cliente. Saiu de ColetaDocumentosCliente
// na EDU-27, antes de crescer: aquele arquivo tinha dois componentes e já
// estava em 387 das 600 linhas que o AGENTS.md permite.
import { useId, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Building2, ChevronDown, FilePlus2, FileText, Landmark, List, Loader2, Lock, Trash2, UploadCloud,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

/**
 * Quantos documentos a gaveta mostra antes de oferecer a lista completa.
 *
 * Cinco porque o card é uma caixa de ENTRADA, não um catálogo: gaveta com 15
 * linhas empurrava o próprio campo de envio para fora da tela, e o cliente
 * rolava a lista em vez de mandar arquivo.
 */
const PREVIA = 5;

interface CardGrupoColetaProps {
  grupo: GrupoColeta;
  enviando: boolean;
  /** Pedido encerrado: os arquivos continuam à vista e o envio desliga. */
  somenteLeitura: boolean;
  /**
   * O que dizer na gaveta trancada. Vem do pai porque o motivo depende do status
   * da solicitação, e o card não conhece status — só sabe que está trancado.
   */
  motivoBloqueio: string;
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
  motivoBloqueio,
  onArquivos,
  onRemover,
}: CardGrupoColetaProps) {
  const Icon = GRUPO_ICON[grupo.key];
  const inputRef = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const [listaAberta, setListaAberta] = useState(false);
  const [listaCompleta, setListaCompleta] = useState(false);
  const [arquivosCompletos, setArquivosCompletos] = useState(false);
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
              discreto ? 'bg-muted text-slate-500' : 'bg-accent/5 text-teal-700',
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
              : 'bg-muted text-muted-foreground',
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
            ? 'border-teal-500 bg-accent/5'
            : 'border-border bg-muted/60 hover:border-primary/40 hover:bg-accent/5/40',
          enviando && 'cursor-wait opacity-70',
          somenteLeitura && 'cursor-not-allowed opacity-60 hover:border-border hover:bg-muted/60',
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
          className={cn('text-sm font-medium', somenteLeitura ? 'text-slate-500' : 'text-primary')}
        >
          {somenteLeitura
            ? motivoBloqueio
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
          {grupo.arquivos.slice(0, PREVIA).map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-2 rounded-md border bg-muted/60 px-3 py-2"
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                {doc.nome_original}
              </span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {formatBytes(doc.tamanho)}
              </span>
              {/* Excluir acompanha o envio: fora do pedido enviado, o cliente
                  consulta e baixa, mas não mexe. */}
              {!somenteLeitura && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemover(doc)}
                  title="Remover"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* A gaveta é caixa de ENTRADA, não arquivo: mostra os 5 mais recentes e
          manda o resto para o modal. Sem isso o card crescia a cada upload até
          empurrar o próprio campo de envio para fora da tela. */}
      {grupo.arquivos.length > PREVIA && (
        <button
          type="button"
          onClick={() => setArquivosCompletos(true)}
          className={cn(
            'mb-4 inline-flex items-center gap-1 rounded text-xs font-bold text-teal-700 hover:underline',
            FOCO,
          )}
        >
          <List className="h-3.5 w-3.5" />
          Ver os {grupo.arquivos.length} arquivos enviados
        </button>
      )}

      <Dialog open={arquivosCompletos} onOpenChange={setArquivosCompletos}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Arquivos enviados — {grupo.titulo}</DialogTitle>
            <DialogDescription>
              {grupo.arquivos.length} arquivo(s), do mais recente para o mais antigo.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
            {grupo.arquivos.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center gap-2 rounded-md border bg-muted/60 px-3 py-2"
              >
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                  {doc.nome_original}
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {formatBytes(doc.tamanho)}
                </span>
                {!somenteLeitura && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemover(doc)}
                    title="Remover"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

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
            <>
              <ul
                id={listaId}
                className="mt-3 list-disc space-y-2 border-t pl-5 pt-3 text-xs text-muted-foreground duration-200 animate-in fade-in-0"
              >
                {grupo.documentos.slice(0, PREVIA).map((doc) => (
                  <li key={doc.nome}>
                    <span className="font-medium text-foreground">{doc.nome}</span>
                    {doc.instrucao && (
                      <span className="mt-0.5 block leading-snug">{doc.instrucao}</span>
                    )}
                  </li>
                ))}
              </ul>
              {grupo.documentos.length > PREVIA && (
                <button
                  type="button"
                  onClick={() => setListaCompleta(true)}
                  className={cn(
                    'mt-2 inline-flex items-center gap-1 rounded text-xs font-bold text-teal-700 hover:underline',
                    FOCO,
                  )}
                >
                  <List className="h-3.5 w-3.5" />
                  Ver a lista completa ({grupo.documentos.length})
                </button>
              )}
            </>
          )}
        </div>
      )}

      <Dialog open={listaCompleta} onOpenChange={setListaCompleta}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{grupo.titulo}</DialogTitle>
            <DialogDescription>
              {grupo.documentos.length} documento(s) pedido(s) nesta gaveta. Envie o que tiver;
              não precisa ser tudo de uma vez.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-[60vh] list-disc space-y-2.5 overflow-y-auto pl-5 text-xs text-muted-foreground">
            {grupo.documentos.map((doc) => (
              <li key={doc.nome}>
                <span className="font-medium text-foreground">{doc.nome}</span>
                {doc.instrucao && (
                  <span className="mt-0.5 block leading-snug">{doc.instrucao}</span>
                )}
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default CardGrupoColeta;
