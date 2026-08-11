import { X } from 'lucide-react';
import { toast } from 'sonner';
import { formatCep, formatCpfCnpj, UF_STATES } from '@/components/equipe/client-form/constants';
import { FieldSection, fieldCls, labelCls, switchBoxCls, textareaCls } from '@/components/equipe/osg/formKit';
import { formGridCls, formSpanCls } from '@/lib/osgFormGrid';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RequiredMark } from '@/components/ui/required-mark';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import { ehEstadoCivilComConjuge, type PessoaDraft } from '@/lib/pessoaModalModel';
import { FiliacaoCombobox } from '@/components/equipe/osg/qualificacao-das-partes/pessoa/FiliacaoCombobox';
import { FiliacaoDerivada } from '@/components/equipe/osg/qualificacao-das-partes/pessoa/FiliacaoDerivada';
import { ParentescoPanel } from '@/components/equipe/osg/qualificacao-das-partes/pessoa/ParentescoPanel';
import { NATUREZAS_PARENTESCO, TIPOS_PARENTESCO } from '@/components/equipe/osg/qualificacao-das-partes/pessoa/parentescoOpcoes';
import { conjugesDisponiveis, conjugesOcultosPorVinculo } from '@/components/equipe/osg/qualificacao-das-partes/pessoa/vinculoConjugal';

const ESTADOS_CIVIS = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável'];
const REGIMES_BENS = ['Comunhão Parcial', 'Comunhão Universal', 'Separação Total', 'Separação Obrigatória', 'Participação Final nos Aquestos'];
const STATUS_CONSTITUICAO = ['Ativa', 'Suspensa', 'Inapta', 'Baixada', 'Em constituição'];
const TIPOS_EMPRESA = [{ value: 'PR', label: 'Proprietária' }, { value: 'CN', label: 'Controladora' }, { value: 'SC', label: 'Sócia' }];
const GENEROS = [{ value: 'M', label: 'Masculino' }, { value: 'F', label: 'Feminino' }];
const DOCUMENTOS = [{ value: 'rg', label: 'RG' }, { value: 'cnh', label: 'CNH' }, { value: 'reservista', label: 'Reservista' }, { value: 'ctps', label: 'CTPS' }];

export type ParentescoDraft = { parenteId: string; tipo: string; natureza: string };

interface PessoaDadosTabProps {
  draft: PessoaDraft;
  setDraft: React.Dispatch<React.SetStateAction<PessoaDraft>>;
  pessoaCandidates: PessoaRow[];
  parenteCandidates: PessoaRow[];
  parentesco: ParentescoDraft;
  setParentesco: React.Dispatch<React.SetStateAction<ParentescoDraft>>;
  /**
   * Presente só quando a pessoa já existe no banco. Troca o vínculo único do
   * rascunho pela lista de parentesco (que grava na hora, como Administradores)
   * e permite reconhecer o cônjuge que aponta de volta para esta pessoa.
   * Cadastro novo ainda não tem id, então segue com o vínculo único.
   */
  pessoaSalva?: { pessoaId: string; clienteId: string };
}

