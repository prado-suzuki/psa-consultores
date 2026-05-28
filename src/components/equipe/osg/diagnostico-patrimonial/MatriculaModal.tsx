import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/equipe/osg/OsgDialog';
import { useDirtyClose } from '@/components/equipe/osg/useDirtyClose';
import { UnsavedChangesAlert } from '@/components/equipe/osg/UnsavedChangesAlert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { RequiredMark } from '@/components/ui/required-mark';
import { CurrencyInput } from '@/components/equipe/osg/CurrencyInput';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { UF_STATES } from '@/components/equipe/client-form/constants';
import DateFieldWithInput from '@/components/equipe/client-form/DateFieldWithInput';
import {
  fieldCls, textareaCls, switchBoxCls, labelCls, FieldSection,
} from '@/components/equipe/osg/formKit';
import { CartorioSelect } from './CartorioSelect';
import { formatAreaUnidade, maxAreaDecimals, areaStep, clampAreaInput } from './areaUtils';
import {
  useUpsertMatricula,
  useImpedimentosByMatricula,
  useUpsertImpedimento,
  useDeleteImpedimento,
  type MatriculaRow,
  type ImpedimentoRow,
  type ImpedimentoEnriched,
  type TitularInicial,
} from '@/hooks/useDiagnosticoPatrimonial';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import { TitularidadesPanel } from './TitularidadesPanel';

const TIPO_IMPEDIMENTO_OPTIONS = [
  'Hipoteca', 'Penhora', 'Arrolamento Fiscal', 'Indisponibilidade',
  'Servidão', 'Reserva Legal', 'APP', 'Usufruto', 'Cláusula de Inalienabilidade',
  'Cessão Fiduciária', 'Outro',
];

const TIPO_EXPLORACAO_OPTIONS = [
  'Exploração Direta', 'Arrendamento', 'Parceria', 'Comodato', 'Posse', 'Outro',
];

const GEORREFERENCIAMENTO_OPTIONS = [
  'Sim', 'Não', 'Parcial', 'Em processo',
];

const UNIDADE_AREA_OPTIONS: { value: string; label: string }[] = [
  { value: 'ha', label: 'ha' },
  { value: 'm2', label: 'm²' },
];

interface MatriculaModalProps {
  open: boolean;
  // Quando null, a matrícula é cadastrada avulsa (órfã) a partir do Controle de Matrículas.
  bemId: string | null;
  // Tipo do bem para condicionar campos de imóvel rural. null = origem avulsa (mostra todos).
  bemTipo: string | null;
  matricula: MatriculaRow | null;
  pessoasCliente: PessoaRow[];
  matriculasDoBem: MatriculaRow[];
  onClose: () => void;
}

type DraftMatricula = {
  numero: string;
  matricula_anterior_id: string;
  matricula_anterior_texto: string;
  livro: string;
  folha: string;
  data_matricula: string;
  cartorio_id: string;
  municipio_imovel: string;
  uf_imovel: string;
  area_documento: string;
  area_real: string;
  area_explorada: string;
  area_unidade: string;
  georreferenciado: string;
  georref_prejudica_transferencia: boolean;
  tipo_exploracao_posse: string;
  descricao_psa_completa: string;
  confrontacoes_texto: string;
  origem_descricao: string;
};

const emptyDraft = (): DraftMatricula => ({
  numero: '',
  matricula_anterior_id: '',
  matricula_anterior_texto: '',
  livro: '',
  folha: '',
  data_matricula: '',
  cartorio_id: '',
  municipio_imovel: '',
  uf_imovel: '',
  area_documento: '',
  area_real: '',
  area_explorada: '',
  area_unidade: 'ha',
  georreferenciado: '',
  georref_prejudica_transferencia: false,
  tipo_exploracao_posse: '',
  descricao_psa_completa: '',
  confrontacoes_texto: '',
  origem_descricao: '',
});

