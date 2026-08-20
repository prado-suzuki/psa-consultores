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
