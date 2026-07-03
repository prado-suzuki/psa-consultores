import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { CheckCircle2, FileUp, FolderUp, Loader2, RotateCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ACCEPT, MAX_BYTES } from './docMeta';
import { useUploadEmMassa } from '@/hooks/useDocumentoArquivo';

const EXTS = ACCEPT.split(',').map((e) => e.trim().toLowerCase());
const aceito = (f: File) => {
  const ext = `.${(f.name.split('.').pop() ?? '').toLowerCase()}`;
  return EXTS.includes(ext) && f.size <= MAX_BYTES;
};
const chave = (f: File) => `${f.name}:${f.size}`;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
}

export function UploadMassaDialog({ open, onOpenChange, clienteId }: Props) {
  const filesRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [arrastando, setArrastando] = useState(false);
  const { itens, rodando, enviar, reset } = useUploadEmMassa();

  // webkitdirectory não é atributo tipado no React; seta via ref para permitir escolher pasta inteira.
  useEffect(() => {
    if (folderRef.current) {
      folderRef.current.setAttribute('webkitdirectory', '');
      folderRef.current.setAttribute('directory', '');
    }
  }, []);

  useEffect(() => {
    if (open) {
      setFiles([]);
      reset();
    }
  }, [open, reset]);

  const adicionar = (lista: File[]) => {
    if (!lista.length) return;
    const validos = lista.filter(aceito);
    const rejeitados = lista.length - validos.length;
    if (rejeitados) {
      toast({
        title: `${rejeitados} arquivo(s) ignorado(s)`,
        description: 'Fora do tipo permitido ou acima de 50 MB.',
        variant: 'destructive',
      });
    }
    if (validos.length) {
      setFiles((prev) => {
        const existentes = new Set(prev.map(chave));
        return [...prev, ...validos.filter((f) => !existentes.has(chave(f)))];
      });
    }
  };

  const onInput = (e: ChangeEvent<HTMLInputElement>) => {
    adicionar(Array.from(e.target.files ?? []));
    e.target.value = '';
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setArrastando(false);
    adicionar(Array.from(e.dataTransfer.files ?? []));
  };

  const enviarLote = async (lista: File[]) => {
    if (!lista.length) return;
    setFiles(lista);
    const r = await enviar(lista, { clienteId, vinculo: {}, categoria: 'outros', fonte: 'cliente' }, 5);
    toast({
      title: r.erros
        ? `${r.ok} enviado(s), ${r.erros} com erro`
        : `${r.ok} documento(s) enviado(s) para "Sem vínculo"`,
      variant: r.erros ? 'destructive' : undefined,
    });
    if (!r.erros) {
      setFiles([]);
      reset();
      onOpenChange(false);
    }
  };

  const falhas = itens.filter((i) => i.status === 'erro');
  const concluidos = itens.filter((i) => i.status === 'ok' || i.status === 'erro').length;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!rodando) onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload em massa</DialogTitle>
          <DialogDescription>
            Envie vários arquivos (ou uma pasta) de uma vez. Todos entram em{' '}
            <span className="font-medium">Sem vínculo</span> para serem classificados/vinculados depois.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {!rodando && itens.length === 0 && (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
                onDragLeave={() => setArrastando(false)}
                onDrop={onDrop}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors',
                  arrastando ? 'border-osg-400 bg-osg-50' : 'border-osg-200 bg-osg-50/40',
                )}
              >
                <FolderUp className="h-8 w-8 text-osg-moss/70" />
                <p className="text-sm text-slate-600">Arraste os arquivos aqui</p>
                <div className="mt-1 flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => filesRef.current?.click()}>
                    <FileUp className="mr-2 h-4 w-4" /> Escolher arquivos
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => folderRef.current?.click()}>
                    <FolderUp className="mr-2 h-4 w-4" /> Escolher pasta
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">PDF, imagens ou Office · até 50 MB cada</p>
              </div>
              <input ref={filesRef} type="file" accept={ACCEPT} multiple className="hidden" onChange={onInput} />
              <input ref={folderRef} type="file" accept={ACCEPT} multiple className="hidden" onChange={onInput} />

              {files.length > 0 && (
                <p className="text-sm text-slate-600">
                  <span className="font-medium">{files.length}</span> arquivo(s) prontos para enviar.
                </p>
              )}
            </>
          )}

          {itens.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">
                  {rodando ? 'Enviando…' : 'Concluído'} — {concluidos} de {itens.length}
                </span>
                {falhas.length > 0 && !rodando && (
                  <span className="text-destructive">{falhas.length} com erro</span>
                )}
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-osg-100">
                <div
                  className="h-full bg-osg-moss transition-[width] duration-200"
                  style={{ width: `${itens.length ? (concluidos / itens.length) * 100 : 0}%` }}
                />
              </div>
              <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
                {itens.map((it, k) => (
                  <li key={`${it.file.name}-${k}`} className="flex items-center gap-2 text-xs">
                    {it.status === 'ok' && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
                    {it.status === 'erro' && <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />}
                    {it.status === 'enviando' && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-osg-moss" />}
                    {it.status === 'pendente' && <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-osg-200" />}
                    <span className="min-w-0 flex-1 truncate text-slate-600" title={it.file.name}>{it.file.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={rodando}>
            {itens.length > 0 && !rodando ? 'Fechar' : 'Cancelar'}
          </Button>
          {falhas.length > 0 && !rodando ? (
            <Button onClick={() => enviarLote(falhas.map((f) => f.file))}>
              <RotateCw className="mr-2 h-4 w-4" /> Reenviar falhas ({falhas.length})
            </Button>
          ) : (
            <Button onClick={() => enviarLote(files)} disabled={!files.length || rodando}>
              {rodando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
              {files.length ? `Enviar ${files.length}` : 'Enviar'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
