import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RequiredMark } from '@/components/ui/required-mark';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/equipe/osg/CurrencyInput';
import DateFieldWithInput from '@/components/equipe/client-form/DateFieldWithInput';
import { UF_STATES } from '@/components/equipe/client-form/constants';
import { FieldSection, fieldCls, labelCls, switchBoxCls, textareaCls } from '@/components/equipe/osg/formKit';
import { formGridCls, formSpanCls } from '@/lib/osgFormGrid';
import type { MatriculaRow } from '@/hooks/useDiagnosticoPatrimonial';
import type { DraftMatricula } from '@/lib/diagnosticoPatrimonialModalModels';
import { toast } from 'sonner';
import { AREA_STEP, clampAreaInput, converterArea, formatAreaUnidade, unidadesEquivalentes } from '@/components/equipe/osg/diagnostico-patrimonial/areaUtils';
import { CartorioSelect } from '@/components/equipe/osg/diagnostico-patrimonial/CartorioSelect';

const EXPLORACAO = ['Exploração Direta', 'Arrendamento', 'Parceria', 'Comodato', 'Posse', 'Outro'];
const GEORREF = ['Sim', 'Não', 'Parcial', 'Em processo'];
const UNIDADES = [{ value: 'ha', label: 'ha' }, { value: 'm2', label: 'm²' }, { value: 'ha_m2', label: 'ha e m²' }];

interface Props { draft: DraftMatricula; onChange: (draft: DraftMatricula) => void; bemTipo: string | null; matricula: MatriculaRow | null; matriculasDoBem: MatriculaRow[]; }

