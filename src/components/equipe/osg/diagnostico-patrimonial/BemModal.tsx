import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { useDirtyClose } from '@/components/equipe/osg/useDirtyClose';
import { UnsavedChangesAlert } from '@/components/equipe/osg/UnsavedChangesAlert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { RequiredMark } from '@/components/ui/required-mark';
import { CurrencyInput } from '@/components/equipe/osg/CurrencyInput';
import {
  fieldCls,
  textareaCls,
  switchBoxCls,
  labelCls,
  FieldSection,
  osgTabsListCls,
  osgTabTriggerCls,
} from '@/components/equipe/osg/formKit';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, Plus, Pencil, Trash2, FileText, Link2, Unlink } from 'lucide-react';
import { toast } from 'sonner';
import {
  useUpsertBem,
  useMatriculasByBem,
  useDeleteMatricula,
  useSetMatriculaBem,
  TIPO_BEM_OPTIONS,
  type BemRow,
  type MatriculaRow,
  type TipoBem,
  type TitularInicial,
} from '@/hooks/useDiagnosticoPatrimonial';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import { MatriculaModal } from './MatriculaModal';
import { TitularidadesPanel } from './TitularidadesPanel';
import { formatAreaUnidade } from './areaUtils';
import { VincularMatriculaDialog } from './VincularMatriculaDialog';

const STATUS_INTEGRALIZACAO_OPTIONS = [
  'Pendente',
  'Em análise',
  'Aprovado',
  'Integralizado',
  'Recusado',
  'Não se aplica',
];

interface BemModalProps {
  open: boolean;
  clienteId: string;
  bem: BemRow | null;
  pessoasCliente: PessoaRow[];
  onClose: () => void;
}

type DraftBem = {
  referencia_dp: string;
  tipo_bem: TipoBem;
  descricao_outros: string;
  denominacao: string;
  vlr_contabil: string;
  vlr_contabil_ajustado: string;
  vlr_benfeitorias: string;
  vlr_mercado: string;
  vlr_imposto_anual: string;
  imposto_anual_exercicio: string;
  ccir_codigo: string;
  inscricao_municipal: string;
  status_integralizacao: string;
  empresa_destino_pessoa_id: string;
  participa_estruturacao: boolean;
  motivo_nao_integralizacao: string;
  observacao: string;
};

const emptyDraft = (): DraftBem => ({
  referencia_dp: '',
  tipo_bem: 'IR',
  descricao_outros: '',
  denominacao: '',
  vlr_contabil: '',
  vlr_contabil_ajustado: '',
  vlr_benfeitorias: '',
  vlr_mercado: '',
  vlr_imposto_anual: '',
  imposto_anual_exercicio: '',
  ccir_codigo: '',
  inscricao_municipal: '',
  status_integralizacao: '',
  empresa_destino_pessoa_id: '',
  participa_estruturacao: true,
  motivo_nao_integralizacao: '',
  observacao: '',
});

const fromBem = (b: BemRow): DraftBem => ({
  referencia_dp: b.referencia_dp ?? '',
  tipo_bem: (b.tipo_bem as TipoBem) ?? 'IR',
  descricao_outros: b.descricao_outros ?? '',
  denominacao: b.denominacao ?? '',
  vlr_contabil: b.vlr_contabil != null ? String(b.vlr_contabil) : '',
  vlr_contabil_ajustado: b.vlr_contabil_ajustado != null ? String(b.vlr_contabil_ajustado) : '',
  vlr_benfeitorias: b.vlr_benfeitorias != null ? String(b.vlr_benfeitorias) : '',
  vlr_mercado: b.vlr_mercado != null ? String(b.vlr_mercado) : '',
  vlr_imposto_anual: b.vlr_imposto_anual != null ? String(b.vlr_imposto_anual) : '',
  imposto_anual_exercicio:
    b.imposto_anual_exercicio != null ? String(b.imposto_anual_exercicio) : '',
  ccir_codigo: b.ccir_codigo ?? '',
  inscricao_municipal: b.inscricao_municipal ?? '',
  status_integralizacao: b.status_integralizacao ?? '',
  empresa_destino_pessoa_id: b.empresa_destino_pessoa_id ?? '',
  participa_estruturacao: b.participa_estruturacao ?? true,
  motivo_nao_integralizacao: b.motivo_nao_integralizacao ?? '',
  observacao: b.observacao ?? '',
});