export function PessoaDadosTab(props: PessoaDadosTabProps) {
  const { draft, setDraft, pessoaCandidates, parenteCandidates, parentesco, setParentesco, pessoaSalva } = props;
  const isPF = draft.tipo_pessoa === 'PF';
  const setField = <K extends keyof PessoaDraft>(field: K, value: PessoaDraft[K]) => setDraft((old) => ({ ...old, [field]: value }));
  let section = 0;
  const next = () => String(++section).padStart(2, '0');

  return (
    <div>
      <FieldSection number={next()} title="Identificação">
        <div className={`${formGridCls(2)} gap-3`}>
          <TextField label={isPF ? 'CPF' : 'CNPJ'} value={draft.cpf_cnpj} onChange={(value) => setField('cpf_cnpj', formatCpfCnpj(value, draft.tipo_pessoa))} placeholder={isPF ? '000.000.000-00' : '00.000.000/0000-00'} mono />
          <div className={`space-y-1.5 ${formSpanCls(2)}`}><Label className={labelCls}>{isPF ? 'Nome completo' : 'Razão social'}<RequiredMark /></Label><Input value={draft.denominacao} onChange={(event) => setField('denominacao', event.target.value)} className={fieldCls} /></div>
        </div>
      </FieldSection>
      <FieldSection number={next()} title="Endereço">
        <div className={`${formGridCls(3)} gap-3`}>
          <TextField label="CEP" value={draft.endereco_cep} onChange={(value) => setField('endereco_cep', formatCep(value))} placeholder="00000-000" mono />
          <div className={formSpanCls(2)}><TextField label="Logradouro" value={draft.endereco_logradouro} onChange={(value) => setField('endereco_logradouro', value)} /></div>
          <TextField label="Número" value={draft.endereco_numero} onChange={(value) => setField('endereco_numero', value)} />
          <div className={formSpanCls(2)}><TextField label="Complemento" value={draft.endereco_complemento} onChange={(value) => setField('endereco_complemento', value)} /></div>
          <TextField label="Bairro" value={draft.endereco_bairro} onChange={(value) => setField('endereco_bairro', value)} />
          <TextField label="Município" value={draft.endereco_municipio} onChange={(value) => setField('endereco_municipio', value)} />
          <SelectField label="UF" value={draft.endereco_uf} onChange={(value) => setField('endereco_uf', value)} options={UF_STATES} />
        </div>
      </FieldSection>
      {isPF ? (
        <PfFields draft={draft} setDraft={setDraft} candidates={pessoaCandidates} pessoaSalva={pessoaSalva} number={next()} />
      ) : (
        <PjFields draft={draft} setDraft={setDraft} number={next()} />
      )}
      {isPF && (pessoaSalva
        ? <ParentescoPanel pessoaId={pessoaSalva.pessoaId} clienteId={pessoaSalva.clienteId} candidates={pessoaCandidates} number={next()} />
        : <ParentescoFields value={parentesco} onChange={setParentesco} candidates={parenteCandidates} number={next()} />)}
    </div>
  );
}

