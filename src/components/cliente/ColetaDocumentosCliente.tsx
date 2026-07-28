import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Building2, ChevronDown, Download, FileText, FilePlus2, Hand, Landmark, Loader2, Trash2,
  UploadCloud, Users,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useClienteAtual } from '@/hooks/useClienteAtual';
import {
  useBaixarDocumento,
  useChecklistSolicitadoCliente,
  useDocumentosByCliente,
  useSoftDeleteDocumentoCliente,
  useUploadDocumentoCliente,
  useUploaderNames,
  type DocumentoArquivoRow,
} from '@/hooks/useDocumentoArquivo';
import { ACCEPT, MAX_BYTES, extensaoValida, formatBytes } from '@/components/equipe/osg/documentos/docMeta';
import {
  montarGruposColeta, type GrupoColeta, type GrupoColetaKey,
} from '@/lib/coletaDocumentosCliente';

const GRUPO_ICON: Record<GrupoColetaKey, LucideIcon> = {
  pf: Users,
  pj: Building2,
  imoveis: Landmark,
  outros: FilePlus2,
};

interface CardGrupoProps {
  grupo: GrupoColeta;
  enviando: boolean;
  onArquivos: (files: File[]) => void;
  onRemover: (doc: DocumentoArquivoRow) => void;
}

/**
 * Card de um grupo: gaveta de entrada com drag and drop, lista do que já foi
 * enviado ali e a relação recolhível dos documentos pedidos naquele grupo.
 */
