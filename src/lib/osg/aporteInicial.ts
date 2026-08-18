import { capitalDeQuotas } from '@/lib/templates/capital';
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
