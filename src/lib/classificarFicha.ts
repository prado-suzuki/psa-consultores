import type { BemInsert, MatriculaInsert, TitularInicial } from '@/hooks/useDiagnosticoPatrimonial';
import type { AtualizarDocumentoPatch, DocumentoArquivoRow } from '@/hooks/useDocumentoArquivo';
import type { PessoaInsert } from '@/hooks/useQualificacaoDasPartes';
import type { DraftBem, DraftMatricula, TitularInicialDraft } from '@/lib/diagnosticoPatrimonialModalModels';
import type { PessoaDraft } from '@/lib/pessoaModalModel';

/**
 * Regras puras da ficha do modo Classificar: para quem o arquivo vai, o que
 * impede de salvar, e quais campos vieram do documento aberto.
 */

/** Para onde o arquivo aberto vai. 'cliente' é a válvula "não é de ninguém" (§5, regra 4). */
export type Alvo =
  | { kind: 'pessoa'; id: string }
  | { kind: 'bem'; id: string }
  | { kind: 'matricula'; id: string }
  | { kind: 'cliente' };

/** Codificação usada pelo seletor de vínculo que já existe ("pessoa:<id>", "sem"…). */
export function alvoDeValor(valor: string): Alvo {
  const [kind, id] = valor.split(':');
  if (kind === 'pessoa' && id) return { kind: 'pessoa', id };
  if (kind === 'bem' && id) return { kind: 'bem', id };
  if (kind === 'matricula' && id) return { kind: 'matricula', id };
  return { kind: 'cliente' };
}

/**
 * Patch do vínculo. 1:1 (decisão de 03/08/2026): grava o dono escolhido e zera
 * os outros dois, de modo que a linha nunca tenha mais de um dono preenchido.
 *
 * O alvo `cliente` é a válvula "não é de ninguém": em vez de dono, grava a marca
 * de triagem (BER-39), e zera os três mesmo assim. Não é detalhe de estilo: a
 * constraint `documento_arquivo_um_dono_apenas` recusa a marca convivendo com um
 * dono, então enviar só a marca, sem zerar, derruba o update.
 *
 * Quem preenche `triado_por` é o hook de atualização, que tem a sessão. Aqui
 * fica só a regra.
 */
export function patchVinculo(alvo: Alvo): AtualizarDocumentoPatch {
  return {
    pessoa_id: alvo.kind === 'pessoa' ? alvo.id : null,
    bem_id: alvo.kind === 'bem' ? alvo.id : null,
    matricula_id: alvo.kind === 'matricula' ? alvo.id : null,
    triado_em: alvo.kind === 'cliente' ? new Date().toISOString() : null,
  };
}

/**
 * Devolve o arquivo ao balde: sem dono e sem marca de triagem.
 *
 * É o inverso do `patchVinculo({ kind: 'cliente' })` e existe como função
 * própria porque não há alvo que signifique "nenhum": voltar ao balde não é
 * escolher um destino, é apagar o que foi decidido.
 */
export function patchDesfazerTriagem(): AtualizarDocumentoPatch {
  return { pessoa_id: null, bem_id: null, matricula_id: null, triado_em: null };
}

/**
 * Georreferenciamento é a exceção conhecida: naquele caminho o arquivo só existe
 * amarrado a uma matrícula, e é a mesma regra que o upload e o vínculo já
 * aplicam. Devolve a mensagem de recusa, ou null quando pode seguir.
 */
export function impedimentoDeVinculo(doc: DocumentoArquivoRow | null, alvo: Alvo): string | null {
  if (!doc) return 'Abra um arquivo do balde antes de salvar.';
  if (doc.categoria === 'georreferenciamento' && alvo.kind !== 'matricula') {
    return 'Documentos de georreferenciamento precisam estar vinculados a uma matrícula.';
  }
  return null;
}

/** Tipos de ficha que a coluna sabe abrir a partir de um documento. */
export type TipoFicha = 'PF' | 'PJ' | 'bem' | 'matricula';

export interface ParentescoNovo {
  parenteId: string;
  tipo: string;
  natureza: string;
}

/** O que a coluna entrega quando o consultor manda cadastrar a partir do arquivo. */
export type NovoCadastro =
  | { tipo: 'pessoa'; values: PessoaInsert; parentesco: ParentescoNovo }
  | { tipo: 'bem'; values: BemInsert; titular?: TitularInicial }
  | { tipo: 'matricula'; values: MatriculaInsert; titular?: TitularInicial };

/* ------------------------------------------------------------------ validação */

// Mesmas regras e mesmos textos dos modais de cadastro (PessoaModal, BemModal,
// MatriculaModal). Ficam aqui em forma pura para a coluna estreita poder validar
// sem o modal; unificar os modais com estas funções é um passo seguinte óbvio,
// deixado de fora para não misturar refatoração com feature nova.

export function validarPessoa(draft: PessoaDraft): string | null {
  const isPF = draft.tipo_pessoa === 'PF';
  if (!draft.denominacao.trim()) return isPF ? 'Nome completo é obrigatório' : 'Razão social é obrigatória';
  const digitos = draft.cpf_cnpj.replace(/\D/g, '');
  if (digitos && isPF && digitos.length !== 11) return 'CPF deve ter 11 dígitos';
  if (digitos && !isPF && digitos.length !== 14) return 'CNPJ deve ter 14 dígitos';
  return null;
}

