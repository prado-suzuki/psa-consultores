import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { FileUp, FolderUp, Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { fieldCls, labelCls } from '@/components/equipe/osg/formKit';
import { ACCEPT, CATEGORIAS, MAX_BYTES } from './docMeta';
import { categoriaDoTipo, tiposPorCategoria } from './docTipos';
import { VinculoSelect } from './VinculoSelect';
import {
  useUploadEmMassa,
  type DocCategoria,
  type DocFonte,
  type VinculoDoc,
} from '@/hooks/useDocumentoArquivo';

const ORDEM_CATEGORIAS = CATEGORIAS.map((c) => c.value);
const categoriaTexto = (v: DocCategoria) => CATEGORIAS.find((c) => c.value === v)?.label ?? v;

const EXTS = ACCEPT.split(',').map((e) => e.trim().toLowerCase());
const aceito = (f: File) => {
  const ext = `.${(f.name.split('.').pop() ?? '').toLowerCase()}`;
  return EXTS.includes(ext) && f.size <= MAX_BYTES;
};
const chaveArq = (f: File) => `${f.name}:${f.size}`;

export interface EntidadeOpcao {
  id: string;
  label: string;
  numero?: string | null;
  /** Só para Pessoas — permite separar PF/PJ no seletor de vínculo. */
  tipo?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  pessoas: EntidadeOpcao[];
  bens: EntidadeOpcao[];
  matriculas: EntidadeOpcao[];
  /** Pasta selecionada na árvore — pré-seleciona o alvo do vínculo. */
  vinculoInicial?: VinculoDoc;
  categoriaInicial?: DocCategoria;
}

// O alvo do vínculo viaja codificado no value ("sem" | "pessoa:<id>"…).
const vinculoToValue = (v?: VinculoDoc): string => {
  if (v?.pessoaId) return `pessoa:${v.pessoaId}`;
  if (v?.matriculaId) return `matricula:${v.matriculaId}`;
  if (v?.bemId) return `bem:${v.bemId}`;
  return 'sem';
};
const valueToVinculo = (val: string): VinculoDoc => {
  const [kind, id] = val.split(':');
  if (kind === 'pessoa') return { pessoaId: id };
  if (kind === 'matricula') return { matriculaId: id };
  if (kind === 'bem') return { bemId: id };
  return {};
};

const matriculaNumero = (matriculaId: string | null | undefined, matriculas: EntidadeOpcao[]) => {
  if (!matriculaId) return null;
  const matricula = matriculas.find((m) => m.id === matriculaId);
  return matricula?.numero?.trim() || matricula?.label.replace(/^Matrícula\s*/i, '').trim() || null;
};

export function DocUploadDialog({
  open, onOpenChange, clienteId, pessoas, bens, matriculas, vinculoInicial, categoriaInicial,
}: Props) {
  const filesRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const [fonte, setFonte] = useState<DocFonte>('cliente');
  const [tipo, setTipo] = useState<string>('');
  const [categoria, setCategoria] = useState<DocCategoria>(categoriaInicial ?? 'outros');
  const [alvo, setAlvo] = useState<string>(vinculoToValue(vinculoInicial));
  const [files, setFiles] = useState<File[]>([]);
  const [arrastando, setArrastando] = useState(false);
  const { itens, rodando, enviar } = useUploadEmMassa();

  const gruposTipos = tiposPorCategoria(fonte === 'psa' ? 'psa' : 'cliente', ORDEM_CATEGORIAS);
  const pessoasPF = pessoas.filter((p) => p.tipo !== 'PJ');
  const pessoasPJ = pessoas.filter((p) => p.tipo === 'PJ');

  // Escolher um tipo pré-seleciona a categoria correta (o tipo em si não é gravado).
  const onTipoChange = (t: string) => {
    setTipo(t);
    const cat = categoriaDoTipo(t);
    if (cat) setCategoria(cat);
  };
  const onFonteChange = (f: DocFonte) => {
    setFonte(f);
    setTipo('');
  };

  const vinculoSelecionado = valueToVinculo(alvo);
  const nrMatriculaSelecionada = matriculaNumero(vinculoSelecionado.matriculaId, matriculas);
  const georefSemMatricula = categoria === 'georreferenciamento' && !vinculoSelecionado.matriculaId;
  const georefSemNumero = categoria === 'georreferenciamento' && !!vinculoSelecionado.matriculaId && !nrMatriculaSelecionada;
  const georefInvalido = georefSemMatricula || georefSemNumero;

  // webkitdirectory não é atributo tipado; seta via ref para escolher pasta inteira.
  useEffect(() => {
    if (folderRef.current) {
      folderRef.current.setAttribute('webkitdirectory', '');
      folderRef.current.setAttribute('directory', '');
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setFonte('cliente');
      setTipo('');
      setCategoria(categoriaInicial ?? 'outros');
      setAlvo(vinculoToValue(vinculoInicial));
      setFiles([]);
      setArrastando(false);
    }
  }, [open, categoriaInicial, vinculoInicial]);

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
        const existentes = new Set(prev.map(chaveArq));
        return [...prev, ...validos.filter((f) => !existentes.has(chaveArq(f)))];
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

  const submit = async () => {
    if (!files.length) return;
    if (categoria === 'georreferenciamento' && !vinculoSelecionado.matriculaId) {
      toast({
        title: 'Vincule uma matrícula',
        description: 'Documentos de georreferenciamento precisam estar vinculados a uma matrícula.',
        variant: 'destructive',
      });
      return;
    }
    if (categoria === 'georreferenciamento' && !nrMatriculaSelecionada) {
      toast({
        title: 'Matrícula sem número',
        description: 'Não foi possível identificar o número da matrícula selecionada.',
        variant: 'destructive',
      });
      return;
    }
    const r = await enviar(
      files,
      { clienteId, vinculo: vinculoSelecionado, categoria, nrMatricula: nrMatriculaSelecionada, fonte },
      5,
    );
    if (r.ok) toast({ title: r.ok === 1 ? 'Documento anexado' : `${r.ok} documentos anexados` });
    if (r.erros) {
      toast({
        title: `${r.erros} não enviado(s)`,
        description: r.falhas.map((f) => f.name).join(', '),
        variant: 'destructive',
      });
      setFiles(r.falhas); // mantém só os que falharam, para reenvio
    } else {
      onOpenChange(false);
    }
  };

  const concluidos = itens.filter((i) => i.status === 'ok' || i.status === 'erro').length;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!rodando) onOpenChange(o); }}>
      <DialogContent className="max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Anexar documento</DialogTitle>
          <DialogDescription>
            Arraste ou escolha arquivos (ou uma pasta). Tipo, vínculo e categoria são opcionais —
            deixe como estão para organizar/vincular depois.
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4 py-2">
          <div className="space-y-1.5">
            <label className={labelCls}>Origem</label>
            <div className="flex gap-1 rounded-md border border-osg-200 bg-osg-50/60 p-1">
              {([
                { v: 'cliente', label: 'Recebido do cliente' },
                { v: 'psa', label: 'Produzido pela PSA' },
              ] as const).map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => onFonteChange(o.v)}
                  className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                    fonte === o.v ? 'bg-white text-osg-700 shadow-sm' : 'text-muted-foreground hover:text-osg-700'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>
              Tipo de documento <span className="font-normal text-muted-foreground">(opcional)</span>
            </label>
            <Select value={tipo || undefined} onValueChange={onTipoChange}>
              <SelectTrigger className={fieldCls}>
                <SelectValue placeholder="Selecionar da lista (define a categoria)" />
              </SelectTrigger>
              <SelectContent>
                {gruposTipos.map((g) => (
                  <SelectGroup key={g.categoria}>
                    <SelectLabel>{categoriaTexto(g.categoria)}</SelectLabel>
                    {g.tipos.map((t) => (
                      <SelectItem key={t.tipo} value={t.tipo}>{t.tipo}</SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>
              Vincular a{' '}
              <span className="font-normal text-muted-foreground">
                {categoria === 'georreferenciamento' ? '(obrigatório para georreferenciamento)' : '(opcional)'}
              </span>
            </label>
            <VinculoSelect
              value={alvo}
              onChange={setAlvo}
              pessoasPF={pessoasPF}
              pessoasPJ={pessoasPJ}
              bens={bens}
              matriculas={matriculas}
            />
            {georefSemMatricula && (
              <p className="text-[11px] text-destructive">
                Selecione uma matrícula para anexar documentos de georreferenciamento.
              </p>
            )}
            {georefSemNumero && (
              <p className="text-[11px] text-destructive">
                Não foi possível identificar o número da matrícula selecionada.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>
              Categoria <span className="font-normal text-muted-foreground">(opcional)</span>
            </label>
            <Select value={categoria} onValueChange={(v) => setCategoria(v as DocCategoria)}>
              <SelectTrigger className={fieldCls}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Arquivos: arrastar/soltar + escolher arquivos ou pasta */}
          <div className="space-y-1.5">
            <label className={labelCls}>Arquivos</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
              onDragLeave={() => setArrastando(false)}
              onDrop={onDrop}
              className={cn(
                'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors',
                arrastando ? 'border-osg-500 bg-osg-50' : 'border-osg-200 bg-osg-50/40',
              )}
            >
              <FolderUp className="h-7 w-7 text-osg-moss/70" />
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

            {files.length > 0 && !rodando && (
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span><span className="font-medium">{files.length}</span> arquivo(s) selecionado(s)</span>
                <button type="button" onClick={() => setFiles([])} className="inline-flex items-center gap-1 hover:text-osg-700">
                  <X className="h-3 w-3" /> limpar
                </button>
              </div>
            )}

            {rodando && (
              <div className="space-y-1">
                <p className="text-xs text-slate-600">Enviando {concluidos} de {itens.length}…</p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-osg-100">
                  <div
                    className="h-full bg-osg-moss transition-[width] duration-200"
                    style={{ width: `${itens.length ? (concluidos / itens.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={rodando}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!files.length || rodando || georefInvalido}>
            {rodando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {files.length > 1 ? `Anexar ${files.length}` : 'Anexar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
