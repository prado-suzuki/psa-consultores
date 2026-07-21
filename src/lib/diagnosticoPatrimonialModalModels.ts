import type {
  BemRow,
  MatriculaRow,
  TipoBem,
  TitularInicial,
} from '@/hooks/useDiagnosticoPatrimonial';

export type TitularInicialDraft = {
  titular_pessoa_id: string;
  tipo: string;
  fracao: string;
};

export const emptyTitularInicial = (): TitularInicialDraft => ({
  titular_pessoa_id: '',
  tipo: 'DIREITO',
  fracao: '',
});

export function parseTitularInicial(draft: TitularInicialDraft): TitularInicial | null {
  if (!draft.titular_pessoa_id) return null;
  let fracao: number | null = null;
  if (draft.fracao.trim()) {
    const parsed = Number(draft.fracao);
    if (Number.isNaN(parsed) || parsed <= 0 || parsed > 100) return null;
    fracao = parsed;
  }
  return { titular_pessoa_id: draft.titular_pessoa_id, tipo: draft.tipo, fracao };
}

export type DraftBem = {
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

export const emptyBemDraft = (): DraftBem => ({
  referencia_dp: '', tipo_bem: 'IR', descricao_outros: '', denominacao: '', vlr_contabil: '',
  vlr_contabil_ajustado: '', vlr_benfeitorias: '', vlr_mercado: '', vlr_imposto_anual: '',
  imposto_anual_exercicio: '', ccir_codigo: '', inscricao_municipal: '',
  status_integralizacao: '', empresa_destino_pessoa_id: '', participa_estruturacao: true,
  motivo_nao_integralizacao: '', observacao: '',
});

export const bemToDraft = (b: BemRow): DraftBem => ({
  referencia_dp: b.referencia_dp ?? '', tipo_bem: (b.tipo_bem as TipoBem) ?? 'IR',
  descricao_outros: b.descricao_outros ?? '', denominacao: b.denominacao ?? '',
  vlr_contabil: b.vlr_contabil != null ? String(b.vlr_contabil) : '',
  vlr_contabil_ajustado: b.vlr_contabil_ajustado != null ? String(b.vlr_contabil_ajustado) : '',
  vlr_benfeitorias: b.vlr_benfeitorias != null ? String(b.vlr_benfeitorias) : '',
  vlr_mercado: b.vlr_mercado != null ? String(b.vlr_mercado) : '',
  vlr_imposto_anual: b.vlr_imposto_anual != null ? String(b.vlr_imposto_anual) : '',
  imposto_anual_exercicio: b.imposto_anual_exercicio != null ? String(b.imposto_anual_exercicio) : '',
  ccir_codigo: b.ccir_codigo ?? '', inscricao_municipal: b.inscricao_municipal ?? '',
  status_integralizacao: b.status_integralizacao ?? '',
  empresa_destino_pessoa_id: b.empresa_destino_pessoa_id ?? '',
  participa_estruturacao: b.participa_estruturacao ?? true,
  motivo_nao_integralizacao: b.motivo_nao_integralizacao ?? '', observacao: b.observacao ?? '',
});

const nullify = (value: string) => (value.trim() ? value : null);
const toNum = (value: string) => (value.trim() && !Number.isNaN(Number(value)) ? Number(value) : null);
const toInt = (value: string) =>
  value.trim() && !Number.isNaN(parseInt(value, 10)) ? parseInt(value, 10) : null;

export function bemDraftToValues(draft: DraftBem, clienteId: string) {
  const isImovel = draft.tipo_bem === 'IR' || draft.tipo_bem === 'IB';
  return {
    cliente_id: clienteId, referencia_dp: draft.referencia_dp.trim(), tipo_bem: draft.tipo_bem,
    descricao_outros: draft.tipo_bem === 'OU' ? nullify(draft.descricao_outros) : null,
    denominacao: draft.denominacao.trim(),
    vlr_contabil: isImovel ? toNum(draft.vlr_contabil) : Number(draft.vlr_contabil),
    vlr_contabil_ajustado: isImovel ? null : toNum(draft.vlr_contabil_ajustado),
    vlr_benfeitorias: isImovel ? null : toNum(draft.vlr_benfeitorias),
    vlr_mercado: isImovel ? null : toNum(draft.vlr_mercado),
    vlr_imposto_anual: isImovel ? null : toNum(draft.vlr_imposto_anual),
    imposto_anual_exercicio: isImovel ? null : toInt(draft.imposto_anual_exercicio),
    ccir_codigo: draft.tipo_bem === 'IR' ? nullify(draft.ccir_codigo) : null,
    inscricao_municipal: draft.tipo_bem === 'IB' ? nullify(draft.inscricao_municipal) : null,
    status_integralizacao: nullify(draft.status_integralizacao),
    empresa_destino_pessoa_id: draft.empresa_destino_pessoa_id || null,
    participa_estruturacao: draft.participa_estruturacao,
    motivo_nao_integralizacao: draft.participa_estruturacao ? null : nullify(draft.motivo_nao_integralizacao),
    observacao: nullify(draft.observacao),
  };
}

export type DraftMatricula = {
  numero: string; tipo_bem: '' | 'IR' | 'IB'; matricula_anterior_id: string;
  matricula_anterior_texto: string; livro: string; folha: string; data_matricula: string;
  cartorio_id: string; municipio_imovel: string; uf_imovel: string; area_documento: string;
  area_real: string; area_explorada: string; area_unidade: string; georreferenciado: string;
  georref_prejudica_transferencia: boolean; tipo_exploracao_posse: string;
  descricao_psa_completa: string; confrontacoes_texto: string; origem_descricao: string;
  vlr_contabil: string; vlr_contabil_ajustado: string; vlr_benfeitorias: string;
  vlr_mercado: string; vlr_imposto_anual: string; imposto_anual_exercicio: string;
};

export const emptyMatriculaDraft = (tipo: '' | 'IR' | 'IB' = ''): DraftMatricula => ({
  numero: '', tipo_bem: tipo, matricula_anterior_id: '', matricula_anterior_texto: '', livro: '',
  folha: '', data_matricula: '', cartorio_id: '', municipio_imovel: '', uf_imovel: '',
  area_documento: '', area_real: '', area_explorada: '', area_unidade: 'ha', georreferenciado: '',
  georref_prejudica_transferencia: false, tipo_exploracao_posse: '', descricao_psa_completa: '',
  confrontacoes_texto: '', origem_descricao: '', vlr_contabil: '', vlr_contabil_ajustado: '',
  vlr_benfeitorias: '', vlr_mercado: '', vlr_imposto_anual: '', imposto_anual_exercicio: '',
});

export const matriculaToDraft = (m: MatriculaRow): DraftMatricula => ({
  numero: m.numero ?? '', tipo_bem: m.tipo_bem === 'IR' || m.tipo_bem === 'IB' ? m.tipo_bem : '', matricula_anterior_id: m.matricula_anterior_id ?? '',
  matricula_anterior_texto: m.matricula_anterior_texto ?? '', livro: m.livro ?? '', folha: m.folha ?? '',
  data_matricula: m.data_matricula ?? '', cartorio_id: m.cartorio_id ?? '',
  municipio_imovel: m.municipio_imovel ?? '', uf_imovel: m.uf_imovel ?? '',
  area_documento: m.area_documento != null ? String(m.area_documento) : '',
  area_real: m.area_real != null ? String(m.area_real) : '',
  area_explorada: m.area_explorada != null ? String(m.area_explorada) : '', area_unidade: m.area_unidade ?? 'ha',
  georreferenciado: m.georreferenciado ?? '', georref_prejudica_transferencia: m.georref_prejudica_transferencia ?? false,
  tipo_exploracao_posse: m.tipo_exploracao_posse ?? '', descricao_psa_completa: m.descricao_psa_completa ?? '',
  confrontacoes_texto: m.confrontacoes_texto ?? '', origem_descricao: m.origem_descricao ?? '',
  vlr_contabil: m.vlr_contabil != null ? String(m.vlr_contabil) : '',
  vlr_contabil_ajustado: m.vlr_contabil_ajustado != null ? String(m.vlr_contabil_ajustado) : '',
  vlr_benfeitorias: m.vlr_benfeitorias != null ? String(m.vlr_benfeitorias) : '',
  vlr_mercado: m.vlr_mercado != null ? String(m.vlr_mercado) : '',
  vlr_imposto_anual: m.vlr_imposto_anual != null ? String(m.vlr_imposto_anual) : '',
  imposto_anual_exercicio: m.imposto_anual_exercicio != null ? String(m.imposto_anual_exercicio) : '',
});

export function matriculaDraftToValues(
  draft: DraftMatricula,
  bemId: string | null,
  original: MatriculaRow | null,
  bemTipo: string | null,
) {
  const tipoPayload = draft.tipo_bem || null;
  const tipoEfetivo = draft.tipo_bem || bemTipo || null;
  const rural = tipoEfetivo === 'IR' || tipoEfetivo == null;
  return {
    bem_id: bemId ?? original?.bem_id ?? null, numero: draft.numero.trim(), tipo_bem: tipoPayload,
    matricula_anterior_id: draft.matricula_anterior_id || null,
    matricula_anterior_texto: nullify(draft.matricula_anterior_texto), livro: nullify(draft.livro),
    folha: nullify(draft.folha), data_matricula: nullify(draft.data_matricula), cartorio_id: draft.cartorio_id,
    municipio_imovel: draft.municipio_imovel.trim(), uf_imovel: draft.uf_imovel,
    area_documento: Number(draft.area_documento), area_real: toNum(draft.area_real),
    area_explorada: rural ? toNum(draft.area_explorada) : null, area_unidade: draft.area_unidade,
    georreferenciado: rural ? nullify(draft.georreferenciado) : null,
    georref_prejudica_transferencia: rural ? draft.georref_prejudica_transferencia : null,
    tipo_exploracao_posse: nullify(draft.tipo_exploracao_posse),
    descricao_psa_completa: nullify(draft.descricao_psa_completa),
    confrontacoes_texto: nullify(draft.confrontacoes_texto), origem_descricao: nullify(draft.origem_descricao),
    vlr_contabil: toNum(draft.vlr_contabil), vlr_contabil_ajustado: toNum(draft.vlr_contabil_ajustado),
    vlr_benfeitorias: toNum(draft.vlr_benfeitorias), vlr_mercado: toNum(draft.vlr_mercado),
    vlr_imposto_anual: toNum(draft.vlr_imposto_anual), imposto_anual_exercicio: toInt(draft.imposto_anual_exercicio),
  };
}
