import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RequiredMark } from '@/components/ui/required-mark';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/equipe/osg/CurrencyInput';
import { formatCep } from '@/components/equipe/client-form/constants';
import { FieldSection, fieldCls, labelCls, switchBoxCls, textareaCls } from '@/components/equipe/osg/formKit';
import { AREA_STEP, clampAreaInput } from '@/components/equipe/osg/diagnostico-patrimonial/areaUtils';
import { formGridCls, formSpanCls } from '@/lib/osgFormGrid';
import { TIPO_BEM_OPTIONS, type MatriculaRow, type TipoBem } from '@/hooks/useDiagnosticoPatrimonial';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import type { DraftBem } from '@/lib/diagnosticoPatrimonialModalModels';
import { MatriculasSection } from '@/components/equipe/osg/diagnostico-patrimonial/bem/MatriculasSection';
import { AVISO_STATUS_ELEGIVEIS, STATUS_INTEGRALIZACAO } from '@/lib/osg/statusIntegralizacao';

interface Props { draft: DraftBem; onChange: (draft: DraftBem) => void; pessoas: PessoaRow[]; isEdit: boolean; loadingMatriculas: boolean; matriculas: MatriculaRow[]; onLink: () => void; onAdd: () => void; onEdit: (item: MatriculaRow) => void; onUnlink: (item: MatriculaRow) => void; onDelete: (item: MatriculaRow) => void; }