function PfFields({ draft, setDraft, candidates, pessoaSalva, number }: { draft: PessoaDraft; setDraft: React.Dispatch<React.SetStateAction<PessoaDraft>>; candidates: PessoaRow[]; pessoaSalva?: { pessoaId: string; clienteId: string }; number: string }) {
  const setField = <K extends keyof PessoaDraft>(field: K, value: PessoaDraft[K]) => setDraft((old) => ({ ...old, [field]: value }));
  const married = ehEstadoCivilComConjuge(draft.estado_civil);
  const contextoConjuge = { pessoaId: pessoaSalva?.pessoaId, selecionadoId: draft.conjuge_id || undefined };
  const conjugeCandidates = conjugesDisponiveis(candidates, contextoConjuge);
  const conjugesOcultos = conjugesOcultosPorVinculo(candidates, contextoConjuge);
  // Sair do estado civil que admite cônjuge desfaz o vínculo, e o vínculo é
  // recíproco: some do cadastro do parceiro também. Deixar o ponteiro pendurado
  // marcaria os dois como casados sem nenhum campo na tela para desfazer, então
  // o certo é limpar aqui e dizer, com nome e sobrenome, o que isso derrubou.
  const trocarEstadoCivil = (valor: string) => {
    if (!ehEstadoCivilComConjuge(valor) && draft.conjuge_id) {
      const conjuge = candidates.find((candidate) => candidate.id === draft.conjuge_id);
      toast.warning(`Vínculo de cônjuge com ${conjuge?.denominacao ?? 'a pessoa vinculada'} será desfeito nos dois cadastros ao salvar.`);
      setDraft((old) => ({ ...old, estado_civil: valor, conjuge_id: '' }));
      return;
    }
    setField('estado_civil', valor);
  };
  return (
    <FieldSection number={number} title="Dados pessoais">
      <div className={`${formGridCls(3)} gap-3`}>
        <SelectField label="Gênero" value={draft.genero} onChange={(value) => setField('genero', value)} options={GENEROS} />
        <TextField label="Nacionalidade" value={draft.nacionalidade} onChange={(value) => setField('nacionalidade', value)} />
        <TextField label="Naturalidade (município)" value={draft.naturalidade_municipio} onChange={(value) => setField('naturalidade_municipio', value)} />
        <SelectField label="Naturalidade (UF)" value={draft.naturalidade_uf} onChange={(value) => setField('naturalidade_uf', value)} options={UF_STATES} />
        <TextField type="date" label="Data de nascimento" value={draft.data_nascimento} onChange={(value) => setField('data_nascimento', value)} />
        <TextField label="Profissão" value={draft.profissao} onChange={(value) => setField('profissao', value)} />
        <SelectField label="Estado civil" value={draft.estado_civil} onChange={trocarEstadoCivil} options={ESTADOS_CIVIS} />
        {married && <SelectField label="Regime de bens" value={draft.regime_bens} onChange={(value) => setField('regime_bens', value)} options={REGIMES_BENS} />}
        {married && (
          <div className="relative space-y-1.5">
            <Label className={labelCls}>Cônjuge</Label>
            {draft.conjuge_id && <button type="button" onClick={() => setField('conjuge_id', '')} aria-label="Remover cônjuge" className="absolute right-0 top-0 text-destructive hover:text-destructive/80"><X className="h-3.5 w-3.5" /></button>}
            <Select value={draft.conjuge_id || undefined} onValueChange={(value) => setField('conjuge_id', value)}><SelectTrigger className={fieldCls}><SelectValue placeholder={conjugeCandidates.length ? 'Selecione...' : 'Nenhuma PF disponível'} /></SelectTrigger><SelectContent>{conjugeCandidates.map((candidate) => <SelectItem key={candidate.id} value={candidate.id}>{candidate.denominacao}</SelectItem>)}</SelectContent></Select>
            {conjugesOcultos > 0 && <p className="text-[11px] text-muted-foreground">{conjugesOcultos} pessoa(s) não aparecem por já terem cônjuge cadastrado. O vínculo é recíproco: gravar aqui grava do outro lado.</p>}
          </div>
        )}
        {pessoaSalva ? (
          <FiliacaoDerivada pessoaId={pessoaSalva.pessoaId} clienteId={pessoaSalva.clienteId} draft={draft} setDraft={setDraft} />
        ) : (
          // Cadastro novo ainda não tem lista de vínculos: aqui o texto (com a
          // sugestão de PF já cadastrada) é a única origem que existe.
          <div className={`${formGridCls(2)} gap-3 ${formSpanCls(3)}`}>
            <div className="space-y-1.5"><Label className={labelCls}>Filiação (pai)</Label><FiliacaoCombobox nome={draft.filiacao_pai} pessoaId={draft.filiacao_pai_pessoa_id} candidates={candidates} placeholder="Nome do pai" onChange={(nome, id) => setDraft((old) => ({ ...old, filiacao_pai: nome, filiacao_pai_pessoa_id: id }))} /></div>
            <div className="space-y-1.5"><Label className={labelCls}>Filiação (mãe)</Label><FiliacaoCombobox nome={draft.filiacao_mae} pessoaId={draft.filiacao_mae_pessoa_id} candidates={candidates} placeholder="Nome da mãe" onChange={(nome, id) => setDraft((old) => ({ ...old, filiacao_mae: nome, filiacao_mae_pessoa_id: id }))} /></div>
          </div>
        )}
        <SelectField label="Tipo de documento" value={draft.documento_identidade_tipo} onChange={(value) => setField('documento_identidade_tipo', value)} options={DOCUMENTOS} />
        <TextField label="Nº do documento" value={draft.documento_identidade_numero} onChange={(value) => setField('documento_identidade_numero', value)} />
        <TextField label="Órgão emissor" value={draft.documento_identidade_orgao} onChange={(value) => setField('documento_identidade_orgao', value)} />
        <SelectField label="UF do documento" value={draft.documento_identidade_uf} onChange={(value) => setField('documento_identidade_uf', value)} options={UF_STATES} />
        <div className={formSpanCls(3)}><label className={`${switchBoxCls} w-full cursor-pointer text-sm`}><Checkbox checked={draft.is_fundador} onCheckedChange={(checked) => setField('is_fundador', checked === true)} />Fundador (patriarca/matriarca do grupo)</label></div>
      </div>
    </FieldSection>
  );
}

