import { useNavigate } from 'react-router-dom';
import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { ArrowLeft, Download, FileText, FolderUp, Loader2, LogOut, Trash2, Upload } from 'lucide-react';
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
import { useAuth } from '@/contexts/AuthContext';
import { useClienteAtual } from '@/hooks/useClienteAtual';
import {
  useBaixarDocumento,
  useDocumentosByCliente,
  useSoftDeleteDocumentoCliente,
  useUploadDocumentoCliente,
  useUploaderNames,
  type DocumentoArquivoRow,
} from '@/hooks/useDocumentoArquivo';
import { ACCEPT, MAX_BYTES, formatBytes } from '@/components/equipe/osg/documentos/docMeta';

const ACCEPT_EXTS = ACCEPT.split(',').map((s) => s.trim().toLowerCase());

function extensaoValida(nome: string): boolean {
  const ext = '.' + (nome.split('.').pop() ?? '').toLowerCase();
  return ACCEPT_EXTS.includes(ext);
}

export default function MeusDocumentos() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: clienteId, isLoading: carregandoCliente } = useClienteAtual();
  const { data: docs = [], isLoading: carregandoDocs } = useDocumentosByCliente(clienteId ?? null);
  const upload = useUploadDocumentoCliente();
  const baixar = useBaixarDocumento();
  const excluir = useSoftDeleteDocumentoCliente(clienteId ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const [aExcluir, setAExcluir] = useState<DocumentoArquivoRow | null>(null);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

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
  const docsCliente = docs.filter((d) => d.fonte === 'cliente');

  const uploaderIds = useMemo(
    () => docsCliente.map((d) => d.created_by).filter((v): v is string => !!v),
    [docsCliente],
  );
  const { data: uploaderNames = {} } = useUploaderNames(uploaderIds);

  const podeUpload = !!clienteId && !carregandoCliente;

  return (
    <div className="min-h-screen bg-[hsl(210_20%_98%)]">
      <header className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Meus Documentos</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate('/cliente')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button variant="ghost" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {carregandoCliente ? (
          <Card className="p-6">
            <Skeleton className="h-6 w-1/3 mb-3" />
            <Skeleton className="h-4 w-2/3" />
          </Card>
        ) : !clienteId ? (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground">Conta ainda não vinculada</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Sua conta ainda não está vinculada a um cliente. Fale com a PSA para liberar o envio de documentos.
            </p>
          </Card>
        ) : (
          <Card className="p-4">
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
          </Card>
        )}

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Documentos enviados</h2>
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
      </main>

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
