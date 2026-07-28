import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import {
  Download, FileText, FolderUp, Loader2, Trash2, Upload,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
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
  useDocumentosByCliente,
  useSoftDeleteDocumentoCliente,
  useUploadDocumentoCliente,
  useUploaderNames,
  type DocumentoArquivoRow,
} from '@/hooks/useDocumentoArquivo';
import { ACCEPT, MAX_BYTES, extensaoValida, formatBytes } from '@/components/equipe/osg/documentos/docMeta';

/**
 * Conteúdo da aba "Documentos" do painel do cliente: envio livre de arquivos e
 * lista do que já foi enviado fora da solicitação.
 *
 * O acompanhamento dos documentos solicitados (progresso, cards por
 * pessoa/imóvel e envio por item) vive na aba "Dashboards", em
 * ChecklistDocumentosConteudo.
 */
export function MeusDocumentosConteudo() {
  const { data: clienteId, isLoading: carregandoCliente } = useClienteAtual();
  const { data: docs = [], isLoading: carregandoDocs } = useDocumentosByCliente(clienteId ?? null);
  const upload = useUploadDocumentoCliente();
  const baixar = useBaixarDocumento();
  const excluir = useSoftDeleteDocumentoCliente(clienteId ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const [aExcluir, setAExcluir] = useState<DocumentoArquivoRow | null>(null);
  const [anexarOpen, setAnexarOpen] = useState(false);

  const enviarArquivos = async (lista: File[]) => {
    if (!clienteId) return;
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
        description: 'Fora do tipo permitido ou acima de 50 MB.',
        variant: 'destructive',
      });
    }
    for (const file of validos) {
      try {
        await upload.mutateAsync({ clienteId, file });
      } catch {
        // toast já emitido pelo onError do hook
      }
    }
  };

  const onInput = (e: ChangeEvent<HTMLInputElement>) => {
    void enviarArquivos(Array.from(e.target.files ?? []));
    e.target.value = '';
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setArrastando(false);
    if (!clienteId) return;
    void enviarArquivos(Array.from(e.dataTransfer.files ?? []));
  };

  // Filtro defensivo: RLS já garante fonte='cliente', mas caches podem carregar registros
  // antigos ou de outras origens caso o mesmo hook seja usado em telas internas.
  // Também filtramos itens já classificados via checklist para não duplicar na lista "Outros".
  const docsCliente = docs.filter((d) => d.fonte === 'cliente' && d.checklist_item_id == null);

  const uploaderIds = useMemo(
    () => docs.map((d) => d.created_by).filter((v): v is string => !!v),
    [docs],
  );
  const { data: uploaderNames = {} } = useUploaderNames(uploaderIds);

  const podeUpload = !!clienteId && !carregandoCliente;

  if (carregandoCliente) {
    return (
      <Card className="p-6">
        <Skeleton className="h-6 w-1/3 mb-3" />
        <Skeleton className="h-4 w-2/3" />
      </Card>
    );
  }

  if (!clienteId) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground">Conta ainda não vinculada</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Sua conta ainda não está vinculada a um cliente. Fale com a PSA para liberar o envio de documentos.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">Outros documentos enviados</h2>
          <Button variant="outline" onClick={() => setAnexarOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Anexar outros documentos
          </Button>
        </div>
        {carregandoDocs ? (
          <Card>
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          </Card>
        ) : docsCliente.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Nenhum documento enviado.</p>
          </Card>
        ) : (
          <Card>
            <ul className="divide-y">
              {docsCliente.map((d) => {
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => baixar.mutate(d)}
                      title="Baixar"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setAExcluir(d)}
                      title="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>

      {/* Modal: anexar documentos fora da lista de solicitados (upload livre) */}
      <Dialog open={anexarOpen} onOpenChange={setAnexarOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="text-left">
            <DialogTitle>Anexar outros documentos</DialogTitle>
            <DialogDescription>
              Envie documentos que não estão na lista de solicitados.
            </DialogDescription>
          </DialogHeader>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setArrastando(true);
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={onDrop}
            className={cn(
              'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors',
              arrastando ? 'border-teal-500 bg-teal-50' : 'border-slate-300 bg-slate-50/60',
            )}
          >
            <FolderUp className="h-8 w-8 text-teal-700/70" />
            <p className="text-sm text-slate-600">Arraste os arquivos aqui</p>
            <p className="text-xs text-muted-foreground">
              Tipos permitidos: {ACCEPT} — até {formatBytes(MAX_BYTES)}.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={onInput}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={!podeUpload || upload.isPending}
              className="mt-2"
            >
              {upload.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Escolher arquivos
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!aExcluir} onOpenChange={(o) => !o && setAExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover documento?</AlertDialogTitle>
            <AlertDialogDescription>
              "{aExcluir?.nome_original}" deixará de aparecer na lista. O arquivo permanece arquivado no storage.
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

export default MeusDocumentosConteudo;
