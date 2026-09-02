// O quadro da simulação: quem doa, quem recebe, e o que cada um fica tendo.
//
// Colunas, na ordem:
//
//   Pessoa · Papel · Quotas · Part. atual · Legítima · Disponível ·
//   Quotas final · Part. final
//
// A DOAÇÃO SE MEDE PELO QUE OS DONATÁRIOS RECEBEM. Não existe campo de "quanto se
// doa": quem não quer doar tudo simplesmente não destina toda a legítima e toda a
// disponível, e o que não foi destinado permanece com quem doa. Havia um campo para
// isso, e era o mesmo número dito duas vezes — o analista tinha de saber qual dos dois
// mandava.
//
// CAMPOS LIVRES, POR DECISÃO DA OSG. A legítima não é calculada aqui, e não é
// travada: na prática ela depende de quanto a pessoa quer doar e do que o sistema da
// SEFAZ aponta na hora da guia, então a OSG nunca sabe o número de antemão. Quem
// declara é o analista, e o mesmo vale para a disponível.
//
// Os casos também não caem num molde: irmã para irmã, avô para netos, cônjuge para
// cônjuge. Não há "herdeiro necessário" a inferir do cadastro para liberar ou barrar
// a coluna de legítima — qualquer donatário pode receber de qualquer parte.
//
// A CONFERÊNCIA É A ÚLTIMA LINHA REPETIR A PRIMEIRA COLUNA: soma das participações
// finais = soma das quotas atuais, sempre. Nada se cria nem se perde dentro de um ato
// de doação — o capital só muda de mão. É por isso que a participação final do doador
// desconta o que os donatários LEVAM, e não o que ele poderia dar: quota que não foi
// destinada não saiu do lugar.
//
// AS ÚNICAS TRAVAS SÃO AS LÓGICAS, as que descrevem impossibilidade e não política:
//
//   os donatários não levam mais quotas do que os doadores têm;
//   a mesma pessoa não entra duas vezes.
//
// DENTRO DE UMA SIMULAÇÃO, doador é doador e não recebe nada. Arranjos como "as irmãs
// se igualam entre si antes de os pais doarem" são DUAS simulações — cenários
// diferentes do mesmo caso —, e não uma pessoa nos dois papéis ao mesmo tempo.

import { repartirProporcional } from './rateioDoAto';

export type Papel = 'doa' | 'recebe';

const naoNegativo = (v: bigint) => (v > 0n ? v : 0n);

export interface ParticipanteDoQuadro {
  pessoaId: string;
  nome: string;
  papel: Papel;
  /**
   * Quotas que a pessoa tem hoje na sociedade — vêm do quadro societário e não se
   * digitam. No doador são também o teto do que ele pode dar.
   */
  quotasAtuais: bigint;
  /**
   * DONATÁRIO: quotas que recebe da parte LEGÍTIMA. Declarado, sem teto: quem decide
   * é o analista, e o número só se confirma na guia.
   */
  legitima: bigint;
  /** DONATÁRIO: quotas que recebe da parte DISPONÍVEL. Declarado, sem teto. */
  disponivel: bigint;
}

export interface LinhaDoQuadro extends ParticipanteDoQuadro {
  /** Participação atual em %, 4 casas. */
  pctAtual: string;
  /** legítima + disponível. Derivado: é a soma do que foi declarado. */
  recebido: bigint;
  /**
   * DOADOR: o que de fato SAIU dele — a fatia do que os donatários levam, proporcional
   * ao que ele tem. Doar não é o mesmo que poder dar.
   */
  transmitido: bigint;
  /** DOADOR: quotasAtuais − transmitido. DONATÁRIO: quotasAtuais + recebido. */
  participacaoFinal: bigint;
  pctFinal: string;
}

export interface TotaisDoQuadro {
  quotasAtuais: bigint;
  legitima: bigint;
  disponivel: bigint;
  recebido: bigint;
  transmitido: bigint;
  /** Fecha com `quotasAtuais`, sempre. É a conferência do quadro. */
  participacaoFinal: bigint;
  /**
   * Quotas dos doadores menos o que os donatários levam. Positivo = os doadores
   * poderiam dar mais, e o resto permanece com eles — é assim que se doa parcial.
   * Negativo é impossível e vira trava.
   */
  sobra: bigint;
  /**
   * Soma dos percentuais, com 4 casas, sobre o capital da sociedade.
   *
   * As duas linhas de total leem o MESMO número, porque o ato não cria nem destrói
   * quota. Elas leem 100% quando todo o capital está na tabela; com sócio de fora, o
   * número é a fatia que este ato movimenta — menor que 100% é o normal, não erro.
   */
  pctAtual: string;
  pctFinal: string;
}

export interface EntradaDoQuadro {
  participantes: ParticipanteDoQuadro[];
  /** Universo de quotas da sociedade — divisor dos percentuais. */
  totalDeQuotas: bigint;
}

