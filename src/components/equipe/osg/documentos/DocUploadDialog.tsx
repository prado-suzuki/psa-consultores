import { useEffect, useRef, useState } from 'react';
import { Loader2, Paperclip, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { toast } from '@/hooks/use-toast';
import { fieldCls, labelCls } from '@/components/equipe/osg/formKit';
import { ACCEPT, CATEGORIAS, MAX_BYTES } from './docMeta';
import { categoriaDoTipo, tiposPorCategoria } from './docTipos';
import {
  useUploadDocumento,
  type DocCategoria,
  type DocFonte,
  type VinculoDoc,
} from '@/hooks/useDocumentoArquivo';

const ORDEM_CATEGORIAS = CATEGORIAS.map((c) => c.value);
const categoriaTexto = (v: DocCategoria) => CATEGORIAS.find((c) => c.value === v)?.label ?? v;

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

// O alvo do vínculo viaja codificado no value do <select> ("sem" | "pessoa:<id>"…).
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [fonte, setFonte] = useState<DocFonte>('cliente');
  const [tipo, setTipo] = useState<string>('');
  const [categoria, setCategoria] = useState<DocCategoria>(categoriaInicial ?? 'outros');
  const [alvo, setAlvo] = useState<string>(vinculoToValue(vinculoInicial));
  const [file, setFile] = useState<File | null>(null);
  const upload = useUploadDocumento();
  const gruposTipos = tiposPorCategoria(fonte === 'psa' ? 'psa' : 'cliente', ORDEM_CATEGORIAS);
  const pessoasPF = pessoas.filter((p) => p.tipo !== 'PJ');
  const pessoasPJ = pessoas.filter((p) => p.tipo === 'PJ');

  // Escolher um tipo pré-seleciona a categoria correta (o tipo em si não é gravado na Fase 1).
  const onTipoChange = (t: string) => {
    setTipo(t);
    const cat = categoriaDoTipo(t);
    if (cat) setCategoria(cat);
  };
  // Trocar a origem troca o conjunto de tipos disponíveis; zera o tipo escolhido.
  const onFonteChange = (f: DocFonte) => {
    setFonte(f);
    setTipo('');
  };
  const vinculoSelecionado = valueToVinculo(alvo);
  const nrMatriculaSelecionada = matriculaNumero(vinculoSelecionado.matriculaId, matriculas);
  const georefSemMatricula = categoria === 'georreferenciamento' && !vinculoSelecionado.matriculaId;
  const georefSemNumero = categoria === 'georreferenciamento' && !!vinculoSelecionado.matriculaId && !nrMatriculaSelecionada;
  const georefInvalido = georefSemMatricula || georefSemNumero;

  // Reabriu a partir de outra pasta: ressincroniza os campos com o contexto.
  useEffect(() => {
    if (open) {
      setFonte('cliente');
      setTipo('');
      setCategoria(categoriaInicial ?? 'outros');
      setAlvo(vinculoToValue(vinculoInicial));
      setFile(null);
    }
  }, [open, categoriaInicial, vinculoInicial]);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > MAX_BYTES) {
      toast({ title: 'Arquivo muito grande', description: 'Limite de 50 MB.', variant: 'destructive' });
      return;
    }
    setFile(f);
  };

  const submit = () => {
    if (!file) return;
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
    upload.mutate(
      { clienteId, vinculo: vinculoSelecionado, categoria, file, nrMatricula: nrMatriculaSelecionada, fonte },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anexar documento</DialogTitle>
          <DialogDescription>
            Escolha a origem e o tipo do documento (a categoria é preenchida automaticamente) e,
            se quiser, a entidade à qual ele pertence.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 min-w-0">
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
                    fonte === o.v
                      ? 'bg-white text-osg-700 shadow-sm'
                      : 'text-muted-foreground hover:text-osg-700'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>
              Tipo de documento{' '}
              <span className="font-normal text-muted-foreground">(opcional)</span>
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
            <p className="text-[11px] text-muted-foreground">
              Escolher um tipo preenche a categoria abaixo — você ainda pode ajustá-la.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Categoria</label>
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

          <div className="space-y-1.5">
            <label className={labelCls}>
              Vincular a{' '}
              <span className="font-normal text-muted-foreground">
                {categoria === 'georreferenciamento' ? '(obrigatório para georreferenciamento)' : '(opcional)'}
              </span>
            </label>
            <Select value={alvo} onValueChange={setAlvo}>
              <SelectTrigger className={fieldCls}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sem">Sem vínculo — apenas o cliente</SelectItem>
                {pessoasPF.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Pessoas Físicas</SelectLabel>
                    {pessoasPF.map((p) => (
                      <SelectItem key={p.id} value={`pessoa:${p.id}`}>{p.label}</SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {pessoasPJ.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Pessoas Jurídicas</SelectLabel>
                    {pessoasPJ.map((p) => (
                      <SelectItem key={p.id} value={`pessoa:${p.id}`}>{p.label}</SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {bens.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Bens</SelectLabel>
                    {bens.map((b) => (
                      <SelectItem key={b.id} value={`bem:${b.id}`}>{b.label}</SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {matriculas.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Matrículas</SelectLabel>
                    {matriculas.map((m) => (
                      <SelectItem key={m.id} value={`matricula:${m.id}`}>{m.label}</SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
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
            <label className={labelCls}>Arquivo</label>
            <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={onPick} />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={`${fieldCls} flex w-full items-center gap-2 px-3 text-left text-sm`}
            >
              <Paperclip className="h-4 w-4 shrink-0 text-osg-moss" />
              <span
                className={`min-w-0 flex-1 truncate ${file ? 'text-slate-700' : 'text-muted-foreground'}`}
                title={file?.name}
              >
                {file ? file.name : 'Escolher arquivo…'}
              </span>
            </button>
            <p className="text-[11px] text-muted-foreground">PDF, imagens ou Office · até 50 MB</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={upload.isPending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!file || upload.isPending || georefInvalido}>
            {upload.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Anexar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
