import { capitalDeQuotas, quotasDeValor } from '@/lib/templates/capital';
import type { FormaPagamento } from '@/lib/osg/movimentoQuotas';
import {
  calcularParticipacoesPR,
  ratearMatriculaEntreTitulares,
  type MatriculaIntegralizacao,
} from '@/lib/templates/mapeadores';

// A proposta de aporte inicial da empresa Proprietária: o que a tela do Quadro
// Societário oferece para GRAVAR quando a empresa ainda não tem movimentação
// nenhuma. É o único lugar onde a derivação a partir dos bens sobrevive, e ela
// vira sugestão: depois de gravada, o quadro passa a ser o acumulado dos
// movimentos, e corrigir o valor contábil de um bem não mexe mais no capital
// sozinho (capital registrado só muda por alteração contratual).

/** Um movimento de aporte a gravar: um por bem que o sócio integraliza. */
export interface AporteProposto {
  pessoaId: string;
  denominacao: string;
  /** Bem aportado. Nulo quando a matrícula não veio ligada a um bem. */
  bemId: string | null;
  quotas: number;
  /** R$ — segue as quotas (capitalDeQuotas), nunca o rateio bruto. */
  valor: number;
}

export interface PropostaAporteInicial {
  /** Na ordem de participação DECRESCENTE, e dentro do sócio na ordem dos bens. */
  aportes: AporteProposto[];
  /**
   * Denominações de titular sem pessoa cadastrada. Enquanto houver uma, a
   * proposta não pode ser gravada: `destino_pessoa_id` é FK, e materializar só
   * a parte cadastrada produziria quadro incompleto, que vira contrato errado.
   */
  titularesLegados: string[];
  /** Σ quotas da proposta — o capital que a sociedade passa a ter registrado. */
  totalQuotas: number;
}

/**
 * Abre o quadro derivado da PR em movimentos de aporte, um por (sócio, bem).
 *
 * O total de cada sócio é o de `calcularParticipacoesPR`, sem recontar nada: é
 * ele que a tela mostra hoje e que o gerador imprime no preâmbulo, e a troca de
 * fonte só é segura se o gravado reproduzir o derivado EXATAMENTE. A abertura
 * por bem usa o mesmo rateio (`ratearMatriculaEntreTitulares`) e distribui as
 * quotas do sócio pelos bens dele por soma acumulada arredondada, que fecha por
 * construção: Σ quotas por bem === quotas do sócio, sem resíduo e sem parcela
 * negativa.
 *
 * A ordem importa e é a de participação decrescente, porque é a ordem em que os
 * sócios saem hoje no preâmbulo da PR; quem grava precisa carimbar `created_at`
 * distinto e crescente nesta ordem, senão a ordem do quadro fica indeterminada
 * (ver `useGravarAporteInicial`).
 */
export function proporAportesIniciais(
  matriculas: MatriculaIntegralizacao[],
): PropostaAporteInicial {
  const participacoes = calcularParticipacoesPR(matriculas);
  const titularesLegados = [
    ...new Set(participacoes.filter((p) => !p.pessoaId).map((p) => p.denominacao)),
  ];
  const totalQuotas = participacoes.reduce((s, p) => s + p.quotas, 0);

  if (participacoes.length === 0 || titularesLegados.length > 0) {
    return { aportes: [], titularesLegados, totalQuotas };
  }

  // Centavos de cada sócio em cada bem. Um bem pode ter mais de uma matrícula,
  // e elas se somam: o movimento é por bem aportado, não por matrícula.
  const centPorPessoa = new Map<string, Map<string | null, number>>();
  for (const m of matriculas) {
    const centDe = ratearMatriculaEntreTitulares(m);
    if (centDe == null) continue;
    for (const [titular, cent] of centDe) {
      if (!titular.pessoaId) continue;
      let porBem = centPorPessoa.get(titular.pessoaId);
      if (!porBem) {
        porBem = new Map();
        centPorPessoa.set(titular.pessoaId, porBem);
      }
      const bemId = m.bemId ?? null;
      porBem.set(bemId, (porBem.get(bemId) ?? 0) + cent);
    }
  }

  const aportes: AporteProposto[] = [];
  for (const p of participacoes) {
    const porBem = [...(centPorPessoa.get(p.pessoaId!) ?? new Map<string | null, number>())];
    const totalCent = porBem.reduce((s, [, cent]) => s + cent, 0);
    if (porBem.length === 0) continue;

    // Soma acumulada arredondada: a última parcela é o que falta para o total
    // por definição, e nenhuma parcela sai negativa porque o acumulado só cresce.
    let centAcumulado = 0;
    let quotasAcumuladas = 0;
    for (const [bemId, cent] of porBem) {
      centAcumulado += cent;
      const ateAqui = totalCent > 0 ? Math.round((p.quotas * centAcumulado) / totalCent) : 0;
      const quotas = ateAqui - quotasAcumuladas;
      quotasAcumuladas = ateAqui;
      if (quotas === 0) continue;
      aportes.push({
        pessoaId: p.pessoaId!,
        denominacao: p.denominacao,
        bemId,
        quotas,
        valor: capitalDeQuotas(quotas),
      });
    }
  }

  return { aportes, titularesLegados, totalQuotas };
}