function PjFields({ draft, setDraft, number }: { draft: PessoaDraft; setDraft: React.Dispatch<React.SetStateAction<PessoaDraft>>; number: string }) {
  const setField = <K extends keyof PessoaDraft>(field: K, value: PessoaDraft[K]) => setDraft((old) => ({ ...old, [field]: value }));
  return (
    <FieldSection number={number} title="Dados da PJ">
      <div className={`${formGridCls(3)} gap-3`}>
        <TextField label="NIRE" value={draft.nire} onChange={(value) => setField('nire', value)} />
        <SelectField label="UF da Junta Comercial" value={draft.junta_comercial_uf} onChange={(value) => setField('junta_comercial_uf', value)} options={UF_STATES} />
        <TextField type="date" label="Data de constituição" value={draft.data_constituicao} onChange={(value) => setField('data_constituicao', value)} />
        <SelectField label="Status" value={draft.status_constituicao} onChange={(value) => setField('status_constituicao', value)} options={STATUS_CONSTITUICAO} />
        <SelectField label="Tipo Empresa" value={draft.tipo_empresa} onChange={(value) => setField('tipo_empresa', value)} options={TIPOS_EMPRESA} />
        <div className={`space-y-1.5 ${formSpanCls(3)}`}><Label className={labelCls}>Objeto social</Label><Textarea value={draft.objeto_social} onChange={(event) => setField('objeto_social', event.target.value)} className={`min-h-[80px] ${textareaCls}`} /></div>
      </div>
    </FieldSection>
  );
}

function ParentescoFields({ value, onChange, candidates, number }: { value: ParentescoDraft; onChange: React.Dispatch<React.SetStateAction<ParentescoDraft>>; candidates: PessoaRow[]; number: string }) {
  return (
    <FieldSection number={number} title="Filiação"><div className={`${formGridCls(4)} items-end gap-2`}>
      <div className={`space-y-1.5 ${formSpanCls(2)}`}><Label className={labelCls}>Parente</Label><Select value={value.parenteId || undefined} onValueChange={(id) => onChange((old) => ({ ...old, parenteId: id }))}><SelectTrigger className={fieldCls}><SelectValue placeholder={candidates.length ? 'Selecione...' : 'Cadastre um fundador primeiro'} /></SelectTrigger><SelectContent>{candidates.map((candidate) => <SelectItem key={candidate.id} value={candidate.id}>{candidate.denominacao}</SelectItem>)}</SelectContent></Select></div>
      <SelectField label="Tipo" value={value.tipo} onChange={(tipo) => onChange((old) => ({ ...old, tipo }))} options={TIPOS_PARENTESCO} />
      <SelectField label="Natureza" value={value.natureza} onChange={(natureza) => onChange((old) => ({ ...old, natureza }))} options={NATUREZAS_PARENTESCO} />
    </div></FieldSection>
  );
}

type SelectOption = string | { value: string; label: string };
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: readonly SelectOption[] }) {
  return <div className="space-y-1.5"><Label className={labelCls}>{label}</Label><Select value={value || undefined} onValueChange={onChange}><SelectTrigger className={fieldCls}><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{options.map((option) => { const item = typeof option === 'string' ? { value: option, label: option } : option; return <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>; })}</SelectContent></Select></div>;
}

function TextField({ label, value, onChange, type, placeholder, mono }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; mono?: boolean }) {
  return <div className="space-y-1.5"><Label className={labelCls}>{label}</Label><Input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`${fieldCls} ${mono ? 'font-mono' : ''}`} /></div>;
}