const fromMatricula = (m: MatriculaRow): DraftMatricula => ({
  numero: m.numero ?? '',
  matricula_anterior_id: m.matricula_anterior_id ?? '',
  matricula_anterior_texto: m.matricula_anterior_texto ?? '',
  livro: m.livro ?? '',
  folha: m.folha ?? '',
  data_matricula: m.data_matricula ?? '',
  cartorio_id: m.cartorio_id ?? '',
  municipio_imovel: m.municipio_imovel ?? '',
  uf_imovel: m.uf_imovel ?? '',
  area_documento: m.area_documento != null ? String(m.area_documento) : '',
  area_real: m.area_real != null ? String(m.area_real) : '',
  area_explorada: m.area_explorada != null ? String(m.area_explorada) : '',
  area_unidade: m.area_unidade ?? 'ha',
  georreferenciado: m.georreferenciado ?? '',
  georref_prejudica_transferencia: m.georref_prejudica_transferencia ?? false,
  tipo_exploracao_posse: m.tipo_exploracao_posse ?? '',
  descricao_psa_completa: m.descricao_psa_completa ?? '',
  confrontacoes_texto: m.confrontacoes_texto ?? '',
  origem_descricao: m.origem_descricao ?? '',
});

export function MatriculaModal({
  open, bemId, bemTipo, matricula, pessoasCliente, matriculasDoBem, onClose,
}: MatriculaModalProps) {
  const [draft, setDraft] = useState<DraftMatricula>(emptyDraft);
  const [titularInicial, setTitularInicial] = useState<{ titular_pessoa_id: string; tipo: string; fracao: string }>({
    titular_pessoa_id: '', tipo: 'DIREITO', fracao: '',
  });
  const upsert = useUpsertMatricula();
  const isEdit = !!matricula?.id;
  // Sem bem definido (cadastro avulso) mostramos os campos rurais — não há tipo para ocultá-los.
  const isImovelRural = bemTipo === 'IR' || bemTipo == null;
  const semPessoas = pessoasCliente.length === 0;

  // Snapshots do estado inicial para detectar "dirty" no fechamento. Quando o
  // usuário tenta fechar com alterações, abrimos um alerta antes de descartar.
  const initialDraftRef = useRef<string>('');
  const initialTitularRef = useRef<string>('');

  useEffect(() => {
    if (!open) return;
    const initialDraft = matricula ? fromMatricula(matricula) : emptyDraft();
    const initialTitular = { titular_pessoa_id: '', tipo: 'DIREITO', fracao: '' };
    setDraft(initialDraft);
    setTitularInicial(initialTitular);
    initialDraftRef.current = JSON.stringify(initialDraft);
    initialTitularRef.current = JSON.stringify(initialTitular);
  }, [open, matricula]);

  const isDirty =
    JSON.stringify(draft) !== initialDraftRef.current ||
    (!isEdit && JSON.stringify(titularInicial) !== initialTitularRef.current);

  const { requestClose, alertProps } = useDirtyClose({ isDirty, onClose });

  const setField = <K extends keyof DraftMatricula>(field: K, value: DraftMatricula[K]) => {
    setDraft((p) => ({ ...p, [field]: value }));
  };

  const handleSave = () => {
    if (!draft.numero.trim()) {
      toast.error('Número da matrícula é obrigatório');
      return;
    }
    if (!draft.cartorio_id) {
      toast.error('Selecione o cartório');
      return;
    }
    if (!draft.municipio_imovel.trim()) {
      toast.error('Município do imóvel é obrigatório');
      return;
    }
    if (!draft.uf_imovel) {
      toast.error('UF do imóvel é obrigatória');
      return;
    }
    if (!draft.area_documento.trim() || isNaN(Number(draft.area_documento))) {
      toast.error('Área do documento é obrigatória');
      return;
    }
    const nullify = (v: string) => (v.trim() ? v : null);
    const toNum = (v: string) => (v.trim() && !isNaN(Number(v)) ? Number(v) : null);

    const values = {
      bem_id: bemId ?? (matricula?.bem_id ?? null),
      numero: draft.numero.trim(),
      matricula_anterior_id: draft.matricula_anterior_id || null,
      matricula_anterior_texto: nullify(draft.matricula_anterior_texto),
      livro: nullify(draft.livro),
      folha: nullify(draft.folha),
      data_matricula: nullify(draft.data_matricula),
      cartorio_id: draft.cartorio_id,
      municipio_imovel: draft.municipio_imovel.trim(),
      uf_imovel: draft.uf_imovel,
      area_documento: Number(draft.area_documento),
      area_real: toNum(draft.area_real),
      area_explorada: isImovelRural ? toNum(draft.area_explorada) : null,
      area_unidade: draft.area_unidade,
      georreferenciado: isImovelRural ? nullify(draft.georreferenciado) : null,
      georref_prejudica_transferencia: isImovelRural ? draft.georref_prejudica_transferencia : null,
      tipo_exploracao_posse: nullify(draft.tipo_exploracao_posse),
      descricao_psa_completa: nullify(draft.descricao_psa_completa),
      confrontacoes_texto: nullify(draft.confrontacoes_texto),
      origem_descricao: nullify(draft.origem_descricao),
    };

    let titular: TitularInicial | undefined;
    if (!isEdit) {
      if (!titularInicial.titular_pessoa_id) {
        toast.error('Selecione o titular inicial da matrícula');
        return;
      }
      let fracaoNum: number | null = null;
      if (titularInicial.fracao.trim()) {
        const parsed = Number(titularInicial.fracao);
        if (isNaN(parsed) || parsed <= 0 || parsed > 100) {
          toast.error('Fração do titular deve estar entre 0 e 100');
          return;
        }
        fracaoNum = parsed;
      }
      titular = {
        titular_pessoa_id: titularInicial.titular_pessoa_id,
        tipo: titularInicial.tipo,
        fracao: fracaoNum,
      };
    }

    upsert.mutate(
      { values, original: matricula, titular },
      { onSuccess: () => onClose() },
    );
  };

  const matriculasAnterioresPossiveis = matriculasDoBem.filter((m) => m.id !== matricula?.id);

  // Numeração sequencial das seções, avaliada na ordem de renderização — assim
  // seções condicionais (titular inicial, georref) não deixam buracos na sequência.
  let secNo = 0;
  const nextNo = () => String(++secNo).padStart(2, '0');
  const tabTriggerCls =
    'relative -mb-px rounded-none border-b-2 border-transparent bg-transparent px-1 pb-3 pt-0 ' +
    'text-sm font-medium text-muted-foreground shadow-none ' +
    'data-[state=active]:border-osg-moss data-[state=active]:bg-transparent data-[state=active]:font-semibold ' +
    'data-[state=active]:text-osg-700 data-[state=active]:shadow-none';

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => !o && requestClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        <Tabs defaultValue="dados" className="flex min-h-0 flex-1 flex-col">
          {/* Cabeçalho + abas fixos no topo enquanto o formulário rola */}
          <div className="shrink-0 bg-background px-6 pt-5">
            <DialogHeader className="mb-4 space-y-0 text-left">
              <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
                {isEdit ? 'Editar matrícula' : 'Nova matrícula'}
                {isEdit && matricula?.numero && (
                  <span className="rounded-md bg-osg-50 px-2 py-0.5 font-mono text-sm font-semibold text-osg-700">
                    {matricula.numero}
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>
            <TabsList className="h-auto w-full justify-start gap-7 rounded-none border-b border-osg-100 bg-transparent p-0 text-muted-foreground">
              <TabsTrigger value="dados" className={tabTriggerCls}>Dados</TabsTrigger>
              <TabsTrigger value="titulares" disabled={!isEdit} className={tabTriggerCls}>
                Titularidade
              </TabsTrigger>
              <TabsTrigger value="impedimentos" disabled={!isEdit} className={tabTriggerCls}>
                Impedimentos
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Área rolável */}
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <TabsContent value="dados" className="mt-0 focus-visible:ring-0">
              <FieldSection number={nextNo()} title="Identificação">
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="space-y-1.5">
                      <Label className={labelCls}>
                        Nº da matrícula<RequiredMark />
                      </Label>
                      <Input
                        value={draft.numero}
                        onChange={(e) => setField('numero', e.target.value)}
                        className={`${fieldCls} font-mono`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className={labelCls}>Livro</Label>
                      <Input
                        value={draft.livro}
                        onChange={(e) => setField('livro', e.target.value)}
                        className={fieldCls}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className={labelCls}>Folha</Label>
                      <Input
                        value={draft.folha}
                        onChange={(e) => setField('folha', e.target.value)}
                        className={fieldCls}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className={labelCls}>Data</Label>
                      <DateFieldWithInput
                        value={draft.data_matricula}
                        onChange={(v) => setField('data_matricula', v)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className={labelCls}>
                      Cartório<RequiredMark />
                    </Label>
                    <CartorioSelect
                      value={draft.cartorio_id}
                      onChange={(v) => setField('cartorio_id', v)}
                    />
                  </div>
                </div>
              </FieldSection>

              {!isEdit && (
                <FieldSection number={nextNo()} title="Titular inicial — Propriedade de Direito (DT)">
                  <div className="rounded-md border border-osg-moss/20 bg-osg-moss/[0.04] p-4">
                    {semPessoas ? (
                      <p className="text-xs text-amber-600">
                        Nenhuma pessoa disponível. Cadastre o titular na Qualificação das Partes (ou selecione
                        um cliente) antes de criar a matrícula.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className={labelCls}>Titular<RequiredMark /></Label>
                          <Select
                            value={titularInicial.titular_pessoa_id || undefined}
                            onValueChange={(v) => setTitularInicial((p) => ({ ...p, titular_pessoa_id: v }))}
                          >
                            <SelectTrigger className={fieldCls}><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              {pessoasCliente.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.denominacao} <span className="text-xs text-muted-foreground">({p.tipo_pessoa})</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className={labelCls}>Fração (%) — opcional</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={titularInicial.fracao}
                            onChange={(e) => setTitularInicial((p) => ({ ...p, fracao: e.target.value }))}
                            placeholder="ex: 50"
                            className={`${fieldCls} font-mono`}
                          />
                        </div>
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-3">
                      Toda matrícula precisa de ao menos um titular — é ele que define o cliente.
                      Ele entra como Propriedade de Direito (DT); titulares de FT e demais de DT
                      podem ser adicionados depois de salvar.
                    </p>
                  </div>
                </FieldSection>
              )}

              <FieldSection number={nextNo()} title="Localização e áreas" hint={`áreas em ${formatAreaUnidade(draft.area_unidade)}`}>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2 space-y-1.5">
                      <Label className={labelCls}>
                        Município<RequiredMark />
                      </Label>
                      <Input
                        value={draft.municipio_imovel}
                        onChange={(e) => setField('municipio_imovel', e.target.value)}
                        className={fieldCls}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className={labelCls}>
                        UF<RequiredMark />
                      </Label>
                      <Select value={draft.uf_imovel || undefined} onValueChange={(v) => setField('uf_imovel', v)}>
                        <SelectTrigger className={fieldCls}><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {UF_STATES.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="space-y-1.5">
                      <Label className={labelCls}>Unidade</Label>
                      <Select
                        value={draft.area_unidade}
                        onValueChange={(v) => setDraft((prev) => ({
                          ...prev,
                          area_unidade: v,
                          area_documento: clampAreaInput(prev.area_documento, v),
                          area_real: clampAreaInput(prev.area_real, v),
                          area_explorada: clampAreaInput(prev.area_explorada, v),
                        }))}
                      >
                        <SelectTrigger className={fieldCls}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {UNIDADE_AREA_OPTIONS.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className={labelCls}>
                        Área documento<RequiredMark />
                      </Label>
                      <Input
                        type="number"
                        step={areaStep(draft.area_unidade)}
                        value={draft.area_documento}
                        onChange={(e) => setField('area_documento', clampAreaInput(e.target.value, draft.area_unidade))}
                        className={`${fieldCls} font-mono`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className={labelCls}>Área real</Label>
                      <Input
                        type="number"
                        step={areaStep(draft.area_unidade)}
                        value={draft.area_real}
                        onChange={(e) => setField('area_real', clampAreaInput(e.target.value, draft.area_unidade))}
                        className={`${fieldCls} font-mono`}
                      />
                    </div>
                    {isImovelRural && (
                      <div className="space-y-1.5">
                        <Label className={labelCls}>Área explorada</Label>
                        <Input
                          type="number"
                          step={areaStep(draft.area_unidade)}
                          value={draft.area_explorada}
                          onChange={(e) => setField('area_explorada', clampAreaInput(e.target.value, draft.area_unidade))}
                          className={`${fieldCls} font-mono`}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </FieldSection>

              {isImovelRural && (
                <FieldSection number={nextNo()} title="Georreferenciamento">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                    <div className="space-y-1.5">
                      <Label className={labelCls}>Status</Label>
                      <Select
                        value={draft.georreferenciado || undefined}
                        onValueChange={(v) => setField('georreferenciado', v)}
                      >
                        <SelectTrigger className={fieldCls}><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {GEORREFERENCIAMENTO_OPTIONS.map((o) => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className={switchBoxCls}>
                      <Switch
                        checked={draft.georref_prejudica_transferencia}
                        onCheckedChange={(v) => setField('georref_prejudica_transferencia', v)}
                      />
                      <Label className="text-sm">Prejudica transferência</Label>
                    </div>
                  </div>
                </FieldSection>
              )}

              <FieldSection number={nextNo()} title="Histórico e descrição">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className={labelCls}>Tipo de exploração/posse</Label>
                    <Select
                      value={draft.tipo_exploracao_posse || undefined}
                      onValueChange={(v) => setField('tipo_exploracao_posse', v)}
                    >
                      <SelectTrigger className={fieldCls}><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {TIPO_EXPLORACAO_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className={labelCls}>Matrícula anterior</Label>
                    <Select
                      value={draft.matricula_anterior_id || undefined}
                      onValueChange={(v) => setField('matricula_anterior_id', v)}
                    >
                      <SelectTrigger className={fieldCls}>
                        <SelectValue placeholder={matriculasAnterioresPossiveis.length ? 'Selecione...' : 'Nenhuma'} />
                      </SelectTrigger>
                      <SelectContent>
                        {matriculasAnterioresPossiveis.map((m) => (
                          <SelectItem key={m.id} value={m.id}>Matrícula {m.numero}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className={labelCls}>
                      Texto da matrícula anterior (caso não esteja cadastrada)
                    </Label>
                    <Input
                      value={draft.matricula_anterior_texto}
                      onChange={(e) => setField('matricula_anterior_texto', e.target.value)}
                      className={fieldCls}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className={labelCls}>Origem (descrição)</Label>
                    <Input
                      value={draft.origem_descricao}
                      onChange={(e) => setField('origem_descricao', e.target.value)}
                      className={fieldCls}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className={labelCls}>Confrontações</Label>
                    <Textarea
                      value={draft.confrontacoes_texto}
                      onChange={(e) => setField('confrontacoes_texto', e.target.value)}
                      className={`min-h-[80px] ${textareaCls}`}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className={labelCls}>Descrição PSA (completa)</Label>
                    <Textarea
                      value={draft.descricao_psa_completa}
                      onChange={(e) => setField('descricao_psa_completa', e.target.value)}
                      className={`min-h-[100px] ${textareaCls}`}
                    />
                  </div>
                </div>
              </FieldSection>
            </TabsContent>

            <TabsContent value="titulares" className="mt-0 focus-visible:ring-0">
              {isEdit && matricula && (
                <TitularidadesPanel
                  anchor={{ kind: 'matricula', id: matricula.id }}
                  pessoasCliente={pessoasCliente}
                  requireAtLeastOne
                />
              )}
            </TabsContent>

            <TabsContent value="impedimentos" className="mt-0 focus-visible:ring-0">
              {isEdit && matricula && (
                <ImpedimentosPanel
                  matriculaId={matricula.id}
                  areaUnidade={matricula.area_unidade}
                  pessoasCliente={pessoasCliente}
                />
              )}
            </TabsContent>
          </div>

          {/* Footer fixo */}
          <DialogFooter className="shrink-0 border-t border-osg-100 bg-background px-6 py-3.5">
            <Button variant="outline" onClick={requestClose} disabled={upsert.isPending}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={upsert.isPending || (!isEdit && semPessoas)}
              className="gap-1.5 bg-osg-moss text-white hover:bg-osg-moss/90"
            >
              {upsert.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isEdit ? 'Salvar alterações' : 'Cadastrar matrícula'}
            </Button>
          </DialogFooter>
        </Tabs>
      </DialogContent>
    </Dialog>
    <UnsavedChangesAlert {...alertProps} />
    </>
  );
}

// =============================================================================
// Impedimentos
// =============================================================================

interface ImpedimentosPanelProps {
  matriculaId: string;
  areaUnidade: string;
  pessoasCliente: PessoaRow[];
}

function ImpedimentosPanel({ matriculaId, areaUnidade, pessoasCliente }: ImpedimentosPanelProps) {
  const { data: impedimentos = [], isLoading } = useImpedimentosByMatricula(matriculaId);
  const upsert = useUpsertImpedimento();
  const deleteMutation = useDeleteImpedimento();

  const emptyImpedimento = () => ({
    tipo: 'Hipoteca', referencia: '', descricao: '',
    credor_pessoa_id: '', credor_nome: '',
    data_constituicao: '', data_validade: '',
    vlr: '', area_afetada: '',
    impede_transferencia: false, cancelado: false,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyImpedimento);

  const startAdd = () => {
    setEditingId(null);
    setDraft(emptyImpedimento());
    setAdding(true);
  };

  const startEdit = (i: ImpedimentoRow) => {
    setAdding(false);
    setEditingId(i.id);
    setDraft({
      tipo: i.tipo,
      referencia: i.referencia ?? '',
      descricao: i.descricao ?? '',
      credor_pessoa_id: i.credor_pessoa_id ?? '',
      credor_nome: i.credor_nome ?? '',
      data_constituicao: i.data_constituicao ?? '',
      data_validade: i.data_validade ?? '',
      vlr: i.vlr != null ? String(i.vlr) : '',
      area_afetada: i.area_afetada != null ? String(i.area_afetada) : '',
      impede_transferencia: i.impede_transferencia,
      cancelado: i.cancelado,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAdding(false);
    setDraft(emptyImpedimento());
  };

  const handleSave = () => {
    if (!draft.tipo.trim()) {
      toast.error('Selecione o tipo');
      return;
    }
    const nullify = (v: string) => (v.trim() ? v : null);
    const toNum = (v: string) => (v.trim() && !isNaN(Number(v)) ? Number(v) : null);

    const original = editingId ? impedimentos.find((i) => i.id === editingId) ?? null : null;

    upsert.mutate(
      {
        values: {
          matricula_id: matriculaId,
          tipo: draft.tipo,
          referencia: nullify(draft.referencia),
          descricao: nullify(draft.descricao),
          credor_pessoa_id: draft.credor_pessoa_id || null,
          credor_nome: nullify(draft.credor_nome),
          data_constituicao: nullify(draft.data_constituicao),
          data_validade: nullify(draft.data_validade),
          vlr: toNum(draft.vlr),
          area_afetada: toNum(draft.area_afetada),
          impede_transferencia: draft.impede_transferencia,
          cancelado: draft.cancelado,
        },
        original,
      },
      { onSuccess: cancelEdit },
    );
  };

  const formOpen = adding || editingId != null;

  return (
    <FieldSection
      number="01"
      title="Impedimentos"
      hint={!isLoading && impedimentos.length > 0 ? `${impedimentos.length} registro(s)` : undefined}
    >
      <div className="space-y-2.5">
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-2">Carregando...</p>
        ) : impedimentos.length === 0 && !formOpen ? (
          <p className="text-sm text-muted-foreground py-2">
            Nenhum impedimento cadastrado para esta matrícula.
          </p>
        ) : impedimentos.length > 0 ? (
          <div className="space-y-1.5">
            {impedimentos.map((i) => (
              <ImpedimentoRowItem
                key={i.id}
                impedimento={i}
                areaUnidade={areaUnidade}
                isEditing={editingId === i.id}
                onEdit={() => startEdit(i)}
                onDelete={() => deleteMutation.mutate(i)}
              />
            ))}
          </div>
        ) : null}

        {formOpen ? (
        <div className="rounded-md border border-osg-moss/20 bg-osg-moss/[0.04] p-4 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-osg-700">
            {editingId ? 'Editar impedimento' : 'Novo impedimento'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className={labelCls}>
              Tipo<RequiredMark />
            </Label>
            <Select value={draft.tipo} onValueChange={(v) => setDraft((p) => ({ ...p, tipo: v }))}>
              <SelectTrigger className={fieldCls}><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPO_IMPEDIMENTO_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className={labelCls}>Referência</Label>
            <Input
              value={draft.referencia}
              onChange={(e) => setDraft((p) => ({ ...p, referencia: e.target.value }))}
              placeholder="R-X/Av-Y"
              className={`${fieldCls} font-mono`}
            />
          </div>
          <div className="space-y-1.5">
            <Label className={labelCls}>Valor (R$)</Label>
            <CurrencyInput
              value={draft.vlr}
              onChange={(v) => setDraft((p) => ({ ...p, vlr: v }))}
              className={`${fieldCls} font-mono`}
            />
          </div>
          <div className="space-y-1.5">
            <Label className={labelCls}>Credor (PSA)</Label>
            <Select
              value={draft.credor_pessoa_id || undefined}
              onValueChange={(v) => setDraft((p) => ({ ...p, credor_pessoa_id: v }))}
            >
              <SelectTrigger className={fieldCls}><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {pessoasCliente.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.denominacao}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <Label className={labelCls}>Credor (texto livre)</Label>
            <Input
              value={draft.credor_nome}
              onChange={(e) => setDraft((p) => ({ ...p, credor_nome: e.target.value }))}
              placeholder="Quando o credor não estiver cadastrado"
              className={fieldCls}
            />
          </div>
          <div className="space-y-1.5">
            <Label className={labelCls}>Data constituição</Label>
            <DateFieldWithInput
              value={draft.data_constituicao}
              onChange={(v) => setDraft((p) => ({ ...p, data_constituicao: v }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className={labelCls}>Data validade</Label>
            <DateFieldWithInput
              value={draft.data_validade}
              onChange={(v) => setDraft((p) => ({ ...p, data_validade: v }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className={labelCls}>Área afetada ({formatAreaUnidade(areaUnidade)})</Label>
            <Input
              type="number"
              step={areaStep(areaUnidade)}
              value={draft.area_afetada}
              onChange={(e) => setDraft((p) => ({ ...p, area_afetada: clampAreaInput(e.target.value, areaUnidade) }))}
              className={`${fieldCls} font-mono`}
            />
          </div>
          <div className="md:col-span-3 space-y-1.5">
            <Label className={labelCls}>Descrição</Label>
            <Textarea
              value={draft.descricao}
              onChange={(e) => setDraft((p) => ({ ...p, descricao: e.target.value }))}
              className={`min-h-[60px] ${textareaCls}`}
            />
          </div>
          <div className={switchBoxCls}>
            <Switch
              checked={draft.impede_transferencia}
              onCheckedChange={(v) => setDraft((p) => ({ ...p, impede_transferencia: v }))}
            />
            <Label className="text-sm">Impede transferência</Label>
          </div>
          <div className={switchBoxCls}>
            <Switch
              checked={draft.cancelado}
              onCheckedChange={(v) => setDraft((p) => ({ ...p, cancelado: v }))}
            />
            <Label className="text-sm">Cancelado</Label>
          </div>
        </div>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={cancelEdit}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-1.5 bg-osg-moss text-white hover:bg-osg-moss/90"
              onClick={handleSave}
              disabled={upsert.isPending}
            >
              {upsert.isPending
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Plus className="h-3.5 w-3.5" />}
              {editingId ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-full justify-start gap-1.5 border border-dashed border-osg-200 text-muted-foreground hover:text-osg-700"
            onClick={startAdd}
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar impedimento
          </Button>
        )}
      </div>
    </FieldSection>
  );
}

interface ImpedimentoRowItemProps {
  impedimento: ImpedimentoEnriched;
  areaUnidade: string;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function ImpedimentoRowItem({ impedimento, areaUnidade, isEditing, onEdit, onDelete }: ImpedimentoRowItemProps) {
  const formatVlr = (v: number | null) =>
    v == null ? null : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div
      className={`rounded-md border px-3 py-2 ${isEditing ? 'bg-osg-50 border-osg-200' : 'bg-muted/30'} ${impedimento.cancelado ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="default" className="text-[10px]">{impedimento.tipo}</Badge>
            {impedimento.referencia && (
              <Badge variant="outline" className="text-[10px] font-mono">{impedimento.referencia}</Badge>
            )}
            {impedimento.impede_transferencia && (
              <Badge variant="destructive" className="text-[10px]">Impede transferência</Badge>
            )}
            {impedimento.cancelado && (
              <Badge variant="secondary" className="text-[10px]">Cancelado</Badge>
            )}
          </div>
          {impedimento.credor_denominacao && (
            <p className="text-xs">
              <span className="text-muted-foreground">Credor:</span>{' '}
              <span className="font-medium">{impedimento.credor_denominacao}</span>
            </p>
          )}
          {impedimento.descricao && (
            <p className="text-xs text-muted-foreground line-clamp-2">{impedimento.descricao}</p>
          )}
          <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
            {impedimento.vlr != null && <span>Valor: <span className="font-mono">{formatVlr(impedimento.vlr)}</span></span>}
            {impedimento.area_afetada != null && (
              <span>Área: <span className="font-mono">{impedimento.area_afetada} {formatAreaUnidade(areaUnidade)}</span></span>
            )}
            {impedimento.data_constituicao && (
              <span>Constituído: {new Date(impedimento.data_constituicao).toLocaleDateString('pt-BR')}</span>
            )}
            {impedimento.data_validade && (
              <span>Validade: {new Date(impedimento.data_validade).toLocaleDateString('pt-BR')}</span>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover impedimento?</AlertDialogTitle>
                <AlertDialogDescription>
                  Remover este impedimento ({impedimento.tipo}) da matrícula.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={onDelete}
                >
                  Remover
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