// --- Segunda rodada: o aumento de capital depois da constituição -------------
//
// A proposta acima é a da CONSTITUIÇÃO, e ela some assim que o quadro é gravado:
// daí em diante o quadro é o acumulado do livro, e o Diagnóstico Patrimonial
// deixa de ser olhado. Isso está certo para o capital, e deixava sem porta de
// entrada o imóvel aprovado DEPOIS do registro do contrato social — ele ficava
// `Aprovado` para sempre, e a alteração contratual seguinte não tinha aporte
// pendente nenhum de que derivar o aumento de capital.
//
// `proporAumentoDeCapital` é essa porta. Ela reusa o rateio da constituição sem
// mudança e acrescenta duas coisas: o FILTRO dos bens que já estão no livro (o
// critério que se autocorrige, sem carimbo de data) e a MESCLAGEM da parcela em
// moeda corrente que o sócio integraliza junto, que é como a cláusula real
// mistura as duas formas na mesma subscrição.

/** Um lançamento do aumento: um por coisa aportada (um imóvel, ou a moeda). */
export interface LancamentoDoAumento {
  pessoaId: string;
  denominacao: string;
  quotas: number;
  /** `{ tipo: 'bem' }` no imóvel, `{ tipo: 'moeda' }` na parcela em dinheiro. */
  pagamento: FormaPagamento;
}

export interface PropostaAumentoDeCapital {
  /**
   * ORDENADO: por sócio, e dentro do sócio os imóveis dele seguidos da parcela
   * em moeda. É a ordem em que o contrato de referência descreve a subscrição, e
   * é a ordem em que as alíneas de {{#integralizacoes}} saem — `useAportesDoLivro`
   * lê o livro por `created_at` e depois `sequencia`, então quem grava só precisa
   * preservar esta ordem (ver `useGravarAumentoDeCapital`).
   */
  lancamentos: LancamentoDoAumento[];
  /** Igual à constituição: enquanto houver um, nada pode ser gravado. */
  titularesLegados: string[];
  /** Σ quotas dos lançamentos — o DELTA do capital, não o capital resultante. */
  totalQuotas: number;
}

/**
 * As matrículas cujos bens ainda não entraram no capital.
 *
 * O critério é o mais preciso disponível e não depende de data: bem elegível
 * (o que `useIntegralizacoesAprovadas` já filtra) e sem nenhuma linha no livro.
 * Cobre com uma regra só o imóvel adquirido depois da constituição e o que ficou
 * de fora dela por atraso de matrícula.
 */
export function matriculasForaDoLivro(
  matriculas: MatriculaIntegralizacao[],
  bensNoLivro: ReadonlySet<string>,
): MatriculaIntegralizacao[] {
  return matriculas.filter((m) => !(m.bemId && bensNoLivro.has(m.bemId)));
}

/**
 * Quantos IMÓVEIS estas matrículas representam.
 *
 * Um bem pode ter mais de uma matrícula, e elas se somam num aporte só (é a
 * mesma regra de `proporAportesIniciais`). O consultor conta imóveis, não
 * matrículas, então é este número que a tela mostra.
 */
export function contarImoveis(matriculas: MatriculaIntegralizacao[]): number {
  return new Set(matriculas.map((m) => m.bemId ?? `matricula:${m.id}`)).size;
}

