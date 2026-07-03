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
import { VinculoSelect } from './VinculoSelect';
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
  const [files, setFiles] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);
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
      setFiles([]);
    }
  }, [open, categoriaInicial, vinculoInicial]);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const escolhidos = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!escolhidos.length) return;
    const validos = escolhidos.filter((f) => f.size <= MAX_BYTES);
    const grandes = escolhidos.length - validos.length;
    if (grandes) {
      toast({
        title: 'Arquivo(s) muito grande(s)',
        description: `${grandes} acima de 50 MB foram ignorados.`,
        variant: 'destructive',
      });
    }
    if (validos.length) setFiles(validos);
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
    // Sobe um por vez (mesma categoria/origem/vínculo p/ todos); coleta falhas.
    setEnviando(true);
    let ok = 0;
    const falhas: File[] = [];
    for (const f of files) {
      try {
        await upload.mutateAsync({
          clienteId, vinculo: vinculoSelecionado, categoria, file: f,
          nrMatricula: nrMatriculaSelecionada, fonte, silencioso: true,
        });
        ok += 1;
      } catch {
        falhas.push(f);
      }
    }
    setEnviando(false);
    if (ok) toast({ title: ok === 1 ? 'Documento anexado' : `${ok} documentos anexados` });
    if (falhas.length) {
      toast({
        title: `${falhas.length} não enviado(s)`,
        description: falhas.map((f) => f.name).join(', '),
        variant: 'destructive',
      });
      setFiles(falhas); // mantém só os que falharam, para reenvio
    } else {
      onOpenChange(false);
    }
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
            <label className={labelCls}>Arquivo</label>
            <input ref={inputRef} type="file" accept={ACCEPT} multiple className="hidden" onChange={onPick} />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={`${fieldCls} flex w-full items-center gap-2 px-3 text-left text-sm`}
            >
              <Paperclip className="h-4 w-4 shrink-0 text-osg-moss" />
              <span
                className={`min-w-0 flex-1 truncate ${files.length ? 'text-slate-700' : 'text-muted-foreground'}`}
                title={files.map((f) => f.name).join(', ')}
              >
                {files.length === 0
                  ? 'Escolher arquivo(s)…'
                  : files.length === 1
                    ? files[0].name
                    : `${files.length} arquivos selecionados`}
              </span>
            </button>
            <p className="text-[11px] text-muted-foreground">
              PDF, imagens ou Office · até 50 MB · pode selecionar vários
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!files.length || enviando || georefInvalido}>
            {enviando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {files.length > 1 ? `Anexar ${files.length}` : 'Anexar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
