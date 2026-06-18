import { useRef, useState } from 'react';
import { Download, FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { fieldCls } from '@/components/equipe/osg/formKit';
import {
  useBaixarDocumento,
  useDocumentosByVinculo,
  useExcluirDocumento,
  useUploadDocumento,
  type DocCategoria,
  type DocumentoArquivoRow,
  type VinculoDoc,
} from '@/hooks/useDocumentoArquivo';

const CATEGORIAS: { value: DocCategoria; label: string }[] = [
  { value: 'bens_direitos', label: 'Bens e Direitos' },
  { value: 'cadastros_fiscais', label: 'Cadastros Fiscais' },
  { value: 'declaracao_ir', label: 'Declaração IR' },
  { value: 'agrarios', label: 'Agrários' },
  { value: 'pessoais', label: 'Pessoais' },
  { value: 'societarios', label: 'Societários' },
  { value: 'sucessorios', label: 'Sucessórios' },
  { value: 'outros', label: 'Outros' },
];

const MAX_BYTES = 50 * 1024 * 1024;
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx';

function formatBytes(n: number | null): string {
  if (!n) return '—';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i ? 1 : 0)} ${u[i]}`;
}

interface Props {
  clienteId: string;
  vinculo: VinculoDoc;
  categoriaPadrao: DocCategoria;
}

export function DocumentosTab({ clienteId, vinculo, categoriaPadrao }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [categoria, setCategoria] = useState<DocCategoria>(categoriaPadrao);
  const [aExcluir, setAExcluir] = useState<DocumentoArquivoRow | null>(null);

  const { data: docs = [], isLoading } = useDocumentosByVinculo(clienteId, vinculo);
  const upload = useUploadDocumento();
  const excluir = useExcluirDocumento(clienteId, vinculo);
  const baixar = useBaixarDocumento();

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast({ title: 'Arquivo muito grande', description: 'Limite de 50 MB.', variant: 'destructive' });
      return;
    }
    upload.mutate({ clienteId, vinculo, categoria, file });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Categoria</span>
          <select
            className={fieldCls}
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as DocCategoria)}
          >
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={onPick} />
        <Button type="button" onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
          {upload.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Anexar arquivo
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{d.nome_original}</p>
                <p className="text-xs text-muted-foreground">
                  {CATEGORIAS.find((c) => c.value === d.categoria)?.label} · {formatBytes(d.tamanho)} ·{' '}
                  {new Date(d.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => baixar.mutate(d)} title="Baixar">
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setAExcluir(d)} title="Remover">
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

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