export function BemModal({ open, clienteId, bem, pessoasCliente, onClose }: BemModalProps) {
  const [draft, setDraft] = useState<DraftBem>(emptyDraft);
  const upsert = useUpsertBem();
  const { data: matriculas = [], isLoading: loadingMatriculas } = useMatriculasByBem(
    bem?.id ?? null,
  );
  const deleteMatricula = useDeleteMatricula();
  const setMatriculaBem = useSetMatriculaBem();

  const [matriculaModal, setMatriculaModal] = useState<{
    open: boolean;
    matricula: MatriculaRow | null;
  }>({
    open: false,
    matricula: null,
  });
  const [vincularOpen, setVincularOpen] = useState(false);
  const [titularInicial, setTitularInicial] = useState<{
    titular_pessoa_id: string;
    tipo: string;
    fracao: string;
  }>({
    titular_pessoa_id: '',
    tipo: 'DIREITO',
    fracao: '',
  });
  const [activeTab, setActiveTab] = useState('dados');

  const isEdit = !!bem?.id;
  const isImovel = draft.tipo_bem === 'IR' || draft.tipo_bem === 'IB';
  const isImovelRural = draft.tipo_bem === 'IR';
  const isOutros = draft.tipo_bem === 'OU';
  // Bens sem matrícula (PS/AP/OU) registram titularidade direto no bem.
  const temTitularidade = !isImovel;
  const semPessoas = pessoasCliente.length === 0;

  // Snapshots do estado inicial para detectar "dirty" e pedir confirmação ao fechar.
  const initialDraftRef = useRef<string>('');
  const initialTitularRef = useRef<string>('');

  useEffect(() => {
    if (!open) return;
    const initial = bem ? fromBem(bem) : emptyDraft();
    const initialTitular = { titular_pessoa_id: '', tipo: 'DIREITO', fracao: '' };
    setDraft(initial);
    setTitularInicial(initialTitular);
    setActiveTab('dados');
    initialDraftRef.current = JSON.stringify(initial);
    initialTitularRef.current = JSON.stringify(initialTitular);
  }, [open, bem]);

  // O titular inicial só conta como alteração ao criar um bem com titularidade.
  const isDirty =
    JSON.stringify(draft) !== initialDraftRef.current ||
    (!isEdit && temTitularidade && JSON.stringify(titularInicial) !== initialTitularRef.current);
  const { requestClose, alertProps } = useDirtyClose({ isDirty, onClose });

  const setField = <K extends keyof DraftBem>(field: K, value: DraftBem[K]) => {
    setDraft((p) => ({ ...p, [field]: value }));
  };

  const pjs = useMemo(() => pessoasCliente.filter((p) => p.tipo_pessoa === 'PJ'), [pessoasCliente]);

  const handleSave = () => {
    if (!draft.referencia_dp.trim()) {
      toast.error('Referência DP é obrigatória');
      return;
    }
    if (!draft.denominacao.trim()) {
      toast.error('Denominação é obrigatória');
      return;
    }
    if (isOutros && !draft.descricao_outros.trim()) {
      toast.error('Especifique o tipo de bem');
      return;
    }
    // Para imóveis (IR/IB) os valores vivem na matrícula; o valor contábil do bem é opcional.
    if (!isImovel && (!draft.vlr_contabil.trim() || isNaN(Number(draft.vlr_contabil)))) {
      toast.error('Valor contábil é obrigatório');
      return;
    }

    const nullify = (v: string) => (v.trim() ? v : null);
    const toNum = (v: string) => (v.trim() && !isNaN(Number(v)) ? Number(v) : null);
    const toInt = (v: string) => (v.trim() && !isNaN(parseInt(v, 10)) ? parseInt(v, 10) : null);

    const values = {
      cliente_id: clienteId,
      referencia_dp: draft.referencia_dp.trim(),
      tipo_bem: draft.tipo_bem,
      descricao_outros: isOutros ? nullify(draft.descricao_outros) : null,
      denominacao: draft.denominacao.trim(),
      vlr_contabil: isImovel ? toNum(draft.vlr_contabil) : Number(draft.vlr_contabil),
      vlr_contabil_ajustado: isImovel ? null : toNum(draft.vlr_contabil_ajustado),
      vlr_benfeitorias: isImovel ? null : toNum(draft.vlr_benfeitorias),
      vlr_mercado: isImovel ? null : toNum(draft.vlr_mercado),
      vlr_imposto_anual: isImovel ? null : toNum(draft.vlr_imposto_anual),
      imposto_anual_exercicio: isImovel ? null : toInt(draft.imposto_anual_exercicio),
      ccir_codigo: isImovelRural ? nullify(draft.ccir_codigo) : null,
      inscricao_municipal: draft.tipo_bem === 'IB' ? nullify(draft.inscricao_municipal) : null,
      status_integralizacao: nullify(draft.status_integralizacao),
      empresa_destino_pessoa_id: draft.empresa_destino_pessoa_id || null,
      participa_estruturacao: draft.participa_estruturacao,
      motivo_nao_integralizacao: !draft.participa_estruturacao
        ? nullify(draft.motivo_nao_integralizacao)
        : null,
      observacao: nullify(draft.observacao),
    };

    // Bem não-imóvel precisa nascer com ao menos um titular (criação atômica
    // via RPC). Imóveis e edições seguem o insert/update simples.
    let titular: TitularInicial | undefined;
    if (temTitularidade && !isEdit) {
      if (!titularInicial.titular_pessoa_id) {
        setActiveTab('titulares');
        toast.error('Selecione o titular inicial do bem');
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

    upsert.mutate({ values, original: bem, titular }, { onSuccess: () => onClose() });
  };

  let secNo = 0;
  const nextNo = () => String(++secNo).padStart(2, '0');

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && requestClose()}>
        <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
          <Tabs
            value={temTitularidade ? activeTab : 'dados'}
            onValueChange={setActiveTab}
            className="flex min-h-0 flex-1 flex-col"
          >
            {/* Cabeçalho + abas fixos no topo enquanto o formulário rola */}
            <div className="shrink-0 bg-background px-6 pt-5">
              <DialogHeader className="mb-4 space-y-0 text-left">
                <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
                  {isEdit ? 'Editar bem' : 'Novo bem'}
                  {isEdit && bem?.referencia_dp && (
                    <span className="rounded-md bg-osg-50 px-2 py-0.5 font-mono text-sm font-semibold text-osg-700">
                      {bem.referencia_dp}
                    </span>
                  )}
                </DialogTitle>
              </DialogHeader>
              {temTitularidade && (
                // A barra desliza para dentro quando o tipo passa a não-imóvel,
                // sinalizando que surgiu a aba de Titularidade.
                <TabsList
                  className={`${osgTabsListCls} animate-in fade-in slide-in-from-top-2 duration-300`}
                >
                  <TabsTrigger value="dados" className={osgTabTriggerCls}>
                    Dados
                  </TabsTrigger>
                  <TabsTrigger value="titulares" className={osgTabTriggerCls}>
                    Titularidade
                    {/* Ponto pulsante enquanto o titular obrigatório não é escolhido. */}
                    {!isEdit && !titularInicial.titular_pessoa_id && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5" aria-hidden>
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-osg-moss opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-osg-moss" />
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>
              )}
            </div>

            {/* Área rolável */}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <TabsContent value="dados" className="mt-0 focus-visible:ring-0">
                <FieldSection number={nextNo()} title="Identificação">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className={labelCls}>
                        Referência DP
                        <RequiredMark />
                      </Label>
                      <Input
                        value={draft.referencia_dp}
                        onChange={(e) => setField('referencia_dp', e.target.value)}
                        placeholder="ex: IR-01"
                        className={`${fieldCls} font-mono`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className={labelCls}>
                        Tipo de bem
                        <RequiredMark />
                      </Label>
                      <Select
                        value={draft.tipo_bem}
                        onValueChange={(v: TipoBem) => setField('tipo_bem', v)}
                      >
                        <SelectTrigger className={fieldCls}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPO_BEM_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              <span className="font-mono mr-2">{o.value}</span>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <div className={`${switchBoxCls} w-full`}>
                        <Switch
                          checked={draft.participa_estruturacao}
                          onCheckedChange={(v) => setField('participa_estruturacao', v)}
                        />
                        <Label className="text-sm">Participa da estruturação</Label>
                      </div>
                    </div>
                    {isOutros && (
                      <div className="md:col-span-3 space-y-1.5">
                        <Label className={labelCls}>
                          Especifique o tipo de bem
                          <RequiredMark />
                        </Label>
                        <Input
                          value={draft.descricao_outros}
                          onChange={(e) => setField('descricao_outros', e.target.value)}
                          placeholder="Descreva o tipo de bem"
                          className={fieldCls}
                        />
                      </div>
                    )}
                    <div className="md:col-span-3 space-y-1.5">
                      <Label className={labelCls}>
                        Denominação
                        <RequiredMark />
                      </Label>
                      <Input
                        value={draft.denominacao}
                        onChange={(e) => setField('denominacao', e.target.value)}
                        placeholder="Nome do bem / fazenda / propriedade"
                        className={fieldCls}
                      />
                    </div>
                  </div>
                </FieldSection>

                {!isImovel && (
                <FieldSection number={nextNo()} title="Valores">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className={labelCls}>
                        Vlr. contábil
                        <RequiredMark />
                      </Label>
                      <CurrencyInput
                        value={draft.vlr_contabil}
                        onChange={(v) => setField('vlr_contabil', v)}
                        className={`${fieldCls} font-mono`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className={labelCls}>Vlr. contábil ajustado</Label>
                      <CurrencyInput
                        value={draft.vlr_contabil_ajustado}
                        onChange={(v) => setField('vlr_contabil_ajustado', v)}
                        className={`${fieldCls} font-mono`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className={labelCls}>Vlr. benfeitorias</Label>
                      <CurrencyInput
                        value={draft.vlr_benfeitorias}
                        onChange={(v) => setField('vlr_benfeitorias', v)}
                        className={`${fieldCls} font-mono`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className={labelCls}>Vlr. mercado</Label>
                      <CurrencyInput
                        value={draft.vlr_mercado}
                        onChange={(v) => setField('vlr_mercado', v)}
                        className={`${fieldCls} font-mono`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className={labelCls}>
                        {isImovelRural
                          ? 'ITR anual'
                          : draft.tipo_bem === 'IB'
                            ? 'IPTU anual'
                            : 'Imposto anual'}
                      </Label>
                      <CurrencyInput
                        value={draft.vlr_imposto_anual}
                        onChange={(v) => setField('vlr_imposto_anual', v)}
                        className={`${fieldCls} font-mono`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className={labelCls}>Exercício</Label>
                      <Input
                        type="number"
                        value={draft.imposto_anual_exercicio}
                        onChange={(e) => setField('imposto_anual_exercicio', e.target.value)}
                        placeholder="ex: 2025"
                        className={`${fieldCls} font-mono`}
                      />
                    </div>
                  </div>
                </FieldSection>
                )}

                {isImovel && (
                  <FieldSection number={nextNo()} title="Cadastros oficiais">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {isImovelRural && (
                        <div className="space-y-1.5">
                          <Label className={labelCls}>CCIR</Label>
                          <Input
                            value={draft.ccir_codigo}
                            onChange={(e) => setField('ccir_codigo', e.target.value)}
                            className={`${fieldCls} font-mono`}
                          />
                        </div>
                      )}
                      {draft.tipo_bem === 'IB' && (
                        <div className="space-y-1.5">
                          <Label className={labelCls}>Inscrição municipal</Label>
                          <Input
                            value={draft.inscricao_municipal}
                            onChange={(e) => setField('inscricao_municipal', e.target.value)}
                            className={`${fieldCls} font-mono`}
                          />
                        </div>
                      )}
                    </div>
                  </FieldSection>
                )}

                <FieldSection number={nextNo()} title="Integralização">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className={labelCls}>Status integralização</Label>
                      <Select
                        value={draft.status_integralizacao || undefined}
                        onValueChange={(v) => setField('status_integralizacao', v)}
                      >
                        <SelectTrigger className={fieldCls}>
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_INTEGRALIZACAO_OPTIONS.map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className={labelCls}>PJ de destino</Label>
                      <Select
                        value={draft.empresa_destino_pessoa_id || undefined}
                        onValueChange={(v) => setField('empresa_destino_pessoa_id', v)}
                      >
                        <SelectTrigger className={fieldCls}>
                          <SelectValue
                            placeholder={
                              pjs.length
                                ? 'Selecione...'
                                : 'Cadastre uma PJ na Qualificação das Partes'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {pjs.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.denominacao}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {!draft.participa_estruturacao && (
                      <div className="md:col-span-2 space-y-1.5">
                        <Label className={labelCls}>Motivo de não integralização</Label>
                        <Textarea
                          value={draft.motivo_nao_integralizacao}
                          onChange={(e) => setField('motivo_nao_integralizacao', e.target.value)}
                          className={`min-h-[60px] ${textareaCls}`}
                        />
                      </div>
                    )}
                  </div>
                </FieldSection>

                <FieldSection number={nextNo()} title="Observação">
                  <Textarea
                    value={draft.observacao}
                    onChange={(e) => setField('observacao', e.target.value)}
                    className={`min-h-[60px] ${textareaCls}`}
                  />
                </FieldSection>

                {isImovel && (
                  <FieldSection
                    number={nextNo()}
                    title="Matrículas"
                    hint={
                      isEdit && matriculas.length > 0
                        ? `${matriculas.length} registro(s)`
                        : undefined
                    }
                    actions={
                      <div className="flex gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1.5"
                          disabled={!isEdit}
                          onClick={() => setVincularOpen(true)}
                        >
                          <Link2 className="h-3.5 w-3.5" /> Vincular existente
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 gap-1.5 bg-osg-moss text-white hover:bg-osg-moss/90"
                          disabled={!isEdit}
                          onClick={() => setMatriculaModal({ open: true, matricula: null })}
                        >
                          <Plus className="h-3.5 w-3.5" /> Nova matrícula
                        </Button>
                      </div>
                    }
                  >
                    {!isEdit ? (
                      <p className="text-xs text-muted-foreground italic">
                        Salve o bem primeiro para cadastrar matrículas.
                      </p>
                    ) : loadingMatriculas ? (
                      <p className="text-xs text-muted-foreground">Carregando...</p>
                    ) : matriculas.length === 0 ? (
                      <Card>
                        <CardContent className="py-6 text-center text-muted-foreground text-sm">
                          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          Nenhuma matrícula cadastrada.
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-1.5">
                        {matriculas.map((m) => (
                          <MatriculaCard
                            key={m.id}
                            matricula={m}
                            onEdit={() => setMatriculaModal({ open: true, matricula: m })}
                            onUnlink={() => setMatriculaBem.mutate({ matricula: m, bemId: null })}
                            onDelete={() => deleteMatricula.mutate(m)}
                          />
                        ))}
                      </div>
                    )}
                  </FieldSection>
                )}
              </TabsContent>

              <TabsContent value="titulares" className="mt-0 focus-visible:ring-0">
                {isEdit && bem ? (
                  <TitularidadesPanel
                    anchor={{ kind: 'bem', id: bem.id }}
                    pessoasCliente={pessoasCliente}
                    requireAtLeastOne
                  />
                ) : (
                  // Na criação o bem ainda não existe: define-se o titular inicial,
                  // gravado junto com o bem na mesma transação (criar_bem_com_titular).
                  <FieldSection number="01" title="Titular inicial — Propriedade de Direito (DT)">
                    <div className="rounded-md border border-osg-moss/20 bg-osg-moss/[0.04] p-4">
                      {semPessoas ? (
                        <p className="text-xs text-amber-600">
                          Nenhuma pessoa disponível. Cadastre o titular na Qualificação das Partes
                          (ou selecione um cliente) antes de criar o bem.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className={labelCls}>
                              Titular
                              <RequiredMark />
                            </Label>
                            <Select
                              value={titularInicial.titular_pessoa_id || undefined}
                              onValueChange={(v) =>
                                setTitularInicial((p) => ({ ...p, titular_pessoa_id: v }))
                              }
                            >
                              <SelectTrigger className={fieldCls}>
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                {pessoasCliente.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.denominacao}{' '}
                                    <span className="text-xs text-muted-foreground">
                                      ({p.tipo_pessoa})
                                    </span>
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
                              onChange={(e) =>
                                setTitularInicial((p) => ({ ...p, fracao: e.target.value }))
                              }
                              placeholder="ex: 50"
                              className={`${fieldCls} font-mono`}
                            />
                          </div>
                        </div>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-3">
                        Todo bem sem matrícula precisa de ao menos um titular. Ele entra como
                        Propriedade de Direito (DT); demais titulares (FT e DT) podem ser
                        adicionados depois de salvar.
                      </p>
                    </div>
                  </FieldSection>
                )}
              </TabsContent>
            </div>

            <DialogFooter className="shrink-0 border-t border-osg-100 bg-background px-6 py-3.5">
              <Button variant="outline" onClick={requestClose} disabled={upsert.isPending}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={upsert.isPending || (temTitularidade && !isEdit && semPessoas)}
                className="gap-1.5 bg-osg-moss text-white hover:bg-osg-moss/90"
              >
                {upsert.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isEdit ? 'Salvar alterações' : 'Cadastrar bem'}
              </Button>
            </DialogFooter>
          </Tabs>
        </DialogContent>
      </Dialog>

      {bem && (
        <MatriculaModal
          open={matriculaModal.open}
          bemId={bem.id}
          bemTipo={bem.tipo_bem}
          matricula={matriculaModal.matricula}
          pessoasCliente={pessoasCliente}
          matriculasDoBem={matriculas}
          onClose={() => setMatriculaModal({ open: false, matricula: null })}
        />
      )}

      {bem && (
        <VincularMatriculaDialog
          open={vincularOpen}
          bemId={bem.id}
          clienteId={clienteId}
          onClose={() => setVincularOpen(false)}
        />
      )}

      <UnsavedChangesAlert {...alertProps} />
    </>
  );
}

interface MatriculaCardProps {
  matricula: MatriculaRow;
  onEdit: () => void;
  onUnlink: () => void;
  onDelete: () => void;
}

function MatriculaCard({ matricula, onEdit, onUnlink, onDelete }: MatriculaCardProps) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2 flex items-start gap-2">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="default" className="text-[10px] font-mono">
            Mat. {matricula.numero}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {matricula.municipio_imovel}/{matricula.uf_imovel}
          </span>
        </div>
        <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
          <span>
            Área doc:{' '}
            <span className="font-mono">
              {matricula.area_documento} {formatAreaUnidade(matricula.area_unidade)}
            </span>
          </span>
          {matricula.area_real != null && (
            <span>
              Área real:{' '}
              <span className="font-mono">
                {matricula.area_real} {formatAreaUnidade(matricula.area_unidade)}
              </span>
            </span>
          )}
          {matricula.georreferenciado && (
            <span>
              Georref: <span className="font-medium">{matricula.georreferenciado}</span>
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7" title="Desvincular do bem">
              <Unlink className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desvincular matrícula?</AlertDialogTitle>
              <AlertDialogDescription>
                A matrícula {matricula.numero} será desvinculada deste bem e voltará ao estado órfã
                (sem bem). Ela não será excluída — titulares e impedimentos são preservados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onUnlink}>Desvincular</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover matrícula?</AlertDialogTitle>
              <AlertDialogDescription>
                Remover a matrícula {matricula.numero}? Os titulares e impedimentos vinculados
                também serão removidos.
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
  );
}
