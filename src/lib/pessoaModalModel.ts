import type { PessoaInsert, PessoaRow, TipoPessoa } from '@/hooks/useQualificacaoDasPartes';

export type PessoaDraft = {
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
  nire: string;
  junta_comercial_uf: string;
  data_constituicao: string;
  objeto_social: string;
  status_constituicao: string;
  tipo_empresa: string;
};

export const emptyPessoaDraft = (): PessoaDraft => ({
  tipo_pessoa: 'PF', denominacao: '', cpf_cnpj: '', endereco_cep: '', endereco_logradouro: '',
  endereco_numero: '', endereco_complemento: '', endereco_bairro: '', endereco_municipio: '',
  endereco_uf: '', genero: '', nacionalidade: '', naturalidade_municipio: '', naturalidade_uf: '',
  estado_civil: '', regime_bens: '', data_nascimento: '', filiacao_pai: '', filiacao_pai_pessoa_id: '',
  filiacao_mae: '', filiacao_mae_pessoa_id: '', profissao: '', documento_identidade_tipo: '',
  documento_identidade_numero: '', documento_identidade_orgao: '', documento_identidade_uf: '',
  conjuge_id: '', is_fundador: false, nire: '', junta_comercial_uf: '', data_constituicao: '',
  objeto_social: '', status_constituicao: '', tipo_empresa: '',
});

export const pessoaToDraft = (p: PessoaRow): PessoaDraft => {
  const empty = emptyPessoaDraft();
  return Object.fromEntries(
    Object.entries(empty).map(([key, fallback]) => [key, p[key as keyof PessoaRow] ?? fallback]),
  ) as PessoaDraft;
};

const nullify = (value: string) => (value.trim() ? value : null);

/**
 * Estados civis em que existe cônjuge para apontar.
 *
 * A lista é a regra, não a tela: fora dela o vínculo conjugal não pode
 * sobreviver no payload. Antes, mudar de "Casado(a)" para "Divorciado(a)" só
 * escondia o campo e o `conjuge_id` continuava sendo gravado; com o vínculo
 * agora recíproco no banco, esse ponteiro esquecido deixaria as duas pessoas
 * marcadas como casadas e sem caminho de tela para desfazer.
 */
export const ESTADOS_CIVIS_COM_CONJUGE = ['Casado(a)', 'União Estável'];

export const ehEstadoCivilComConjuge = (estadoCivil: string) =>
  ESTADOS_CIVIS_COM_CONJUGE.includes(estadoCivil);

export function buildPessoaPayload(draft: PessoaDraft, clienteId: string): PessoaInsert {
  const common = {
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

  if (draft.tipo_pessoa === 'PF') {
    return {
      ...common,
      genero: nullify(draft.genero), nacionalidade: nullify(draft.nacionalidade),
      naturalidade_municipio: nullify(draft.naturalidade_municipio), naturalidade_uf: nullify(draft.naturalidade_uf),
      estado_civil: nullify(draft.estado_civil), regime_bens: nullify(draft.regime_bens),
      data_nascimento: nullify(draft.data_nascimento), filiacao_pai: nullify(draft.filiacao_pai),
      filiacao_pai_pessoa_id: draft.filiacao_pai_pessoa_id || null, filiacao_mae: nullify(draft.filiacao_mae),
      filiacao_mae_pessoa_id: draft.filiacao_mae_pessoa_id || null, profissao: nullify(draft.profissao),
      documento_identidade_tipo: nullify(draft.documento_identidade_tipo),
      documento_identidade_numero: nullify(draft.documento_identidade_numero),
      documento_identidade_orgao: nullify(draft.documento_identidade_orgao),
      documento_identidade_uf: nullify(draft.documento_identidade_uf),
      // Estado civil sem cônjuge não grava cônjuge, venha o rascunho de onde vier.
      conjuge_id: ehEstadoCivilComConjuge(draft.estado_civil) ? draft.conjuge_id || null : null,
      is_fundador: draft.is_fundador, nire: null, junta_comercial_uf: null, data_constituicao: null,
      objeto_social: null, status_constituicao: null, tipo_empresa: null,
    };
  }

  return {
    ...common,
    genero: null, nacionalidade: null, naturalidade_municipio: null, naturalidade_uf: null,
    estado_civil: null, regime_bens: null, data_nascimento: null, filiacao_pai: null,
    filiacao_pai_pessoa_id: null, filiacao_mae: null, filiacao_mae_pessoa_id: null, profissao: null,
    documento_identidade_tipo: null, documento_identidade_numero: null, documento_identidade_orgao: null,
    documento_identidade_uf: null, conjuge_id: null, is_fundador: false, nire: nullify(draft.nire),
    junta_comercial_uf: nullify(draft.junta_comercial_uf), data_constituicao: nullify(draft.data_constituicao),
    objeto_social: nullify(draft.objeto_social), status_constituicao: nullify(draft.status_constituicao),
    tipo_empresa: draft.tipo_empresa || null,
  };
}