/**
 * A proposta do AUMENTO de capital: os imóveis novos rateados entre os titulares
 * deles, mais a parcela em moeda corrente digitada por sócio.
 *
 * Um lançamento por coisa aportada, e não um por sócio: é isso que faz as
 * alíneas do instrumento ENUMERAREM em vez de somarem, e é a regra que o resto
 * do sistema já assume.
 *
 * Com `bensNoLivro` e `moedaPorPessoaId` vazios, a proposta é bit a bit a da
 * constituição — o teste amarra isso, porque é o que garante que a segunda
 * rodada não tenha uma segunda aritmética.
 */
export function proporAumentoDeCapital(args: {
  matriculas: MatriculaIntegralizacao[];
  /** `bem_id` que já têm movimento no livro desta empresa. */
  bensNoLivro: ReadonlySet<string>;
  /** Reais por sócio. Ausente, zero ou menos de uma quota não gera lançamento. */
  moedaPorPessoaId: Readonly<Record<string, number>>;
  /**
   * Nome de quem só entra pela moeda (sócio do quadro que reforça em dinheiro e
   * não tem imóvel novo). Quem integraliza imóvel tem o nome vindo do rateio.
   */
  denominacaoPorPessoaId?: Readonly<Record<string, string>>;
}): PropostaAumentoDeCapital {
  const { matriculas, bensNoLivro, moedaPorPessoaId, denominacaoPorPessoaId = {} } = args;

  const dosImoveis = proporAportesIniciais(matriculasForaDoLivro(matriculas, bensNoLivro));

  // Quotas da parcela em moeda pela MESMA regra do rateio dos imóveis: a quota é
  // indivisível, e R$ 95.209,23 vira 95.209 quotas (ver capital.ts). Lançamento
  // de zero quota fica de fora: seria alínea vazia no instrumento.
  const quotasEmMoeda = new Map<string, number>();
  for (const [pessoaId, reais] of Object.entries(moedaPorPessoaId)) {
    if (!(reais > 0)) continue;
    const quotas = quotasDeValor(reais);
    if (quotas <= 0) continue;
    quotasEmMoeda.set(pessoaId, quotas);
  }

  const totalQuotas =
    dosImoveis.totalQuotas + [...quotasEmMoeda.values()].reduce((s, q) => s + q, 0);

  if (dosImoveis.titularesLegados.length > 0) {
    return { lancamentos: [], titularesLegados: dosImoveis.titularesLegados, totalQuotas };
  }

  const lancamentos: LancamentoDoAumento[] = [];
  const emitirMoeda = (pessoaId: string, denominacao: string) => {
    const quotas = quotasEmMoeda.get(pessoaId);
    if (quotas == null) return;
    quotasEmMoeda.delete(pessoaId);
    lancamentos.push({ pessoaId, denominacao, quotas, pagamento: { tipo: 'moeda' } });
  };

  // Os aportes vêm agrupados por sócio (um bloco por participação): a parcela em
  // moeda do sócio sai quando o bloco dele fecha, logo depois dos imóveis dele.
  let socioCorrente: { pessoaId: string; denominacao: string } | null = null;
  for (const a of dosImoveis.aportes) {
    if (socioCorrente && socioCorrente.pessoaId !== a.pessoaId) {
      emitirMoeda(socioCorrente.pessoaId, socioCorrente.denominacao);
    }
    socioCorrente = { pessoaId: a.pessoaId, denominacao: a.denominacao };
    lancamentos.push({
      pessoaId: a.pessoaId,
      denominacao: a.denominacao,
      quotas: a.quotas,
      // Matrícula sem bem vinculado não tem o que carimbar em `bem_id`, e cai nas
      // mesmas quatro colunas nulas da moeda — que é como o banco a guardaria de
      // qualquer jeito (ver `colunasDoPagamento`).
      pagamento: a.bemId ? { tipo: 'bem', bemId: a.bemId } : { tipo: 'moeda' },
    });
  }
  if (socioCorrente) emitirMoeda(socioCorrente.pessoaId, socioCorrente.denominacao);

  // Sócio que só reforça em dinheiro: depois de quem integraliza imóvel, do maior
  // para o menor, que é a mesma ordem de participação decrescente do rateio.
  const soMoeda = [...quotasEmMoeda.entries()].sort(
    (a, z) => z[1] - a[1] || a[0].localeCompare(z[0]),
  );
  for (const [pessoaId, quotas] of soMoeda) {
    lancamentos.push({
      pessoaId,
      denominacao: denominacaoPorPessoaId[pessoaId] ?? '—',
      quotas,
      pagamento: { tipo: 'moeda' },
    });
  }

  return { lancamentos, titularesLegados: [], totalQuotas };
}
