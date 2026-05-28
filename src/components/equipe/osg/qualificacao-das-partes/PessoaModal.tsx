import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/equipe/osg/OsgDialog';
import { useDirtyClose } from '@/components/equipe/osg/useDirtyClose';
import { UnsavedChangesAlert } from '@/components/equipe/osg/UnsavedChangesAlert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RequiredMark } from '@/components/ui/required-mark';
import { toast } from 'sonner';
import { Check, Loader2, X } from 'lucide-react';
import { formatCpfCnpj, formatCep, UF_STATES } from '@/components/equipe/client-form/constants';
import {
  fieldCls, textareaCls, switchBoxCls, labelCls, FieldSection,
} from '@/components/equipe/osg/formKit';
import type { PessoaRow, TipoPessoa } from '@/hooks/useQualificacaoDasPartes';
import {
  useDeleteParentesco,
  useParentescosByCliente,
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

const TIPO_PARENTESCO_OPTIONS = [
  'Filho(a)', 'Pai/Mãe', 'Irmão(ã)', 'Avô(ó)', 'Neto(a)',
  'Tio(a)', 'Sobrinho(a)', 'Primo(a)', 'Sogro(a)', 'Genro/Nora', 'Cunhado(a)',
  'Padrasto/Madrasta', 'Enteado(a)', 'Outro',
];

const NATUREZA_OPTIONS = ['Consanguíneo', 'Afim', 'Adotivo', 'Civil'];

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
  }, [open, pessoa, defaultTipo]);

  const isPF = draft.tipo_pessoa === 'PF';
  const isEdit = !!pessoa?.id;

  // Vínculo de parentesco é 1:1: cada pessoa tem no máximo um, que ela "possui"
  // (pessoa_id = a própria). É salvo junto com a pessoa, sem botão dedicado.
  const parentescoAtual = pessoa?.id
    ? parentescosCliente.find((v) => v.pessoa_id === pessoa.id) ?? null
    : null;

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

  let secNo = 0;
  const nextNo = () => String(++secNo).padStart(2, '0');

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => !o && requestClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
            {isEdit ? 'Editar pessoa' : 'Nova pessoa'}
            <span className="rounded-md bg-osg-50 px-2 py-0.5 text-xs font-semibold text-osg-700">
              {isPF ? 'Pessoa Física' : 'Pessoa Jurídica'}
            </span>
          </DialogTitle>
        </DialogHeader>

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
                          className="absolute right-0 top-0 text-red-600 hover:text-red-700"
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
                          pessoaCandidates.length
                            ? 'Selecione...'
                            : 'Cadastre outra pessoa primeiro'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {pessoaCandidates.map((p) => (
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

        <DialogFooter className="mt-6 border-t border-osg-100 pt-4">
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
      </DialogContent>
    </Dialog>
    <UnsavedChangesAlert {...alertProps} />
    </>
  );
}
