import { capitalDeQuotas } from '@/lib/templates/capital';

// O vocabulário do movimento de quota e as regras que dizem se um movimento pode
// ser gravado. Fica aqui, puro, porque as mesmas regras valem para a tela (que
// desabilita o botão e explica o motivo), para o hook (que grava) e para o
// teste. E porque o banco só checa o que é barato em SQL (`tipo` na lista,
// origem-ou-destino preenchido). "O cedente tem quotas suficientes?" é pergunta
// sobre o SALDO, que é a view, e nenhum check de coluna alcança.

export type TipoMovimento = 'aporte' | 'cessao' | 'doacao' | 'reducao';

export interface FormaDoMovimento {
  label: string;
  /** Uma frase, na tela, explicando o que o movimento faz com as quotas. */
  descricao: string;
  /** Rótulo do lado que SAI. Nulo quando o tipo não tem cedente (aporte). */
  rotuloOrigem: string | null;
  /** Rótulo do lado que ENTRA. Nulo quando o tipo não tem adquirente (redução). */
  rotuloDestino: string | null;
}

/**
 * As quatro formas de mover quota. Espelha o
 * `movimentacao_quotas_tipo_check`: mexer aqui sem mexer na constraint (ou
 * o contrário) faz a gravação falhar no banco com erro de check.
 *
 * Aporte: as quotas NASCEM (origem nula) e o capital da sociedade cresce.
 * Cessão e doação: as quotas trocam de mão e o capital não muda; a diferença
 * entre as duas é o título (onerosa ou gratuita), não o efeito no quadro.
 * Redução: as quotas são CANCELADAS (destino nulo) e o capital diminui.
 */
export const FORMAS_MOVIMENTO: Record<TipoMovimento, FormaDoMovimento> = {
  aporte: {
    label: 'Aporte',
    descricao: 'As quotas nascem e o capital da sociedade cresce.',
    rotuloOrigem: null,
    rotuloDestino: 'Quem recebe as quotas',
  },
  cessao: {
    label: 'Cessão',
    descricao: 'As quotas trocam de mão a título oneroso. O capital não muda.',
    rotuloOrigem: 'Quem cede as quotas',
    rotuloDestino: 'Quem recebe as quotas',
  },
  doacao: {
    label: 'Doação',
    descricao: 'As quotas trocam de mão a título gratuito. O capital não muda.',
    rotuloOrigem: 'Quem doa as quotas',
    rotuloDestino: 'Quem recebe as quotas',
  },
  reducao: {
    label: 'Redução',
    descricao: 'As quotas são canceladas e o capital da sociedade diminui.',
    rotuloOrigem: 'De quem as quotas saem',
    rotuloDestino: null,
  },
};

export const TIPOS_MOVIMENTO = Object.keys(FORMAS_MOVIMENTO) as TipoMovimento[];

/**
 * Com o que o aporte foi pago. Só o aporte tem forma de pagamento: cessão e
 * doação movem quota que já existe, e redução cancela.
 *
 * Moeda corrente é a AUSÊNCIA das outras duas, e não uma coluna: é assim que o
 * banco guarda (ver `movimentacao_quotas_forma_pagamento_check`), e inventar uma
 * coluna faria toda linha antiga precisar de backfill para dizer o óbvio.
 */
export type FormaPagamento =
  | { tipo: 'moeda' }
  | { tipo: 'bem'; bemId: string }
  | {
      tipo: 'quotas';
      /** A PJ cujas quotas pagaram o aporte (`pago_com_empresa_pessoa_id`). */
      empresaPessoaId: string;
      /** Quantas quotas de LÁ foram entregues. */
      quotas: number;
      /** Quanto elas valiam LÁ. É este valor que a subida preserva, não a quantidade. */
      valor: number;
    };