/**
 * Trava: descreve uma impossibilidade, não uma política. Só entra aqui o que não
 * pode existir — levar quota que ninguém tem, a mesma pessoa duas vezes.
 */
export interface ProblemaDoQuadro {
  codigo: 'distribuido-passa-do-doado' | 'pessoa-repetida';
  mensagem: string;
}

/** Percentual com 4 casas, meio para cima, sem passar por `number`. */
function pct(parte: bigint, total: bigint): string {
  if (total <= 0n) return '0.0000';
  const escalado = (parte * 100n * 10_000n * 2n + total) / (total * 2n);
  const inteiro = escalado / 10_000n;
  const fracao = (escalado % 10_000n).toString().padStart(4, '0');
  return `${inteiro}.${fracao}`;
}

const br = (q: bigint) => q.toLocaleString('pt-BR');

export function montarQuadro(entrada: EntradaDoQuadro): {
  linhas: LinhaDoQuadro[];
  totais: TotaisDoQuadro;
  problemas: ProblemaDoQuadro[];
} {
  const { participantes, totalDeQuotas } = entrada;

  // O QUE SAI DE CADA DOADOR é a fatia do que os donatários levam, proporcional ao
  // que cada um tem. Ninguém "escolhe" o quanto dá: o tamanho do ato é a soma do que
  // se destinou, e ele se reparte entre os doadores na razão dos blocos deles.
  const doadoresDoQuadro = participantes.filter((p) => p.papel === 'doa');
  const podeDar = doadoresDoQuadro.reduce((a, p) => a + naoNegativo(p.quotasAtuais), 0n);
  const levado = participantes.reduce(
    (a, p) => a + (p.papel === 'doa' ? 0n : p.legitima + p.disponivel), 0n,
  );
  const transmitidoPorDoador = new Map<string, bigint>();
  if (levado > 0n && podeDar > 0n) {
    const fatias = repartirProporcional(
      levado < podeDar ? levado : podeDar,
      doadoresDoQuadro.map((p) => naoNegativo(p.quotasAtuais)),
    );
    doadoresDoQuadro.forEach((p, i) => transmitidoPorDoador.set(p.pessoaId, fatias[i]));
  }

  const linhas = participantes.map<LinhaDoQuadro>((p) => {
    const doa = p.papel === 'doa';
    const legitima = doa ? 0n : p.legitima;
    const disponivel = doa ? 0n : p.disponivel;
    const recebido = legitima + disponivel;
    const transmitido = doa ? transmitidoPorDoador.get(p.pessoaId) ?? 0n : 0n;
    const participacaoFinal = p.quotasAtuais - transmitido + recebido;

    return {
      ...p,
      legitima,
      disponivel,
      recebido,
      transmitido,
      pctAtual: pct(p.quotasAtuais, totalDeQuotas),
      participacaoFinal,
      pctFinal: pct(participacaoFinal, totalDeQuotas),
    };
  });

  const somar = (f: (l: LinhaDoQuadro) => bigint) => linhas.reduce((a, l) => a + f(l), 0n);

  const totais: TotaisDoQuadro = {
    quotasAtuais: somar((l) => l.quotasAtuais),
    legitima: somar((l) => l.legitima),
    disponivel: somar((l) => l.disponivel),
    recebido: levado,
    transmitido: somar((l) => l.transmitido),
    participacaoFinal: somar((l) => l.participacaoFinal),
    sobra: podeDar - levado,
    // Somados dos TOTAIS, nunca dos percentuais das linhas: somar arredondamentos de
    // 4 casas daria 99,9999% num quadro que fecha.
    pctAtual: pct(somar((l) => l.quotasAtuais), totalDeQuotas),
    pctFinal: pct(somar((l) => l.participacaoFinal), totalDeQuotas),
  };

  const problemas: ProblemaDoQuadro[] = [];

  // A trava que a OSG nomeou: legítima + disponível não passa do que os doadores têm.
  // O contrário — destinar menos — é como se doa parcial, e sai como sobra.
  if (levado > podeDar) {
    problemas.push({
      codigo: 'distribuido-passa-do-doado',
      mensagem: `Os donatários levam ${br(levado)} quotas e os doadores têm `
        + `${br(podeDar)}. Ninguém recebe o que não foi doado.`,
    });
  }

  const vistos = new Set<string>();
  const repetida = linhas.find((l) => {
    if (l.pessoaId === '') return false;
    if (vistos.has(l.pessoaId)) return true;
    vistos.add(l.pessoaId);
    return false;
  });
  if (repetida) {
    problemas.push({
      codigo: 'pessoa-repetida',
      mensagem: `${repetida.nome} aparece duas vezes na lista. Cada pessoa entra uma `
        + 'vez, com um papel.',
    });
  }

  return { linhas, totais, problemas };
}