function CardGrupo({ grupo, enviando, onArquivos, onRemover }: CardGrupoProps) {
  const Icon = GRUPO_ICON[grupo.key];
  const inputRef = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const [listaAberta, setListaAberta] = useState(false);
  const discreto = grupo.key === 'outros';

  const onInput = (e: ChangeEvent<HTMLInputElement>) => {
    onArquivos(Array.from(e.target.files ?? []));
    e.target.value = '';
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setArrastando(false);
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
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={onDrop}
        disabled={enviando}
        className={cn(
          'mb-4 flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-7 text-center transition-colors',
          arrastando
            ? 'border-teal-500 bg-teal-50'
            : 'border-slate-300 bg-slate-50/60 hover:border-teal-400 hover:bg-teal-50/40',
          enviando && 'cursor-wait opacity-70',
        )}
      >
        {enviando ? (
          <Loader2 className="h-7 w-7 animate-spin text-teal-700" />
        ) : (
          <UploadCloud className="h-7 w-7 text-teal-700/70" />
        )}
        <span className="text-sm font-medium text-teal-800">
          {enviando ? 'Enviando...' : 'Arraste os arquivos aqui ou clique para escolher'}
        </span>
        <span className="text-[11px] text-muted-foreground">
          PDF, imagens e Office, até {formatBytes(MAX_BYTES)}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={onInput}
        />
      </button>

      {grupo.arquivos.length > 0 && (
        <ul className="mb-4 space-y-2">
          {grupo.arquivos.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-2 rounded-md border bg-slate-50/60 px-2 py-1.5"
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
            className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:underline"
          >
            Ver quais documentos ({grupo.documentos.length})
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', listaAberta && 'rotate-180')}
            />
          </button>
          {listaAberta && (
            <ul className="mt-3 max-h-[240px] list-disc overflow-y-auto border-t pl-5 pt-3 text-xs text-muted-foreground duration-200 animate-in fade-in-0">
              {grupo.documentos.map((nome) => (
                <li key={nome} className="py-0.5">{nome}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

/**
 * Coleta de documentos do cliente em 4 grupos grandes (Pessoas Físicas,
 * Jurídicas, Matrículas e Imóveis, Outros), cada um com drag and drop próprio.
 *
 * A ideia é o cliente não precisar separar por pessoa nem renomear arquivo: joga
 * no grupo e a PSA classifica depois. A relação de documentos de cada grupo vem
 * do checklist solicitado.
 */
export function ColetaDocumentosCliente() {
  const { data: clienteId, isLoading: carregandoCliente } = useClienteAtual();
  const { data: docs = [], isLoading: carregandoDocs } = useDocumentosByCliente(clienteId ?? null);
  const { data: checklist = [] } = useChecklistSolicitadoCliente(clienteId ?? null);
  const upload = useUploadDocumentoCliente();
  const baixar = useBaixarDocumento();
  const excluir = useSoftDeleteDocumentoCliente(clienteId ?? '');
  const [grupoEnviando, setGrupoEnviando] = useState<GrupoColetaKey | null>(null);
  const [aExcluir, setAExcluir] = useState<DocumentoArquivoRow | null>(null);

  const grupos = useMemo(() => montarGruposColeta(checklist, docs), [checklist, docs]);
  // "Enviados": tudo que o cliente mandou e a PSA ainda não classificou, na ordem
  // de chegada (docs já vem por created_at desc).
  const enviados = useMemo(
    () => docs.filter((d) => d.fonte === 'cliente' && d.checklist_item_id == null),
    [docs],
  );
  const uploaderIds = useMemo(
    () => enviados.map((d) => d.created_by).filter((v): v is string => !!v),
    [enviados],
  );
  const { data: uploaderNames = {} } = useUploaderNames(uploaderIds);

  const enviar = async (grupo: GrupoColeta, lista: File[]) => {
    if (!clienteId || lista.length === 0) return;
    const validos: File[] = [];
    let rejeitados = 0;
    for (const f of lista) {
      if (!extensaoValida(f.name) || f.size > MAX_BYTES) {
        rejeitados++;
        continue;
      }
      validos.push(f);
    }
    if (rejeitados) {
      toast({
        title: `${rejeitados} arquivo(s) ignorado(s)`,
        description: `Fora do tipo permitido ou acima de ${formatBytes(MAX_BYTES)}.`,
        variant: 'destructive',
      });
    }
    if (validos.length === 0) return;
    setGrupoEnviando(grupo.key);
    try {
      for (const file of validos) {
        try {
          await upload.mutateAsync({ clienteId, file, categoria: grupo.categoria });
        } catch {
          // toast já emitido pelo onError do hook
        }
      }
    } finally {
      setGrupoEnviando(null);
    }
  };

  if (carregandoCliente) {
    return (
      <Card className="p-6">
        <Skeleton className="mb-3 h-6 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
      </Card>
    );
  }

  if (!clienteId) return null;

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.24em] text-teal-700">
          Documentos solicitados
        </p>
        <h2 className="text-2xl font-bold text-foreground">A PSA solicitou estes documentos</h2>
        <div className="mt-3 h-[3px] w-6 rounded-full bg-teal-600" />
      </div>

      <Card className="flex gap-4 border-l-4 border-l-teal-600 p-6">
        <Hand className="h-7 w-7 shrink-0 text-teal-700" />
        <p className="text-sm leading-relaxed text-muted-foreground">
          Envie os documentos que você tiver, na ordem que preferir. Não precisa separar por pessoa
          nem renomear arquivos, a PSA organiza depois. Pode enviar vários de uma vez e voltar
          quando quiser.
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {grupos.map((grupo) => (
          <CardGrupo
            key={grupo.key}
            grupo={grupo}
            enviando={grupoEnviando === grupo.key}
            onArquivos={(files) => void enviar(grupo, files)}
            onRemover={setAExcluir}
          />
        ))}
      </div>

      <div>
        <h2 className="text-xl font-bold text-foreground">Enviados</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A PSA está organizando estes arquivos. Em breve eles vão aparecer separados por pessoa e
          imóvel.
        </p>
        {carregandoDocs ? (
          <Card className="mt-4">
            <div className="space-y-4 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          </Card>
        ) : enviados.length === 0 ? (
          <p className="py-4 text-sm italic text-muted-foreground">
            Nenhum documento enviado ainda.
          </p>
        ) : (
          <Card className="mt-4">
            <ul className="divide-y">
              {enviados.map((d) => {
                const uploader = d.created_by ? uploaderNames[d.created_by] : null;
                return (
                  <li key={d.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{d.nome_original}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(d.tamanho)} ·{' '}
                        {format(new Date(d.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        {' · '}enviado por {uploader ?? '—'}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => baixar.mutate(d)} title="Baixar">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setAExcluir(d)} title="Remover">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>

      <AlertDialog open={!!aExcluir} onOpenChange={(o) => !o && setAExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover documento?</AlertDialogTitle>
            <AlertDialogDescription>
              "{aExcluir?.nome_original}" deixará de aparecer na lista. O arquivo permanece
              arquivado no storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (aExcluir) excluir.mutate(aExcluir.id);
                setAExcluir(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ColetaDocumentosCliente;