export function BemDadosTab({ draft, onChange, pessoas, ...matriculaProps }: Props) {
  const set = <K extends keyof DraftBem>(key: K, value: DraftBem[K]) => onChange({ ...draft, [key]: value });
  const imovel = draft.tipo_bem === 'IR' || draft.tipo_bem === 'IB';
  const rural = draft.tipo_bem === 'IR';
  const urbano = draft.tipo_bem === 'IB';
  const outros = draft.tipo_bem === 'OU';
  const pjs = pessoas.filter((pessoa) => pessoa.tipo_pessoa === 'PJ');
  let number = 0;
  const next = () => String(++number).padStart(2, '0');
  return <>
    <FieldSection number={next()} title="Identificação"><div className={`${formGridCls(3)} gap-3`}>
      <Field label="Referência DP" required campo="referencia_dp"><Input value={draft.referencia_dp} onChange={(e) => set('referencia_dp', e.target.value)} placeholder="ex: IR-01" className={`${fieldCls} font-mono`} /></Field>
      <Field label="Tipo de bem" required><Select value={draft.tipo_bem} onValueChange={(v: TipoBem) => set('tipo_bem', v)}><SelectTrigger className={fieldCls}><SelectValue /></SelectTrigger><SelectContent>{TIPO_BEM_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}><span className="mr-2 font-mono">{option.value}</span>{option.label}</SelectItem>)}</SelectContent></Select></Field>
      <div className="flex items-end"><div className={`${switchBoxCls} w-full`}><Switch checked={draft.participa_estruturacao} onCheckedChange={(v) => set('participa_estruturacao', v)} /><Label className="text-sm">Participa da estruturação</Label></div></div>
      {outros && <div data-campo="descricao_outros" className={`space-y-1.5 ${formSpanCls(3)}`}><Label className={labelCls}>Especifique o tipo de bem<RequiredMark /></Label><Input value={draft.descricao_outros} onChange={(e) => set('descricao_outros', e.target.value)} placeholder="Descreva o tipo de bem" className={fieldCls} /></div>}
      <div data-campo="denominacao" className={`space-y-1.5 ${formSpanCls(3)}`}><Label className={labelCls}>Denominação<RequiredMark /></Label><Input value={draft.denominacao} onChange={(e) => set('denominacao', e.target.value)} placeholder="Nome do bem / fazenda / propriedade" className={fieldCls} /></div>
    </div></FieldSection>
    {/* O modelo de descrição urbana identifica o imóvel pelo endereço (o rural usa a
        denominação), e só cita a área construída quando ela é menor que a total. */}
    {urbano && <FieldSection number={next()} title="Endereço e área construída" hint="município e UF vêm da matrícula"><div className={`${formGridCls(3)} gap-3`}>
      <Field label="CEP"><Input value={draft.endereco_cep} onChange={(e) => set('endereco_cep', formatCep(e.target.value))} placeholder="00000-000" className={`${fieldCls} font-mono`} /></Field>
      <div className={formSpanCls(2)}><Field label="Logradouro"><Input value={draft.endereco_logradouro} onChange={(e) => set('endereco_logradouro', e.target.value)} placeholder="Rua, avenida, rodovia" className={fieldCls} /></Field></div>
      <Field label="Número"><Input value={draft.endereco_numero} onChange={(e) => set('endereco_numero', e.target.value)} placeholder="ex: 119-A ou s/n" className={fieldCls} /></Field>
      <div className={formSpanCls(2)}><Field label="Complemento"><Input value={draft.endereco_complemento} onChange={(e) => set('endereco_complemento', e.target.value)} placeholder="Apartamento, bloco, sala" className={fieldCls} /></Field></div>
      <Field label="Bairro"><Input value={draft.endereco_bairro} onChange={(e) => set('endereco_bairro', e.target.value)} className={fieldCls} /></Field>
      <Field label="Área construída (m²)"><Input type="number" step={AREA_STEP} value={draft.area_construida_m2} onChange={(e) => set('area_construida_m2', clampAreaInput(e.target.value))} className={`${fieldCls} font-mono`} /></Field>
    </div></FieldSection>}
    {!imovel && <FieldSection number={next()} title="Valores" hint="valores do próprio bem — em imóvel eles vivem na matrícula"><div className={`${formGridCls(3)} gap-3`}><Money label="Vlr. contábil" required campo="vlr_contabil" value={draft.vlr_contabil} onChange={(v) => set('vlr_contabil', v)} /><Money label="Vlr. contábil ajustado" value={draft.vlr_contabil_ajustado} onChange={(v) => set('vlr_contabil_ajustado', v)} /><Money label="Vlr. benfeitorias" value={draft.vlr_benfeitorias} onChange={(v) => set('vlr_benfeitorias', v)} /><Money label="Vlr. mercado" value={draft.vlr_mercado} onChange={(v) => set('vlr_mercado', v)} /><Money label={rural ? 'ITR anual' : draft.tipo_bem === 'IB' ? 'IPTU anual' : 'Imposto anual'} value={draft.vlr_imposto_anual} onChange={(v) => set('vlr_imposto_anual', v)} /><Field label="Exercício"><Input type="number" value={draft.imposto_anual_exercicio} onChange={(e) => set('imposto_anual_exercicio', e.target.value)} placeholder="ex: 2025" className={`${fieldCls} font-mono`} /></Field></div></FieldSection>}
    {imovel && <FieldSection number={next()} title="Cadastros oficiais"><div className={`${formGridCls(2)} gap-3`}>{rural && <Field label="CCIR"><Input value={draft.ccir_codigo} onChange={(e) => set('ccir_codigo', e.target.value)} className={`${fieldCls} font-mono`} /></Field>}{draft.tipo_bem === 'IB' && <Field label="Inscrição municipal"><Input value={draft.inscricao_municipal} onChange={(e) => set('inscricao_municipal', e.target.value)} className={`${fieldCls} font-mono`} /></Field>}</div></FieldSection>}
    {/* O status decide se o bem entra no documento gerado, e o conjunto elegível
        mora em `@/lib/osg/statusIntegralizacao`. O aviso abaixo do campo é
        derivado de lá: mudar o conjunto muda a frase, sem editar esta tela.
        O aviso fica FORA das opções de propósito: o `SelectItem` embrulha os
        filhos em `ItemText`, e o Radix espelha esse conteúdo no gatilho fechado
        — um selo dentro do item vazaria para o campo ("Aprovado vai para o
        documento"). */}
    <FieldSection number={next()} title="Integralização"><div className={`${formGridCls(2)} gap-3`}><Field label="Status integralização" campo="status_integralizacao" hint={AVISO_STATUS_ELEGIVEIS}><Select value={draft.status_integralizacao || undefined} onValueChange={(v) => set('status_integralizacao', v)}><SelectTrigger className={fieldCls}><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{STATUS_INTEGRALIZACAO.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Field><Field label="PJ de destino"><Select value={draft.empresa_destino_pessoa_id || undefined} onValueChange={(v) => set('empresa_destino_pessoa_id', v)}><SelectTrigger className={fieldCls}><SelectValue placeholder={pjs.length ? 'Selecione...' : 'Cadastre uma PJ na Qualificação das Partes'} /></SelectTrigger><SelectContent>{pjs.map((pessoa) => <SelectItem key={pessoa.id} value={pessoa.id}>{pessoa.denominacao}</SelectItem>)}</SelectContent></Select></Field>{!draft.participa_estruturacao && <div className={`space-y-1.5 ${formSpanCls(2)}`}><Label className={labelCls}>Motivo de não integralização</Label><Textarea value={draft.motivo_nao_integralizacao} onChange={(e) => set('motivo_nao_integralizacao', e.target.value)} className={`min-h-[60px] ${textareaCls}`} /></div>}</div></FieldSection>
    <FieldSection number={next()} title="Observação"><Textarea value={draft.observacao} onChange={(e) => set('observacao', e.target.value)} className={`min-h-[60px] ${textareaCls}`} /></FieldSection>
    {imovel && <MatriculasSection number={next()} isEdit={matriculaProps.isEdit} loading={matriculaProps.loadingMatriculas} matriculas={matriculaProps.matriculas} onLink={matriculaProps.onLink} onAdd={matriculaProps.onAdd} onEdit={matriculaProps.onEdit} onUnlink={matriculaProps.onUnlink} onDelete={matriculaProps.onDelete} />}
  </>;
}
// `campo`: marcação lida pelo utilitário de falha de validação (@/lib/osg/validacaoFormulario),
// que leva o foco ao primeiro campo que falta.
function Field({ label, required, campo, hint, children }: { label: string; required?: boolean; campo?: string; hint?: string; children: React.ReactNode }) { return <div className="space-y-1.5" data-campo={campo}><Label className={labelCls}>{label}{required && <RequiredMark />}</Label>{children}{hint && <p className="text-[11px] leading-tight text-muted-foreground">{hint}</p>}</div>; }
function Money({ label, required, campo, value, onChange }: { label: string; required?: boolean; campo?: string; value: string; onChange: (value: string) => void }) { return <Field label={label} required={required} campo={campo}><CurrencyInput value={value} onChange={onChange} className={`${fieldCls} font-mono`} /></Field>; }
