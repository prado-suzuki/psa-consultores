import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/equipe/osg/OsgDialog';
import { useDirtyClose } from '@/components/equipe/osg/useDirtyClose';
import { UnsavedChangesAlert } from '@/components/equipe/osg/UnsavedChangesAlert';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RequiredMark } from '@/components/ui/required-mark';
import { toast } from 'sonner';
import { Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { formatCpfCnpj, formatCep, UF_STATES } from '@/components/equipe/client-form/constants';
import {
  fieldCls, textareaCls, switchBoxCls, subFormBoxCls, labelCls, FieldSection,
  osgTabsListCls, osgTabTriggerCls,
} from '@/components/equipe/osg/formKit';
import { HistoricoFlutuante } from '@/components/equipe/osg/HistoricoFlutuante';
import { DocumentosTab } from '@/components/equipe/osg/documentos/DocumentosTab';
import { useClienteTemDocumentoGerado } from '@/hooks/useDocumentoGerado';
import type { AdministracaoEnriched, PessoaRow, TipoPessoa } from '@/hooks/useQualificacaoDasPartes';
import {
  useAdministracaoByPj,
  useDeleteAdministracao,
  useDeleteParentesco,
  useParentescosByCliente,
  useUpsertAdministracao,
  useUpsertParentesco,
  useUpsertPessoa,
} from '@/hooks/useQualificacaoDasPartes';

const ESTADO_CIVIL_OPTIONS = [
  'Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável',
];
const REGIME_BENS_OPTIONS = [
  'Comunhão Parcial', 'Comunhão Universal', 'Separação Total', 'Separação Obrigatória', 'Participação Final nos Aquestos',
];
const STATUS_CONSTITUICAO_OPTIONS = [
  'Ativa', 'Suspensa', 'Inapta', 'Baixada', 'Em constituição',
];

const TIPO_EMPRESA_OPTIONS: { value: string; label: string }[] = [
  { value: 'PR', label: 'Proprietária' },
  { value: 'CN', label: 'Controladora' },
  { value: 'SC', label: 'Sócia' },
];

const TIPO_PARENTESCO_OPTIONS = [
  'Filho(a)', 'Pai/Mãe', 'Irmão(ã)', 'Avô(ó)', 'Neto(a)',
  'Tio(a)', 'Sobrinho(a)', 'Primo(a)', 'Sogro(a)', 'Genro/Nora', 'Cunhado(a)',
  'Padrasto/Madrasta', 'Enteado(a)', 'Outro',
];

const NATUREZA_OPTIONS = ['Consanguíneo', 'Afim', 'Adotivo', 'Civil'];

const CARGO_OPTIONS = ['Administrador', 'Sócio-Administrador', 'Diretor', 'Presidente'];

const GENERO_OPTIONS: { value: string; label: string }[] = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Feminino' },
];

const DOC_IDENTIDADE_TIPO_OPTIONS: { value: string; label: string }[] = [
  { value: 'rg', label: 'RG' },
  { value: 'cnh', label: 'CNH' },
  { value: 'reservista', label: 'Reservista' },
  { value: 'ctps', label: 'CTPS' },
];

interface PessoaModalProps {
  open: boolean;
  clienteId: string;
  pessoa: PessoaRow | null;
  pessoasCliente: PessoaRow[];
  defaultTipo?: TipoPessoa;
  onClose: () => void;
}

type DraftPessoa = {
  tipo_pessoa: TipoPessoa;
  denominacao: string;
  cpf_cnpj: string;
  endereco_cep: string;
  endereco_logradouro: string;
  endereco_numero: string;
  endereco_complemento: string;
  endereco_bairro: string;
  endereco_municipio: string;
  endereco_uf: string;
  // PF
  genero: string;
  nacionalidade: string;
  naturalidade_municipio: string;
  naturalidade_uf: string;
  estado_civil: string;
  regime_bens: string;
  data_nascimento: string;
  filiacao_pai: string;
  filiacao_pai_pessoa_id: string;
  filiacao_mae: string;
  filiacao_mae_pessoa_id: string;
  profissao: string;
  documento_identidade_tipo: string;
  documento_identidade_numero: string;
  documento_identidade_orgao: string;
  documento_identidade_uf: string;
  conjuge_id: string;
  is_fundador: boolean;
  // PJ
  nire: string;
  junta_comercial_uf: string;
  data_constituicao: string;
  objeto_social: string;
  status_constituicao: string;
  tipo_empresa: string;
};