/** O movimento que a tela monta e o hook grava. */
export interface MovimentoDeQuotas {
  tipo: TipoMovimento;
  /** Pessoa que cede. Precisa ser nula no aporte. */
  origemPessoaId: string | null;
  /** Pessoa que recebe. Precisa ser nula na redução. */
  destinoPessoaId: string | null;
  quotas: number;
  /** ISO (yyyy-mm-dd). Nula quando o consultor não sabe a data do ato. */
  dataMovimento: string | null;
  /** Só no aporte. Ausente é o mesmo que moeda corrente. */
  pagamento?: FormaPagamento | null;
  /** Ato que agrupa este lançamento, quando ele não é avulso. */
  atoId?: string | null;
  /**
   * Ordem dentro do ato. É o que permite projetar o quadro num ponto
   * INTERMEDIÁRIO da peça (ver `quadroEm`); nula no movimento avulso.
   */
  sequencia?: number | null;
}

/** Saldo de quotas de cada sócio da empresa, para as regras de saldo. */
export type SaldoPorPessoa = ReadonlyMap<string, number>;

/**
 * Por que este movimento NÃO pode ser gravado, ou `null` quando pode.
 *
 * Devolve UMA frase pronta para a tela, e não um código de erro: quem chama quer
 * dizer ao consultor o que corrigir, e a frase é a regra escrita por extenso.
 */
export function problemaDoMovimento(
  mov: MovimentoDeQuotas,
  saldo: SaldoPorPessoa,
  empresaPessoaId: string,
): string | null {
  const forma = FORMAS_MOVIMENTO[mov.tipo];
  if (!forma) return 'Escolha o tipo do movimento.';

  if (!Number.isInteger(mov.quotas) || mov.quotas < 1) {
    return 'A quantidade de quotas precisa ser um número inteiro maior que zero.';
  }

  if (forma.rotuloOrigem && !mov.origemPessoaId) return `Informe ${forma.rotuloOrigem.toLowerCase()}.`;
  if (forma.rotuloDestino && !mov.destinoPessoaId) return `Informe ${forma.rotuloDestino.toLowerCase()}.`;
  // Lado que o tipo não tem: um aporte com cedente, ou uma redução com
  // adquirente, seria outro movimento com o nome errado.
  if (!forma.rotuloOrigem && mov.origemPessoaId) return `${forma.label} não tem cedente: as quotas nascem.`;
  if (!forma.rotuloDestino && mov.destinoPessoaId) return `${forma.label} não tem adquirente: as quotas são canceladas.`;

  if (mov.origemPessoaId === empresaPessoaId || mov.destinoPessoaId === empresaPessoaId) {
    return 'A empresa não pode ser sócia de si mesma.';
  }
  if (mov.origemPessoaId && mov.origemPessoaId === mov.destinoPessoaId) {
    return 'Cedente e adquirente são a mesma pessoa: o quadro não mudaria.';
  }

  // Saldo: quem cede (ou de quem se reduz) precisa ter as quotas. Sem isso o
  // acumulado da view fica negativo, e um sócio com saldo negativo é um quadro
  // que não descreve sociedade nenhuma.
  if (mov.origemPessoaId) {
    const tem = saldo.get(mov.origemPessoaId) ?? 0;
    if (tem <= 0) return 'Quem cede não tem quotas nesta empresa.';
    if (mov.quotas > tem) {
      return `Quem cede tem ${tem.toLocaleString('pt-BR')} quota(s): não é possível mover ${mov.quotas.toLocaleString('pt-BR')}.`;
    }
  }

  const problemaPagamento = problemaDoPagamento(mov, empresaPessoaId);
  if (problemaPagamento) return problemaPagamento;

  return null;
}

/**
 * A parte da regra que fala da FORMA DE PAGAMENTO, separada porque ela é a única
 * que o macro da subida precisa checar isolada: ele monta o par espelhado sem
 * passar pelo formulário, e ainda assim não pode gravar um aporte pago com quota
 * da própria empresa.
 *
 * Espelha `movimentacao_quotas_forma_pagamento_check` e as duas irmãs dele: o
 * banco recusaria de qualquer jeito, mas com mensagem de constraint, que não diz
 * ao consultor o que corrigir.
 */