export const bemEhImovel = (draft: DraftBem): boolean => draft.tipo_bem === 'IR' || draft.tipo_bem === 'IB';

export function validarBem(draft: DraftBem, titular: TitularInicialDraft): string | null {
  if (!draft.referencia_dp.trim()) return 'Referência DP é obrigatória';
  if (!draft.denominacao.trim()) return 'Denominação é obrigatória';
  if (draft.tipo_bem === 'OU' && !draft.descricao_outros.trim()) return 'Especifique o tipo de bem';
  if (!bemEhImovel(draft) && (!draft.vlr_contabil.trim() || Number.isNaN(Number(draft.vlr_contabil)))) {
    return 'Valor contábil é obrigatório';
  }
  // Bem sem matrícula precisa de titular inicial; imóvel tem os titulares na matrícula.
  if (!bemEhImovel(draft)) return validarTitular(titular, 'bem');
  return null;
}

export function validarMatricula(
  draft: DraftMatricula,
  titular: TitularInicialDraft,
  bemId: string,
): string | null {
  if (!bemId) return 'Selecione o imóvel (bem) a que esta matrícula pertence';
  if (!draft.numero.trim()) return 'Número da matrícula é obrigatório';
  if (!draft.cartorio_id) return 'Selecione o cartório';
  if (!draft.municipio_imovel.trim()) return 'Município do imóvel é obrigatório';
  if (!draft.uf_imovel) return 'UF do imóvel é obrigatória';
  if (!draft.area_documento.trim() || Number.isNaN(Number(draft.area_documento))) {
    return 'Área do documento é obrigatória';
  }
  return validarTitular(titular, 'matrícula');
}

function validarTitular(titular: TitularInicialDraft, entidade: 'bem' | 'matrícula'): string | null {
  if (!titular.titular_pessoa_id) {
    return entidade === 'bem' ? 'Selecione o titular inicial do bem' : 'Selecione o titular inicial da matrícula';
  }
  if (titular.fracao.trim()) {
    const fracao = Number(titular.fracao);
    if (Number.isNaN(fracao) || fracao <= 0 || fracao > 100) return 'Fração do titular deve estar entre 0 e 100';
  }
  return null;
}

/* ---------------------------------------------------------------- procedência */

/**
 * Procedência: quais campos foram preenchidos NESTA sessão, com ESTE documento
 * aberto. É derivada só da comparação entre o rascunho de quando o arquivo foi
 * aberto e o rascunho atual — nada disso é gravado. Registrar procedência campo
 * a campo é a questão aberta nº 3 do plano e não tem schema; a tira no topo da
 * coluna é a leitura honesta possível hoje.
 */
export function camposComProcedencia<T extends object>(
  inicial: T,
  atual: T,
  rotulos: Partial<Record<keyof T & string, string>>,
): string[] {
  const campos: string[] = [];
  for (const [campo, rotulo] of Object.entries(rotulos) as [keyof T & string, string][]) {
    const antes = inicial[campo];
    const agora = atual[campo];
    const vazio = agora === '' || agora === null || agora === undefined;
    if (!vazio && antes !== agora) campos.push(rotulo);
  }
  return campos;
}

export const ROTULOS_PESSOA: Partial<Record<keyof PessoaDraft & string, string>> = {
  cpf_cnpj: 'CPF/CNPJ',
  denominacao: 'Nome',
  endereco_cep: 'CEP',
  endereco_logradouro: 'Logradouro',
  endereco_numero: 'Número',
  endereco_bairro: 'Bairro',
  endereco_municipio: 'Município',
  endereco_uf: 'UF',
  genero: 'Gênero',
  nacionalidade: 'Nacionalidade',
  naturalidade_municipio: 'Naturalidade',
  data_nascimento: 'Nascimento',
  profissao: 'Profissão',
  estado_civil: 'Estado civil',
  regime_bens: 'Regime de bens',
  filiacao_pai: 'Filiação (pai)',
  filiacao_mae: 'Filiação (mãe)',
  documento_identidade_numero: 'Nº do documento',
  documento_identidade_orgao: 'Órgão emissor',
  nire: 'NIRE',
  data_constituicao: 'Constituição',
  objeto_social: 'Objeto social',
};

export const ROTULOS_BEM: Partial<Record<keyof DraftBem & string, string>> = {
  referencia_dp: 'Referência DP',
  tipo_bem: 'Tipo de bem',
  denominacao: 'Denominação',
  vlr_contabil: 'Vlr. contábil',
  vlr_mercado: 'Vlr. mercado',
  ccir_codigo: 'CCIR',
  inscricao_municipal: 'Inscrição municipal',
  observacao: 'Observação',
};

export const ROTULOS_MATRICULA: Partial<Record<keyof DraftMatricula & string, string>> = {
  numero: 'Nº da matrícula',
  tipo_bem: 'Tipo do imóvel',
  livro: 'Livro',
  folha: 'Folha',
  data_matricula: 'Data',
  cartorio_id: 'Cartório',
  municipio_imovel: 'Município',
  uf_imovel: 'UF',
  area_documento: 'Área documento',
  area_real: 'Área real',
  georreferenciado: 'Georreferenciamento',
  origem_descricao: 'Origem',
  confrontacoes_texto: 'Confrontações',
  matricula_anterior_texto: 'Matrícula anterior',
};