const emptyDraft = (): DraftPessoa => ({
  tipo_pessoa: 'PF',
  denominacao: '',
  cpf_cnpj: '',
  endereco_cep: '',
  endereco_logradouro: '',
  endereco_numero: '',
  endereco_complemento: '',
  endereco_bairro: '',
  endereco_municipio: '',
  endereco_uf: '',
  genero: '',
  nacionalidade: '',
  naturalidade_municipio: '',
  naturalidade_uf: '',
  estado_civil: '',
  regime_bens: '',
  data_nascimento: '',
  filiacao_pai: '',
  filiacao_pai_pessoa_id: '',
  filiacao_mae: '',
  filiacao_mae_pessoa_id: '',
  profissao: '',
  documento_identidade_tipo: '',
  documento_identidade_numero: '',
  documento_identidade_orgao: '',
  documento_identidade_uf: '',
  conjuge_id: '',
  is_fundador: false,
  nire: '',
  junta_comercial_uf: '',
  data_constituicao: '',
  objeto_social: '',
  status_constituicao: '',
  tipo_empresa: '',
});

const fromPessoa = (p: PessoaRow): DraftPessoa => ({
  tipo_pessoa: (p.tipo_pessoa as TipoPessoa) ?? 'PF',
  denominacao: p.denominacao ?? '',
  cpf_cnpj: p.cpf_cnpj ?? '',
  endereco_cep: p.endereco_cep ?? '',
  endereco_logradouro: p.endereco_logradouro ?? '',
  endereco_numero: p.endereco_numero ?? '',
  endereco_complemento: p.endereco_complemento ?? '',
  endereco_bairro: p.endereco_bairro ?? '',
  endereco_municipio: p.endereco_municipio ?? '',
  endereco_uf: p.endereco_uf ?? '',
  genero: p.genero ?? '',
  nacionalidade: p.nacionalidade ?? '',
  naturalidade_municipio: p.naturalidade_municipio ?? '',
  naturalidade_uf: p.naturalidade_uf ?? '',
  estado_civil: p.estado_civil ?? '',
  regime_bens: p.regime_bens ?? '',
  data_nascimento: p.data_nascimento ?? '',
  filiacao_pai: p.filiacao_pai ?? '',
  filiacao_pai_pessoa_id: p.filiacao_pai_pessoa_id ?? '',
  filiacao_mae: p.filiacao_mae ?? '',
  filiacao_mae_pessoa_id: p.filiacao_mae_pessoa_id ?? '',
  profissao: p.profissao ?? '',
  documento_identidade_tipo: p.documento_identidade_tipo ?? '',
  documento_identidade_numero: p.documento_identidade_numero ?? '',
  documento_identidade_orgao: p.documento_identidade_orgao ?? '',
  documento_identidade_uf: p.documento_identidade_uf ?? '',
  conjuge_id: p.conjuge_id ?? '',
  is_fundador: p.is_fundador ?? false,
  nire: p.nire ?? '',
  junta_comercial_uf: p.junta_comercial_uf ?? '',
  data_constituicao: p.data_constituicao ?? '',
  objeto_social: p.objeto_social ?? '',
  status_constituicao: p.status_constituicao ?? '',
  tipo_empresa: p.tipo_empresa ?? '',
});