export function problemaDoPagamento(
  mov: MovimentoDeQuotas,
  empresaPessoaId: string,
): string | null {
  const pgto = mov.pagamento ?? null;
  if (!pgto) return null;

  if (mov.tipo !== 'aporte') {
    return `${FORMAS_MOVIMENTO[mov.tipo].label} não tem forma de pagamento: as quotas já existem.`;
  }

  if (pgto.tipo === 'bem') {
    return pgto.bemId ? null : 'Escolha o bem que integraliza o aporte.';
  }

  if (pgto.tipo === 'quotas') {
    if (!pgto.empresaPessoaId) return 'Escolha a sociedade cujas quotas pagam o aporte.';
    if (pgto.empresaPessoaId === empresaPessoaId) {
      return 'O aporte não pode ser pago com quota da própria sociedade.';
    }
    if (!Number.isInteger(pgto.quotas) || pgto.quotas < 1) {
      return 'A quantidade de quotas entregues precisa ser um número inteiro maior que zero.';
    }
    if (!(pgto.valor > 0)) return 'O valor das quotas entregues precisa ser maior que zero.';
  }

  return null;
}

/**
 * O valor de CAPITAL das quotas movidas, nunca o preço pago.
 *
 * A coluna `vlr_capital_arredondado` é a que a view soma em `vlr_total`: gravar
 * ali o preço de uma cessão acima do par corromperia o valor do quadro. Por isso
 * o valor não é campo de formulário: ele é as quotas ao valor nominal da casa,
 * e a tela mostra o resultado em vez de perguntar.
 */
export function capitalDoMovimento(quotas: number): number {
  return capitalDeQuotas(quotas);
}

/**
 * As quatro colunas de `movimentacao_quotas` que descrevem a forma de pagamento,
 * todas preenchidas de uma vez.
 *
 * Existe para quem GRAVA nunca precisar lembrar que "moeda corrente" é os quatro
 * nulos, nem que `bem_id` e `pago_com_empresa_pessoa_id` se excluem. O hook de
 * registro e o macro da subida passam por aqui, e é isso que os mantém contando
 * a mesma história ao banco.
 */
export interface ColunasDoPagamento {
  bem_id: string | null;
  pago_com_empresa_pessoa_id: string | null;
  pago_com_quotas: number | null;
  pago_com_valor: number | null;
}

export function colunasDoPagamento(pagamento?: FormaPagamento | null): ColunasDoPagamento {
  const vazio: ColunasDoPagamento = {
    bem_id: null,
    pago_com_empresa_pessoa_id: null,
    pago_com_quotas: null,
    pago_com_valor: null,
  };
  if (!pagamento || pagamento.tipo === 'moeda') return vazio;
  if (pagamento.tipo === 'bem') return { ...vazio, bem_id: pagamento.bemId };
  return {
    ...vazio,
    pago_com_empresa_pessoa_id: pagamento.empresaPessoaId,
    pago_com_quotas: pagamento.quotas,
    pago_com_valor: pagamento.valor,
  };
}

/**
 * A forma de pagamento LIDA de volta das colunas: o caminho inverso de
 * `colunasDoPagamento`, para quem projeta o quadro e escreve a cláusula de
 * integralização a partir do que está gravado.
 */
export function pagamentoDasColunas(colunas: Partial<ColunasDoPagamento>): FormaPagamento {
  if (colunas.pago_com_empresa_pessoa_id) {
    return {
      tipo: 'quotas',
      empresaPessoaId: colunas.pago_com_empresa_pessoa_id,
      quotas: Number(colunas.pago_com_quotas ?? 0),
      valor: Number(colunas.pago_com_valor ?? 0),
    };
  }
  if (colunas.bem_id) return { tipo: 'bem', bemId: colunas.bem_id };
  return { tipo: 'moeda' };
}
