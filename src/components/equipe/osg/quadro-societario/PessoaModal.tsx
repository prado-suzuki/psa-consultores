import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { RequiredMark } from '@/components/ui/required-mark';
import { toast } from 'sonner';
import { Loader2, Plus, X } from 'lucide-react';
import { formatCpfCnpj, formatCep, UF_STATES } from '@/components/equipe/client-form/constants';
import type { PessoaRow, TipoPessoa } from '@/hooks/useQuadroSocietario';
import {
  useDeleteParentesco,
  useParentescosByCliente,
  useUpsertParentesco,
  useUpsertPessoa,
} from '@/hooks/useQuadroSocietario';
import { Badge } from '@/components/ui/badge';

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
  'Cônjuge', 'Filho(a)', 'Pai/Mãe', 'Irmão(ã)', 'Avô(ó)', 'Neto(a)',
  'Tio(a)', 'Sobrinho(a)', 'Primo(a)', 'Sogro(a)', 'Genro/Nora', 'Cunhado(a)',
  'Padrasto/Madrasta', 'Enteado(a)', 'Outro',
];

const NATUREZA_OPTIONS = ['Consanguíneo', 'Afim', 'Adotivo', 'Civil'];

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
  nacionalidade: string;
  estado_civil: string;
  regime_bens: string;
  data_nascimento: string;
  filiacao_pai: string;
  filiacao_mae: string;
  profissao: string;
  rg_numero: string;
  rg_orgao_emissor: string;
  rg_uf: string;
  conjuge_id: string;
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
  nacionalidade: '',
  estado_civil: '',
  regime_bens: '',
  data_nascimento: '',
  filiacao_pai: '',
  filiacao_mae: '',
  profissao: '',
  rg_numero: '',
  rg_orgao_emissor: '',
  rg_uf: '',
  conjuge_id: '',
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
  nacionalidade: p.nacionalidade ?? '',
  estado_civil: p.estado_civil ?? '',
  regime_bens: p.regime_bens ?? '',
  data_nascimento: p.data_nascimento ?? '',
  filiacao_pai: p.filiacao_pai ?? '',
  filiacao_mae: p.filiacao_mae ?? '',
  profissao: p.profissao ?? '',
  rg_numero: p.rg_numero ?? '',
  rg_orgao_emissor: p.rg_orgao_emissor ?? '',
  rg_uf: p.rg_uf ?? '',
  conjuge_id: p.conjuge_id ?? '',
  nire: p.nire ?? '',
  junta_comercial_uf: p.junta_comercial_uf ?? '',
  data_constituicao: p.data_constituicao ?? '',
  objeto_social: p.objeto_social ?? '',
  status_constituicao: p.status_constituicao ?? '',
});