// Campo de filiação: texto livre com autocomplete. Digitar busca pessoas já
// cadastradas (PF); selecionar uma vincula o FK; sem seleção, salva só o texto.
function FiliacaoCombobox({
  nome, pessoaId, candidates, placeholder, onChange,
}: {
  nome: string;
  pessoaId: string;
  candidates: PessoaRow[];
  placeholder: string;
  onChange: (nome: string, pessoaId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const termo = nome.trim().toLowerCase();
  const suggestions = termo
    ? candidates.filter((c) => (c.denominacao ?? '').toLowerCase().includes(termo)).slice(0, 8)
    : [];

  return (
    <div className="relative">
      <Input
        value={nome}
        // Digitar desvincula: volta a ser texto livre até selecionar alguém.
        onChange={(e) => { onChange(e.target.value, ''); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className={`${fieldCls} ${pessoaId ? 'pr-8' : ''}`}
      />
      {pessoaId && (
        <Check className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-osg-moss" />
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover py-1 shadow-md">
          {suggestions.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-osg-moss hover:text-white"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(c.denominacao ?? '', c.id);
                  setOpen(false);
                }}
              >
                <span className="truncate">{c.denominacao}</span>
                {pessoaId === c.id && <Check className="ml-auto h-3.5 w-3.5 shrink-0" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PessoaModal({ open, clienteId, pessoa, pessoasCliente, defaultTipo, onClose }: PessoaModalProps) {
  const [draft, setDraft] = useState<DraftPessoa>(emptyDraft);
  const [activeTab, setActiveTab] = useState('dados');
  const upsert = useUpsertPessoa();
  const upsertParentesco = useUpsertParentesco();
  const deleteParentesco = useDeleteParentesco();
  const { data: parentescosCliente = [] } = useParentescosByCliente(open ? clienteId : null);

  const [novoParente, setNovoParente] = useState<{ parenteId: string; tipo: string; natureza: string }>({
    parenteId: '', tipo: '', natureza: '',
  });

  // Snapshots do estado inicial para detectar "dirty" no fechamento. Atualizados
  // sempre que reinicializamos draft/novoParente (abertura ou troca de pessoa).
  const initialDraftRef = useRef<string>('');
  const initialParenteRef = useRef<string>('');

  useEffect(() => {
    if (!open) return;
    const initial = pessoa
      ? fromPessoa(pessoa)
      : { ...emptyDraft(), tipo_pessoa: defaultTipo ?? 'PF' };
    setDraft(initial);
    initialDraftRef.current = JSON.stringify(initial);
    setActiveTab('dados');
  }, [open, pessoa, defaultTipo]);

  const isPF = draft.tipo_pessoa === 'PF';
  const isEdit = !!pessoa?.id;

  // Vínculo de parentesco é 1:1: cada pessoa tem no máximo um, que ela "possui"
  // (pessoa_id = a própria). É salvo junto com a pessoa, sem botão dedicado.
  const parentescoAtual = pessoa?.id
    ? parentescosCliente.find((v) => v.pessoa_id === pessoa.id) ?? null
    : null;

  // Gate do histórico: só aparece em edição e quando o cliente já gerou versão.
  const { data: temDocumento = false } = useClienteTemDocumentoGerado(isEdit ? clienteId : null);
  const mostrarHistorico = isEdit && temDocumento;
  // PF não tem abas (Dados apenas); PJ ganha a aba Administração. O histórico
  // não entra como aba — flutua à direita do modal.
  const mostrarTabsList = !isPF || isEdit;

  useEffect(() => {
    if (!open) return;
    const initial = parentescoAtual
      ? {
          parenteId: parentescoAtual.parente_pessoa_id,
          tipo: parentescoAtual.tipo ?? '',
          natureza: parentescoAtual.natureza ?? '',
        }
      : { parenteId: '', tipo: '', natureza: '' };
    setNovoParente(initial);
    initialParenteRef.current = JSON.stringify(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pessoa?.id, parentescoAtual?.id]);

  const isDirty =
    JSON.stringify(draft) !== initialDraftRef.current ||
    JSON.stringify(novoParente) !== initialParenteRef.current;

  const { requestClose, alertProps } = useDirtyClose({ isDirty, onClose });

  // Reconcilia o vínculo 1:1 depois de salvar a pessoa (insert/update/delete).
  const reconcileParentesco = async (pessoaId: string) => {
    if (novoParente.parenteId) {
      await upsertParentesco.mutateAsync({
        values: {
          pessoa_id: pessoaId,
          parente_pessoa_id: novoParente.parenteId,
          tipo: novoParente.tipo || null,
          natureza: novoParente.natureza || null,
        },
        original: parentescoAtual,
        clienteId,
      });
    } else if (parentescoAtual) {
      await deleteParentesco.mutateAsync({ row: parentescoAtual, clienteId });
    }
  };

  const setField = <K extends keyof DraftPessoa>(field: K, value: DraftPessoa[K]) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!draft.denominacao.trim()) {
      toast.error(isPF ? 'Nome completo é obrigatório' : 'Razão social é obrigatória');
      return;
    }
    const cpfDigits = draft.cpf_cnpj.replace(/\D/g, '');
    if (cpfDigits && isPF && cpfDigits.length !== 11) {
      toast.error('CPF deve ter 11 dígitos');
      return;
    }
    if (cpfDigits && !isPF && cpfDigits.length !== 14) {
      toast.error('CNPJ deve ter 14 dígitos');
      return;
    }

    const nullify = (v: string) => (v.trim() ? v : null);

    const base = {
      cliente_id: clienteId,
      tipo_pessoa: draft.tipo_pessoa,
      denominacao: draft.denominacao.trim(),
      cpf_cnpj: nullify(draft.cpf_cnpj),
      endereco_cep: nullify(draft.endereco_cep),
      endereco_logradouro: nullify(draft.endereco_logradouro),
      endereco_numero: nullify(draft.endereco_numero),
      endereco_complemento: nullify(draft.endereco_complemento),
      endereco_bairro: nullify(draft.endereco_bairro),
      endereco_municipio: nullify(draft.endereco_municipio),
      endereco_uf: nullify(draft.endereco_uf),
    };

    const pfFields = isPF
      ? {
          genero: nullify(draft.genero),
          nacionalidade: nullify(draft.nacionalidade),
          naturalidade_municipio: nullify(draft.naturalidade_municipio),
          naturalidade_uf: nullify(draft.naturalidade_uf),
          estado_civil: nullify(draft.estado_civil),
          regime_bens: nullify(draft.regime_bens),
          data_nascimento: nullify(draft.data_nascimento),
          filiacao_pai: nullify(draft.filiacao_pai),
          filiacao_pai_pessoa_id: draft.filiacao_pai_pessoa_id || null,
          filiacao_mae: nullify(draft.filiacao_mae),
          filiacao_mae_pessoa_id: draft.filiacao_mae_pessoa_id || null,
          profissao: nullify(draft.profissao),
          documento_identidade_tipo: nullify(draft.documento_identidade_tipo),
          documento_identidade_numero: nullify(draft.documento_identidade_numero),
          documento_identidade_orgao: nullify(draft.documento_identidade_orgao),
          documento_identidade_uf: nullify(draft.documento_identidade_uf),
          conjuge_id: draft.conjuge_id || null,
          is_fundador: draft.is_fundador,
          nire: null,
          junta_comercial_uf: null,
          data_constituicao: null,
          objeto_social: null,
          status_constituicao: null,
          tipo_empresa: null,
        }
      : {
          genero: null,
          nacionalidade: null,
          naturalidade_municipio: null,
          naturalidade_uf: null,
          estado_civil: null,
          regime_bens: null,
          data_nascimento: null,
          filiacao_pai: null,
          filiacao_pai_pessoa_id: null,
          filiacao_mae: null,
          filiacao_mae_pessoa_id: null,
          profissao: null,
          documento_identidade_tipo: null,
          documento_identidade_numero: null,
          documento_identidade_orgao: null,
          documento_identidade_uf: null,
          conjuge_id: null,
          is_fundador: false,
          nire: nullify(draft.nire),
          junta_comercial_uf: nullify(draft.junta_comercial_uf),
          data_constituicao: nullify(draft.data_constituicao),
          objeto_social: nullify(draft.objeto_social),
          status_constituicao: nullify(draft.status_constituicao),
          tipo_empresa: draft.tipo_empresa || null,
        };

    upsert.mutate(
      { values: { ...base, ...pfFields }, original: pessoa },
      {
        onSuccess: async (result) => {
          if (isPF) await reconcileParentesco(result.row.id);
          onClose();
        },
      },
    );
  };

  // PFs do mesmo cliente, exceto a própria pessoa — usadas em cônjuge e filiação.
  const pessoaCandidates = pessoasCliente.filter(
    (p) => p.tipo_pessoa === 'PF' && p.id !== pessoa?.id,
  );
  const conjugeCandidates = pessoaCandidates;
  // No vínculo de parentesco só entram fundadores; mantém o parente já
  // vinculado na lista mesmo que tenha deixado de ser fundador.
  const parenteCandidates = pessoaCandidates.filter(
    (p) => p.is_fundador || p.id === novoParente.parenteId,
  );

  let secNo = 0;
  const nextNo = () => String(++secNo).padStart(2, '0');

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => !o && requestClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-visible p-0 sm:[clip-path:none]">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex min-h-0 flex-1 flex-col"
        >
        {/* Cabeçalho + abas fixos no topo enquanto o formulário rola */}
        <div className="shrink-0 rounded-t-lg bg-background px-6 pt-5">
          <DialogHeader className={`space-y-0 text-left ${mostrarTabsList ? 'mb-4' : ''}`}>
            <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
              {isEdit ? 'Editar pessoa' : 'Nova pessoa'}
              <span className="rounded-md bg-osg-50 px-2 py-0.5 text-xs font-semibold text-osg-700">
                {isPF ? 'Pessoa Física' : 'Pessoa Jurídica'}
              </span>
            </DialogTitle>
          </DialogHeader>
          {/* PF não tem vínculos de administração; só PJ ganha abas. O histórico
              não é aba — flutua à direita do modal. */}
          {mostrarTabsList && (
            <TabsList className={osgTabsListCls}>
              <TabsTrigger value="dados" className={osgTabTriggerCls}>
                Dados
              </TabsTrigger>
              {!isPF && (
                <TabsTrigger value="administracao" disabled={!isEdit} className={osgTabTriggerCls}>
                  Administração
                </TabsTrigger>
              )}
              <TabsTrigger value="documentos" disabled={!isEdit} className={osgTabTriggerCls}>
                Documentos
              </TabsTrigger>
            </TabsList>
          )}
        </div>

        {/* Área rolável */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <TabsContent value="dados" className="mt-0 focus-visible:ring-0">
        <div>
          <FieldSection number={nextNo()} title="Identificação">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className={labelCls}>
                  {isPF ? 'CPF' : 'CNPJ'}
                </Label>
                <Input
                  value={draft.cpf_cnpj}
                  onChange={(e) => setField('cpf_cnpj', formatCpfCnpj(e.target.value, draft.tipo_pessoa))}
                  placeholder={isPF ? '000.000.000-00' : '00.000.000/0000-00'}
                  className={`${fieldCls} font-mono`}
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <Label className={labelCls}>
                  {isPF ? 'Nome completo' : 'Razão social'}<RequiredMark />
                </Label>
                <Input
                  value={draft.denominacao}
                  onChange={(e) => setField('denominacao', e.target.value)}
                  className={fieldCls}
                />
              </div>
            </div>
          </FieldSection>

          <FieldSection number={nextNo()} title="Endereço">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className={labelCls}>CEP</Label>
                <Input
                  value={draft.endereco_cep}
                  onChange={(e) => setField('endereco_cep', formatCep(e.target.value))}
                  placeholder="00000-000"
                  className={`${fieldCls} font-mono`}
                />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label className={labelCls}>Logradouro</Label>
                <Input
                  value={draft.endereco_logradouro}
                  onChange={(e) => setField('endereco_logradouro', e.target.value)}
                  className={fieldCls}
                />
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>Número</Label>
                <Input
                  value={draft.endereco_numero}
                  onChange={(e) => setField('endereco_numero', e.target.value)}
                  className={fieldCls}
                />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label className={labelCls}>Complemento</Label>
                <Input
                  value={draft.endereco_complemento}
                  onChange={(e) => setField('endereco_complemento', e.target.value)}
                  className={fieldCls}
                />
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>Bairro</Label>
                <Input
                  value={draft.endereco_bairro}
                  onChange={(e) => setField('endereco_bairro', e.target.value)}
                  className={fieldCls}
                />
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>Município</Label>
                <Input
                  value={draft.endereco_municipio}
                  onChange={(e) => setField('endereco_municipio', e.target.value)}
                  className={fieldCls}
                />
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>UF</Label>
                <Select
                  value={draft.endereco_uf || undefined}
                  onValueChange={(v) => setField('endereco_uf', v)}
                >
                  <SelectTrigger className={fieldCls}><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {UF_STATES.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FieldSection>

          {isPF ? (
            <FieldSection number={nextNo()} title="Dados pessoais">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className={labelCls}>Gênero</Label>
                  <Select
                    value={draft.genero || undefined}
                    onValueChange={(v) => setField('genero', v)}
                  >
                    <SelectTrigger className={fieldCls}><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {GENERO_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className={labelCls}>Nacionalidade</Label>
                  <Input
                    value={draft.nacionalidade}
                    onChange={(e) => setField('nacionalidade', e.target.value)}
                    className={fieldCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className={labelCls}>Naturalidade (município)</Label>
                  <Input
                    value={draft.naturalidade_municipio}
                    onChange={(e) => setField('naturalidade_municipio', e.target.value)}
                    className={fieldCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className={labelCls}>Naturalidade (UF)</Label>
                  <Select
                    value={draft.naturalidade_uf || undefined}
                    onValueChange={(v) => setField('naturalidade_uf', v)}
                  >
                    <SelectTrigger className={fieldCls}><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {UF_STATES.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className={labelCls}>Data de nascimento</Label>
                  <Input
                    type="date"
                    value={draft.data_nascimento}
                    onChange={(e) => setField('data_nascimento', e.target.value)}
                    className={fieldCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className={labelCls}>Profissão</Label>
                  <Input
                    value={draft.profissao}
                    onChange={(e) => setField('profissao', e.target.value)}
                    className={fieldCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className={labelCls}>Estado civil</Label>
                  <Select
                    value={draft.estado_civil || undefined}
                    onValueChange={(v) => setField('estado_civil', v)}
                  >
                    <SelectTrigger className={fieldCls}><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {ESTADO_CIVIL_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {(draft.estado_civil === 'Casado(a)' || draft.estado_civil === 'União Estável') && (
                  <>
                    <div className="space-y-1.5">
                      <Label className={labelCls}>Regime de bens</Label>
                      <Select
                        value={draft.regime_bens || undefined}
                        onValueChange={(v) => setField('regime_bens', v)}
                      >
                        <SelectTrigger className={fieldCls}><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {REGIME_BENS_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="relative space-y-1.5">
                      <Label className={labelCls}>Cônjuge</Label>
                      {draft.conjuge_id && (
                        <button
                          type="button"
                          onClick={() => setField('conjuge_id', '')}
                          aria-label="Remover cônjuge"
                          className="absolute right-0 top-0 text-destructive hover:text-destructive/80"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <Select
                        value={draft.conjuge_id || undefined}
                        onValueChange={(v) => setField('conjuge_id', v)}
                      >
                        <SelectTrigger className={fieldCls}>
                          <SelectValue placeholder={conjugeCandidates.length ? 'Selecione...' : 'Nenhuma PF cadastrada'} />
                        </SelectTrigger>
                        <SelectContent>
                          {conjugeCandidates.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.denominacao}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className={labelCls}>Filiação (pai)</Label>
                    <FiliacaoCombobox
                      nome={draft.filiacao_pai}
                      pessoaId={draft.filiacao_pai_pessoa_id}
                      candidates={pessoaCandidates}
                      placeholder="Nome do pai"
                      onChange={(nome, id) =>
                        setDraft((prev) => ({ ...prev, filiacao_pai: nome, filiacao_pai_pessoa_id: id }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={labelCls}>Filiação (mãe)</Label>
                    <FiliacaoCombobox
                      nome={draft.filiacao_mae}
                      pessoaId={draft.filiacao_mae_pessoa_id}
                      candidates={pessoaCandidates}
                      placeholder="Nome da mãe"
                      onChange={(nome, id) =>
                        setDraft((prev) => ({ ...prev, filiacao_mae: nome, filiacao_mae_pessoa_id: id }))}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className={labelCls}>Tipo de documento</Label>
                  <Select
                    value={draft.documento_identidade_tipo || undefined}
                    onValueChange={(v) => setField('documento_identidade_tipo', v)}
                  >
                    <SelectTrigger className={fieldCls}><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {DOC_IDENTIDADE_TIPO_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className={labelCls}>Nº do documento</Label>
                  <Input
                    value={draft.documento_identidade_numero}
                    onChange={(e) => setField('documento_identidade_numero', e.target.value)}
                    className={fieldCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className={labelCls}>Órgão emissor</Label>
                  <Input
                    value={draft.documento_identidade_orgao}
                    onChange={(e) => setField('documento_identidade_orgao', e.target.value)}
                    className={fieldCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className={labelCls}>UF do documento</Label>
                  <Select
                    value={draft.documento_identidade_uf || undefined}
                    onValueChange={(v) => setField('documento_identidade_uf', v)}
                  >
                    <SelectTrigger className={fieldCls}><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {UF_STATES.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-3">
                  <label className={`${switchBoxCls} w-full cursor-pointer text-sm`}>
                    <Checkbox
                      checked={draft.is_fundador}
                      onCheckedChange={(c) => setField('is_fundador', c === true)}
                    />
                    Fundador (patriarca/matriarca do grupo)
                  </label>
                </div>
              </div>
            </FieldSection>
          ) : (
            <FieldSection number={nextNo()} title="Dados da PJ">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className={labelCls}>NIRE</Label>
                  <Input
                    value={draft.nire}
                    onChange={(e) => setField('nire', e.target.value)}
                    className={fieldCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className={labelCls}>UF da Junta Comercial</Label>
                  <Select
                    value={draft.junta_comercial_uf || undefined}
                    onValueChange={(v) => setField('junta_comercial_uf', v)}
                  >
                    <SelectTrigger className={fieldCls}><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {UF_STATES.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className={labelCls}>Data de constituição</Label>
                  <Input
                    type="date"
                    value={draft.data_constituicao}
                    onChange={(e) => setField('data_constituicao', e.target.value)}
                    className={fieldCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className={labelCls}>Status</Label>
                  <Select
                    value={draft.status_constituicao || undefined}
                    onValueChange={(v) => setField('status_constituicao', v)}
                  >
                    <SelectTrigger className={fieldCls}><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {STATUS_CONSTITUICAO_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className={labelCls}>Tipo Empresa</Label>
                  <Select
                    value={draft.tipo_empresa || undefined}
                    onValueChange={(v) => setField('tipo_empresa', v)}
                  >
                    <SelectTrigger className={fieldCls}><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {TIPO_EMPRESA_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-3 space-y-1.5">
                  <Label className={labelCls}>Objeto social</Label>
                  <Textarea
                    value={draft.objeto_social}
                    onChange={(e) => setField('objeto_social', e.target.value)}
                    className={`min-h-[80px] ${textareaCls}`}
                  />
                </div>
              </div>
            </FieldSection>
          )}

          {isPF && (
            <FieldSection number={nextNo()} title="Filiação">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                <div className="md:col-span-2 space-y-1.5">
                  <Label className={labelCls}>Parente</Label>
                  <Select
                    value={novoParente.parenteId || undefined}
                    onValueChange={(v) => setNovoParente((prev) => ({ ...prev, parenteId: v }))}
                  >
                    <SelectTrigger className={fieldCls}>
                      <SelectValue
                        placeholder={
                          parenteCandidates.length
                            ? 'Selecione...'
                            : 'Cadastre um fundador primeiro'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {parenteCandidates.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.denominacao}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className={labelCls}>Tipo</Label>
                  <Select
                    value={novoParente.tipo || undefined}
                    onValueChange={(v) => setNovoParente((prev) => ({ ...prev, tipo: v }))}
                  >
                    <SelectTrigger className={fieldCls}><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {TIPO_PARENTESCO_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className={labelCls}>Natureza</Label>
                  <Select
                    value={novoParente.natureza || undefined}
                    onValueChange={(v) => setNovoParente((prev) => ({ ...prev, natureza: v }))}
                  >
                    <SelectTrigger className={fieldCls}><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {NATUREZA_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </FieldSection>
          )}
        </div>
        </TabsContent>

        <TabsContent value="administracao" className="mt-0 focus-visible:ring-0">
          {!isPF && isEdit && pessoa && (
            <AdministracaoPanel pjPessoaId={pessoa.id} pessoasCliente={pessoasCliente} />
          )}
        </TabsContent>

        <TabsContent value="documentos" className="mt-0 focus-visible:ring-0">
          {isEdit && pessoa?.id && (
            <DocumentosTab clienteId={clienteId} vinculo={{ pessoaId: pessoa.id }} categoriaPadrao="pessoais" />
          )}
        </TabsContent>

        </div>

        {/* Footer fixo */}
        <DialogFooter className="shrink-0 rounded-b-lg border-t border-osg-100 bg-background px-6 py-3.5">
          <Button variant="outline" onClick={requestClose} disabled={upsert.isPending}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={upsert.isPending || upsertParentesco.isPending || deleteParentesco.isPending}
            className="gap-1.5 bg-osg-moss text-white hover:bg-osg-moss/90"
          >
            {(upsert.isPending || upsertParentesco.isPending || deleteParentesco.isPending) && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}
            {isEdit ? 'Salvar alterações' : 'Cadastrar pessoa'}
          </Button>
        </DialogFooter>
        </Tabs>

        {/* Histórico flutuante à direita do modal (fora da caixa, dentro do diálogo). */}
        {mostrarHistorico && (
          <HistoricoFlutuante
            entityIds={[pessoa?.id, parentescoAtual?.id].filter(Boolean) as string[]}
          />
        )}
      </DialogContent>
    </Dialog>
    <UnsavedChangesAlert {...alertProps} />
    </>
  );
}

// =============================================================================
// Administração (PJ): vínculos PF → administrador da empresa. CRUD imediato
// (cada linha salva na hora), independente do botão "Salvar" da pessoa.
// =============================================================================

interface AdministracaoPanelProps {
  pjPessoaId: string;
  pessoasCliente: PessoaRow[];
}

function AdministracaoPanel({ pjPessoaId, pessoasCliente }: AdministracaoPanelProps) {
  const { data: administradores = [], isLoading } = useAdministracaoByPj(pjPessoaId);
  const upsert = useUpsertAdministracao();
  const deleteMutation = useDeleteAdministracao();

  const emptyAdmin = () => ({
    administradorId: '',
    cargo: '',
    podeIsoladamente: false,
    dataInicio: '',
    dataFim: '',
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [adminDraft, setAdminDraft] = useState(emptyAdmin);

  // Só PFs do cliente podem administrar; mantém na lista um administrador já
  // vinculado mesmo que a pessoa tenha mudado de tipo.
  const candidates = pessoasCliente.filter(
    (p) => p.tipo_pessoa === 'PF' || p.id === adminDraft.administradorId,
  );

  const startAdd = () => {
    setEditingId(null);
    setAdminDraft(emptyAdmin());
    setAdding(true);
  };

  const startEdit = (a: AdministracaoEnriched) => {
    setAdding(false);
    setEditingId(a.id);
    setAdminDraft({
      administradorId: a.administrador_pessoa_id,
      cargo: a.cargo ?? '',
      podeIsoladamente: a.pode_isoladamente ?? false,
      dataInicio: a.data_inicio ?? '',
      dataFim: a.data_fim ?? '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAdding(false);
    setAdminDraft(emptyAdmin());
  };

  const handleSave = () => {
    if (!adminDraft.administradorId) {
      toast.error('Selecione o administrador');
      return;
    }
    if (adminDraft.dataInicio && adminDraft.dataFim && adminDraft.dataFim < adminDraft.dataInicio) {
      toast.error('Data fim deve ser igual ou posterior à data início');
      return;
    }

    const original = editingId ? (administradores.find((a) => a.id === editingId) ?? null) : null;
    const entityName =
      pessoasCliente.find((p) => p.id === adminDraft.administradorId)?.denominacao ?? 'administrador';

    upsert.mutate(
      {
        values: {
          pj_pessoa_id: pjPessoaId,
          administrador_pessoa_id: adminDraft.administradorId,
          cargo: adminDraft.cargo.trim() || null,
          pode_isoladamente: adminDraft.podeIsoladamente,
          data_inicio: adminDraft.dataInicio || null,
          data_fim: adminDraft.dataFim || null,
        },
        original,
        entityName,
      },
      { onSuccess: cancelEdit },
    );
  };

  const formOpen = adding || editingId != null;

  return (
    <FieldSection
      number="01"
      title="Administradores"
      hint={
        !isLoading && administradores.length > 0 ? `${administradores.length} vínculo(s)` : undefined
      }
    >
      <div className="space-y-2.5">
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-2">Carregando...</p>
        ) : administradores.length === 0 && !formOpen ? (
          <p className="text-sm text-muted-foreground py-2">
            Nenhum administrador vinculado a esta empresa.
          </p>
        ) : administradores.length > 0 ? (
          <div className="space-y-1.5">
            {administradores.map((a) => (
              <AdministradorRowItem
                key={a.id}
                administracao={a}
                isEditing={editingId === a.id}
                onEdit={() => startEdit(a)}
                onDelete={() =>
                  deleteMutation.mutate({ row: a, entityName: a.administrador_denominacao })}
              />
            ))}
          </div>
        ) : null}

        {formOpen ? (
          <div className={`${subFormBoxCls} space-y-3`}>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-osg-700">
              {editingId ? 'Editar administrador' : 'Novo administrador'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className={labelCls}>
                  Administrador
                  <RequiredMark />
                </Label>
                <Select
                  value={adminDraft.administradorId || undefined}
                  onValueChange={(v) => setAdminDraft((p) => ({ ...p, administradorId: v }))}
                >
                  <SelectTrigger className={fieldCls}>
                    <SelectValue
                      placeholder={candidates.length ? 'Selecione...' : 'Nenhuma PF cadastrada'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.denominacao}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>Cargo</Label>
                <Select
                  value={adminDraft.cargo || undefined}
                  onValueChange={(v) => setAdminDraft((p) => ({ ...p, cargo: v }))}
                >
                  <SelectTrigger className={fieldCls}><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {CARGO_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>Data início</Label>
                <Input
                  type="date"
                  value={adminDraft.dataInicio}
                  onChange={(e) => setAdminDraft((p) => ({ ...p, dataInicio: e.target.value }))}
                  className={fieldCls}
                />
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>Data fim</Label>
                <Input
                  type="date"
                  value={adminDraft.dataFim}
                  onChange={(e) => setAdminDraft((p) => ({ ...p, dataFim: e.target.value }))}
                  className={fieldCls}
                />
              </div>
              <div className="md:col-span-2">
                <label className={`${switchBoxCls} w-full cursor-pointer text-sm`}>
                  <Checkbox
                    checked={adminDraft.podeIsoladamente}
                    onCheckedChange={(c) =>
                      setAdminDraft((p) => ({ ...p, podeIsoladamente: c === true }))}
                  />
                  Pode assinar isoladamente
                </label>
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
                {upsert.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
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
            Adicionar administrador
          </Button>
        )}
      </div>
    </FieldSection>
  );
}

interface AdministradorRowItemProps {
  administracao: AdministracaoEnriched;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function AdministradorRowItem({ administracao, isEditing, onEdit, onDelete }: AdministradorRowItemProps) {
  const formatData = (d: string) => {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };
  const hoje = new Date().toISOString().slice(0, 10);
  const vigente = !administracao.data_fim || administracao.data_fim >= hoje;

  return (
    <div
      className={`rounded-md border px-3 py-2 ${isEditing ? 'bg-osg-50 border-osg-200' : 'bg-muted/30'} ${!vigente ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{administracao.administrador_denominacao}</span>
            {administracao.cargo && (
              <Badge variant="outline" className="text-[10px]">{administracao.cargo}</Badge>
            )}
            {administracao.pode_isoladamente && (
              <Badge variant="default" className="text-[10px]">Assina isoladamente</Badge>
            )}
            <Badge variant={vigente ? 'default' : 'outline'} className="text-[10px]">
              {vigente ? 'Vigente' : 'Encerrada'}
            </Badge>
          </div>
          {(administracao.data_inicio || administracao.data_fim) && (
            <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
              {administracao.data_inicio && <span>Início: {formatData(administracao.data_inicio)}</span>}
              {administracao.data_fim && <span>Fim: {formatData(administracao.data_fim)}</span>}
            </div>
          )}
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
                <AlertDialogTitle>Remover administrador?</AlertDialogTitle>
                <AlertDialogDescription>
                  Remover o vínculo de {administracao.administrador_denominacao} como
                  administrador(a) desta empresa.
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