export function MatriculaDadosTab({ draft, onChange, bemTipo, matricula, matriculasDoBem }: Props) {
  const set = <K extends keyof DraftMatricula>(key: K, value: DraftMatricula[K]) => onChange({ ...draft, [key]: value });
  // Trocar a unidade CONVERTE o que já foi digitado (10.000 m² = 1 ha) em vez de
  // reinterpretar o número: a quantidade representada não muda, e o consultor é
  // avisado do que aconteceu com os campos.
  const trocarUnidade = (unidade: string) => {
    const convertidas = {
      area_documento: converterArea(draft.area_documento, draft.area_unidade, unidade),
      area_real: converterArea(draft.area_real, draft.area_unidade, unidade),
      area_explorada: converterArea(draft.area_explorada, draft.area_unidade, unidade),
    };
    onChange({ ...draft, area_unidade: unidade, ...convertidas });
    const converteu = !unidadesEquivalentes(draft.area_unidade, unidade)
      && Object.values(convertidas).some((valor) => valor.trim());
    if (converteu) {
      toast.info(
        `Áreas convertidas de ${formatAreaUnidade(draft.area_unidade)} para ${formatAreaUnidade(unidade)} — a quantidade não mudou.`,
      );
    }
  };
  const tipo = draft.tipo_bem || bemTipo || null;
  const rural = tipo === 'IR' || tipo == null;
  const anteriores = matriculasDoBem.filter((item) => item.id !== matricula?.id);
  let number = 0;
  const next = () => String(++number).padStart(2, '0');
  return <>
    <FieldSection number={next()} title="Identificação"><div className="space-y-3"><div className={`${formGridCls(4)} gap-3`}>
      <Field label="Nº da matrícula" required campo="numero"><Input value={draft.numero} onChange={(e) => set('numero', e.target.value)} className={`${fieldCls} font-mono`} /></Field>
      <Field label="Tipo do imóvel"><Select value={draft.tipo_bem || undefined} onValueChange={(v: 'IR' | 'IB') => set('tipo_bem', v)}><SelectTrigger className={fieldCls}><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="IR"><span className="mr-2 font-mono">IR</span>Imóvel Rural</SelectItem><SelectItem value="IB"><span className="mr-2 font-mono">IB</span>Imóvel Urbano</SelectItem></SelectContent></Select></Field>
      <Field label="Livro"><Input value={draft.livro} onChange={(e) => set('livro', e.target.value)} className={fieldCls} /></Field>
      <Field label="Folha"><Input value={draft.folha} onChange={(e) => set('folha', e.target.value)} className={fieldCls} /></Field>
      <Field label="Data"><DateFieldWithInput value={draft.data_matricula} onChange={(v) => set('data_matricula', v)} /></Field>
    </div><Field label="Cartório" required campo="cartorio_id"><CartorioSelect value={draft.cartorio_id} onChange={(v) => set('cartorio_id', v)} /></Field></div></FieldSection>
    <FieldSection number={next()} title="Localização e áreas" hint={draft.area_unidade === 'ha_m2' ? 'áreas em ha e m² — inteiro = ha, decimais = m² (123,1234 = 123 ha e 1.234 m²); trocar a unidade converte o valor' : `áreas em ${formatAreaUnidade(draft.area_unidade)} — trocar a unidade converte o valor`}>
      <div className="space-y-3"><div className={`${formGridCls(3)} gap-3`}><div data-campo="municipio_imovel" className={`space-y-1.5 ${formSpanCls(2)}`}><Label className={labelCls}>Município<RequiredMark /></Label><Input value={draft.municipio_imovel} onChange={(e) => set('municipio_imovel', e.target.value)} className={fieldCls} /></div>
        <Field label="UF" required campo="uf_imovel"><Select value={draft.uf_imovel || undefined} onValueChange={(v) => set('uf_imovel', v)}><SelectTrigger className={fieldCls}><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{UF_STATES.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent></Select></Field></div>
      <div className={`${formGridCls(4)} gap-3`}><Field label="Unidade"><Select value={draft.area_unidade} onValueChange={trocarUnidade}><SelectTrigger className={fieldCls}><SelectValue /></SelectTrigger><SelectContent>{UNIDADES.map((unit) => <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>)}</SelectContent></Select></Field>
        <Area label="Área documento" required campo="area_documento" value={draft.area_documento} onChange={(v) => set('area_documento', v)} /><Area label="Área real" value={draft.area_real} onChange={(v) => set('area_real', v)} />{rural && <Area label="Área explorada" value={draft.area_explorada} onChange={(v) => set('area_explorada', v)} />}</div></div>
    </FieldSection>
    {rural && <FieldSection number={next()} title="Georreferenciamento"><div className={`${formGridCls(2)} items-end gap-3`}><Field label="Status"><Select value={draft.georreferenciado || undefined} onValueChange={(v) => set('georreferenciado', v)}><SelectTrigger className={fieldCls}><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{GEORREF.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Field><div className={switchBoxCls}><Switch checked={draft.georref_prejudica_transferencia} onCheckedChange={(v) => set('georref_prejudica_transferencia', v)} /><Label className="text-sm">Prejudica transferência</Label></div></div></FieldSection>}
    <FieldSection number={next()} title="Valores"><div className={`${formGridCls(3)} gap-3`}>
      <Money label="Vlr. contábil" value={draft.vlr_contabil} onChange={(v) => set('vlr_contabil', v)} /><Money label="Vlr. contábil ajustado" value={draft.vlr_contabil_ajustado} onChange={(v) => set('vlr_contabil_ajustado', v)} /><Money label="Vlr. benfeitorias" value={draft.vlr_benfeitorias} onChange={(v) => set('vlr_benfeitorias', v)} /><Money label="Vlr. mercado" value={draft.vlr_mercado} onChange={(v) => set('vlr_mercado', v)} /><Money label={tipo === 'IR' ? 'ITR anual' : tipo === 'IB' ? 'IPTU anual' : 'Imposto anual'} value={draft.vlr_imposto_anual} onChange={(v) => set('vlr_imposto_anual', v)} /><Field label="Exercício"><Input type="number" value={draft.imposto_anual_exercicio} onChange={(e) => set('imposto_anual_exercicio', e.target.value)} placeholder="ex: 2025" className={`${fieldCls} font-mono`} /></Field>
    </div></FieldSection>
    <FieldSection number={next()} title="Histórico e descrição"><div className={`${formGridCls(2)} gap-3`}>
      <Field label="Tipo de exploração/posse"><Select value={draft.tipo_exploracao_posse || undefined} onValueChange={(v) => set('tipo_exploracao_posse', v)}><SelectTrigger className={fieldCls}><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{EXPLORACAO.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Matrícula anterior"><Select value={draft.matricula_anterior_id || undefined} onValueChange={(v) => set('matricula_anterior_id', v)}><SelectTrigger className={fieldCls}><SelectValue placeholder={anteriores.length ? 'Selecione...' : 'Nenhuma'} /></SelectTrigger><SelectContent>{anteriores.map((item) => <SelectItem key={item.id} value={item.id}>Matrícula {item.numero}</SelectItem>)}</SelectContent></Select></Field>
      <Wide label="Texto da matrícula anterior (caso não esteja cadastrada)"><Input value={draft.matricula_anterior_texto} onChange={(e) => set('matricula_anterior_texto', e.target.value)} className={fieldCls} /></Wide><Wide label="Origem (descrição)"><Input value={draft.origem_descricao} onChange={(e) => set('origem_descricao', e.target.value)} className={fieldCls} /></Wide><Wide label="Confrontações"><Textarea value={draft.confrontacoes_texto} onChange={(e) => set('confrontacoes_texto', e.target.value)} className={`min-h-[80px] ${textareaCls}`} /></Wide><Wide label="Descrição PSA (completa)"><Textarea value={draft.descricao_psa_completa} onChange={(e) => set('descricao_psa_completa', e.target.value)} className={`min-h-[100px] ${textareaCls}`} /></Wide>
    </div></FieldSection>
  </>;
}

// `campo`: marcação lida pelo utilitário de falha de validação (@/lib/osg/validacaoFormulario),
// que leva o foco ao primeiro campo que falta.
function Field({ label, required, campo, children }: { label: string; required?: boolean; campo?: string; children: React.ReactNode }) { return <div className="space-y-1.5" data-campo={campo}><Label className={labelCls}>{label}{required && <RequiredMark />}</Label>{children}</div>; }
function Wide({ label, children }: { label: string; children: React.ReactNode }) { return <div className={`space-y-1.5 ${formSpanCls(2)}`}><Label className={labelCls}>{label}</Label>{children}</div>; }
function Area({ label, required, campo, value, onChange }: { label: string; required?: boolean; campo?: string; value: string; onChange: (value: string) => void }) { return <Field label={label} required={required} campo={campo}><Input type="number" step={AREA_STEP} value={value} onChange={(e) => onChange(clampAreaInput(e.target.value))} className={`${fieldCls} font-mono`} /></Field>; }
function Money({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <Field label={label}><CurrencyInput value={value} onChange={onChange} className={`${fieldCls} font-mono`} /></Field>; }