export function PessoaModal({ open, clienteId, pessoa, pessoasCliente, defaultTipo, onClose }: PessoaModalProps) {
  const [draft, setDraft] = useState<DraftPessoa>(emptyDraft);
  const upsert = useUpsertPessoa();
  const upsertParentesco = useUpsertParentesco();
  const deleteParentesco = useDeleteParentesco();
  const { data: parentescosCliente = [] } = useParentescosByCliente(open ? clienteId : null);

  const [novoParente, setNovoParente] = useState<{ parenteId: string; tipo: string; natureza: string }>({
    parenteId: '', tipo: '', natureza: '',
  });

  useEffect(() => {
    if (!open) return;
    setDraft(
      pessoa
        ? fromPessoa(pessoa)
        : { ...emptyDraft(), tipo_pessoa: defaultTipo ?? 'PF' },
    );
    setNovoParente({ parenteId: '', tipo: '', natureza: '' });
  }, [open, pessoa, defaultTipo]);

  const isPF = draft.tipo_pessoa === 'PF';
  const isEdit = !!pessoa?.id;

  const parentescosDaPessoa = pessoa?.id
    ? parentescosCliente.filter(
        (v) => v.pessoa_id === pessoa.id || v.parente_pessoa_id === pessoa.id,
      )
    : [];

  const handleAddParentesco = () => {
    if (!pessoa?.id) return;
    if (!novoParente.parenteId) {
      toast.error('Selecione o parente');
      return;
    }
    upsertParentesco.mutate(
      {
        values: {
          pessoa_id: pessoa.id,
          parente_pessoa_id: novoParente.parenteId,
          tipo: novoParente.tipo || null,
          natureza: novoParente.natureza || null,
        },
        original: null,
        clienteId,
      },
      {
        onSuccess: () => setNovoParente({ parenteId: '', tipo: '', natureza: '' }),
      },
    );
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
          nacionalidade: nullify(draft.nacionalidade),
          estado_civil: nullify(draft.estado_civil),
          regime_bens: nullify(draft.regime_bens),
          data_nascimento: nullify(draft.data_nascimento),
          filiacao_pai: nullify(draft.filiacao_pai),
          filiacao_mae: nullify(draft.filiacao_mae),
          profissao: nullify(draft.profissao),
          rg_numero: nullify(draft.rg_numero),
          rg_orgao_emissor: nullify(draft.rg_orgao_emissor),
          rg_uf: nullify(draft.rg_uf),
          conjuge_id: draft.conjuge_id || null,
          nire: null,
          junta_comercial_uf: null,
          data_constituicao: null,
          objeto_social: null,
          status_constituicao: null,
        }
      : {
          nacionalidade: null,
          estado_civil: null,
          regime_bens: null,
          data_nascimento: null,
          filiacao_pai: null,
          filiacao_mae: null,
          profissao: null,
          rg_numero: null,
          rg_orgao_emissor: null,
          rg_uf: null,
          conjuge_id: null,
          nire: nullify(draft.nire),
          junta_comercial_uf: nullify(draft.junta_comercial_uf),
          data_constituicao: nullify(draft.data_constituicao),
          objeto_social: nullify(draft.objeto_social),
          status_constituicao: nullify(draft.status_constituicao),
        };

    upsert.mutate(
      { values: { ...base, ...pfFields }, original: pessoa },
      { onSuccess: () => onClose() },
    );
  };

  const conjugeCandidates = pessoasCliente.filter(
    (p) => p.tipo_pessoa === 'PF' && p.id !== pessoa?.id,
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar pessoa' : 'Nova pessoa'} — Quadro Societário
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Tipo de pessoa<RequiredMark />
              </Label>
              <Select
                value={draft.tipo_pessoa}
                onValueChange={(v: TipoPessoa) => {
                  setDraft((prev) => ({ ...prev, tipo_pessoa: v, cpf_cnpj: '' }));
                }}
              >
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PF">Pessoa Física</SelectItem>
                  <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                {isPF ? 'CPF' : 'CNPJ'}
              </Label>
              <Input
                value={draft.cpf_cnpj}
                onChange={(e) => setField('cpf_cnpj', formatCpfCnpj(e.target.value, draft.tipo_pessoa))}
                placeholder={isPF ? '000.000.000-00' : '00.000.000/0000-00'}
                className="font-mono h-9"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                {isPF ? 'Nome completo' : 'Razão social'}<RequiredMark />
              </Label>
              <Input
                value={draft.denominacao}
                onChange={(e) => setField('denominacao', e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Endereço</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">CEP</Label>
                <Input
                  value={draft.endereco_cep}
                  onChange={(e) => setField('endereco_cep', formatCep(e.target.value))}
                  placeholder="00000-000"
                  className="font-mono h-9"
                />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Logradouro</Label>
                <Input
                  value={draft.endereco_logradouro}
                  onChange={(e) => setField('endereco_logradouro', e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Número</Label>
                <Input
                  value={draft.endereco_numero}
                  onChange={(e) => setField('endereco_numero', e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Complemento</Label>
                <Input
                  value={draft.endereco_complemento}
                  onChange={(e) => setField('endereco_complemento', e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Bairro</Label>
                <Input
                  value={draft.endereco_bairro}
                  onChange={(e) => setField('endereco_bairro', e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Município</Label>
                <Input
                  value={draft.endereco_municipio}
                  onChange={(e) => setField('endereco_municipio', e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">UF</Label>
                <Select
                  value={draft.endereco_uf || undefined}
                  onValueChange={(v) => setField('endereco_uf', v)}
                >
                  <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {UF_STATES.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {isPF ? (
            <div>
              <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Dados pessoais</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Nacionalidade</Label>
                  <Input
                    value={draft.nacionalidade}
                    onChange={(e) => setField('nacionalidade', e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Data de nascimento</Label>
                  <Input
                    type="date"
                    value={draft.data_nascimento}
                    onChange={(e) => setField('data_nascimento', e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Profissão</Label>
                  <Input
                    value={draft.profissao}
                    onChange={(e) => setField('profissao', e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Estado civil</Label>
                  <Select
                    value={draft.estado_civil || undefined}
                    onValueChange={(v) => setField('estado_civil', v)}
                  >
                    <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {ESTADO_CIVIL_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {(draft.estado_civil === 'Casado(a)' || draft.estado_civil === 'União Estável') && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Regime de bens</Label>
                      <Select
                        value={draft.regime_bens || undefined}
                        onValueChange={(v) => setField('regime_bens', v)}
                      >
                        <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {REGIME_BENS_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Cônjuge</Label>
                      <Select
                        value={draft.conjuge_id || undefined}
                        onValueChange={(v) => setField('conjuge_id', v)}
                      >
                        <SelectTrigger className="h-9">
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
                    <Label className="text-xs font-semibold text-muted-foreground">Filiação (pai)</Label>
                    <Input
                      value={draft.filiacao_pai}
                      onChange={(e) => setField('filiacao_pai', e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Filiação (mãe)</Label>
                    <Input
                      value={draft.filiacao_mae}
                      onChange={(e) => setField('filiacao_mae', e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">RG</Label>
                  <Input
                    value={draft.rg_numero}
                    onChange={(e) => setField('rg_numero', e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Órgão emissor</Label>
                  <Input
                    value={draft.rg_orgao_emissor}
                    onChange={(e) => setField('rg_orgao_emissor', e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">UF do RG</Label>
                  <Select
                    value={draft.rg_uf || undefined}
                    onValueChange={(v) => setField('rg_uf', v)}
                  >
                    <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {UF_STATES.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Dados da PJ</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">NIRE</Label>
                  <Input
                    value={draft.nire}
                    onChange={(e) => setField('nire', e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">UF da Junta Comercial</Label>
                  <Select
                    value={draft.junta_comercial_uf || undefined}
                    onValueChange={(v) => setField('junta_comercial_uf', v)}
                  >
                    <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {UF_STATES.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Data de constituição</Label>
                  <Input
                    type="date"
                    value={draft.data_constituicao}
                    onChange={(e) => setField('data_constituicao', e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Status</Label>
                  <Select
                    value={draft.status_constituicao || undefined}
                    onValueChange={(v) => setField('status_constituicao', v)}
                  >
                    <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {STATUS_CONSTITUICAO_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-3 space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Objeto social</Label>
                  <textarea
                    value={draft.objeto_social}
                    onChange={(e) => setField('objeto_social', e.target.value)}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          )}

          <Separator />

          <div>
            <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Filiação / Parentes</h4>

            {!isEdit ? (
              <p className="text-xs text-muted-foreground italic">
                Salve a pessoa para cadastrar vínculos de parentesco.
              </p>
            ) : (
              <div className="space-y-3">
                {parentescosDaPessoa.length > 0 && (
                  <div className="space-y-1.5">
                    {parentescosDaPessoa.map((v) => {
                      const isOrigem = v.pessoa_id === pessoa?.id;
                      const outroNome = isOrigem ? v.parente_denominacao : v.pessoa_denominacao;
                      return (
                        <div
                          key={v.id}
                          className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{outroNome}</div>
                            <div className="flex gap-1.5 mt-0.5">
                              {v.tipo && <Badge variant="outline" className="text-[10px]">{v.tipo}</Badge>}
                              {v.natureza && <Badge variant="secondary" className="text-[10px]">{v.natureza}</Badge>}
                              {!isOrigem && (
                                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                  vínculo recíproco
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            onClick={() => deleteParentesco.mutate({ row: v, clienteId })}
                            disabled={deleteParentesco.isPending}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="rounded-md border border-dashed p-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                    <div className="md:col-span-2 space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Parente</Label>
                      <Select
                        value={novoParente.parenteId || undefined}
                        onValueChange={(v) => setNovoParente((prev) => ({ ...prev, parenteId: v }))}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue
                            placeholder={
                              pessoasCliente.filter((p) => p.id !== pessoa?.id).length
                                ? 'Selecione...'
                                : 'Cadastre outra pessoa primeiro'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {pessoasCliente
                            .filter((p) => p.id !== pessoa?.id)
                            .map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.denominacao}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Tipo</Label>
                      <Select
                        value={novoParente.tipo || undefined}
                        onValueChange={(v) => setNovoParente((prev) => ({ ...prev, tipo: v }))}
                      >
                        <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {TIPO_PARENTESCO_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Natureza</Label>
                      <Select
                        value={novoParente.natureza || undefined}
                        onValueChange={(v) => setNovoParente((prev) => ({ ...prev, natureza: v }))}
                      >
                        <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {NATUREZA_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end mt-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={handleAddParentesco}
                      disabled={upsertParentesco.isPending || !novoParente.parenteId}
                    >
                      {upsertParentesco.isPending
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Plus className="h-3.5 w-3.5" />}
                      Adicionar parente
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={upsert.isPending}>Cancelar</Button>
          <Button onClick={handleSave} disabled={upsert.isPending} className="gap-1.5">
            {upsert.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEdit ? 'Salvar alterações' : 'Cadastrar pessoa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
