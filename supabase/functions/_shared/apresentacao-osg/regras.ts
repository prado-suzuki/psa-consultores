/**
 * As regras que decidem o que ENTRA na apresentacao da OSG — e o que dizer
 * quando algo fica de fora.
 *
 * ## Por que existe este arquivo
 *
 * Ate 09/2026 estas decisoes moravam dentro das funcoes de `data.ts`, no meio das
 * queries. Duas consequencias, e as duas doeram:
 *
 * 1. NAO TINHAM TESTE. Sao ~14 regras que decidem o que o cliente ve num .pptx, e
 *    a unica rede era o baseline ponta a ponta — que pega regressao mas so diz "o
 *    deck mudou", nunca qual regra caiu.
 * 2. ERAM MUDAS. Cada `continue` e cada `return null` tirava uma empresa, uma
 *    matricula ou um socio do deck sem registrar nada. Quem apresentava descobria
 *    na reuniao, com o cliente na frente.
 *
 * Aqui elas sao funcoes puras: recebem dado, devolvem decisao + motivo. `data.ts`
 * so busca e delega. E o mesmo arranjo que o gerador tributario ja usa em
 * `_shared/planejamento-tributario/slides.ts`, e pelo mesmo motivo: Deno nao
 * alcanca `src/`, entao codigo puro de Edge Function mora em `_shared` para o
 * vitest poder rodar em cima dele.
 *
 * ## O vocabulario
 *
 * `origem`     — falta dado no cadastro. O conserto e no OSG Work.
 * `formatacao` — o dado existe e a diagramacao nao coube.
 *
 * E o mesmo do gerador tributario, de proposito: a tela junta os dois num aviso
 * so, e nao teria como se cada um falasse uma lingua.
 */

/*
 * O tipo e o `anota` sao COMPARTILHADOS com o gerador tributario, em
 * `_shared/apresentacao/problema.ts`. Estavam declarados nos dois lados e ja tinham
 * divergido — o dele com `onde`, este sem. Como a Biblioteca junta os avisos dos
 * dois num aviso so, duas definicoes eram duas linguas no mesmo paragrafo.
 */
export { anota } from "../apresentacao/problema.ts";
export type { ProblemaDoDeck, Probs } from "../apresentacao/problema.ts";

/** As partes do deck da OSG para o campo `onde`, pelo qual a tela agrupa os avisos. */
export const ONDE = {
  patrimonial: "Diagnóstico Patrimonial",
  quadro: "Quadro Societário",
  organograma: "Organograma",
} as const;

/** "1 imovel" / "3 imoveis" — o relato e lido por humano, entao concorda. */
export const plural = (n: number, um: string, varios: string): string =>
  `${n} ${n === 1 ? um : varios}`;

// ---------------------------------------------------------------------------
// Empresa no quadro societario
// ---------------------------------------------------------------------------

export type TipoDeEmpresa = "CN" | "PR" | "SC" | "OUTRO" | "AUSENTE";

/** Normaliza o campo livre `pessoa.tipo_empresa`, que aceita nulo e caixa mista. */
export function lerTipoDeEmpresa(bruto: string | null | undefined): TipoDeEmpresa {
  const t = String(bruto ?? "").trim().toUpperCase();
  if (t === "") return "AUSENTE";
  if (t === "CN" || t === "PR" || t === "SC") return t;
  return "OUTRO";
}

/**
 * Por que esta empresa nao tem quadro para mostrar.
 *
 * TRES CAUSAS DIFERENTES, e o primeiro relato que escrevi juntou as tres numa
 * frase so ("sem linha de socio apurada"). Quem lesse aquilo iria procurar socio,
 * quando o problema costuma ser o `tipo_empresa` em branco. Informacao errada e
 * pior que silencio, entao cada causa tem a sua.
 *
 * `null` = a empresa tem quadro e entra no deck.
 */
export function motivoDoQuadroAusente(args: {
  denominacao: string;
  tipo: TipoDeEmpresa;
  temQuadroGravado: boolean;
  linhasApuradas: number;
  /** Houve lancamento em `movimentacao_quotas`, mesmo que a view tenha zerado tudo. */
  houveMovimento?: boolean;
}): string | null {
  const { denominacao, tipo, temQuadroGravado, linhasApuradas, houveMovimento } = args;

  if (tipo === "SC") {
    return `"${denominacao}" não entra no quadro societário: está marcada como sócia (SC), não como sociedade do cliente.`;
  }
  if (tipo === "AUSENTE") {
    return `"${denominacao}" ficou fora do quadro societário: o campo "tipo de empresa" está vazio no cadastro (esperado CN ou PR).`;
  }
  if (linhasApuradas > 0) return null;

  if (tipo === "CN") {
    // "Nenhuma movimentacao lancada" seria MENTIRA quando existem movimentos que
    // se anularam: a view corta saldo zero e devolve vazio do mesmo jeito que
    // devolveria para uma empresa sem nenhum lancamento. As duas situacoes pedem
    // acoes opostas — lancar o quadro, ou conferir por que tudo zerou.
    return houveMovimento
      ? `"${denominacao}" é constituída (CN) e o quadro saiu vazio: há movimentação de quotas lançada, mas os saldos se anulam.`
      : `"${denominacao}" é constituída (CN) e ainda não tem quadro societário gravado — nenhuma movimentação de quotas lançada.`;
  }
  return temQuadroGravado
    ? `"${denominacao}" é a integralizar (PR) e o quadro gravado ficou sem linhas após a apuração.`
    : `"${denominacao}" é a integralizar (PR) e não foi possível derivar o quadro dos bens dela.`;
}

// ---------------------------------------------------------------------------
// Empresa e socio no organograma
// ---------------------------------------------------------------------------

export type FaixaDoOrganograma = "controladoras" | "controladas";

/** Em que faixa a empresa entra. `null` = nao entra em nenhuma. */
export function faixaDaEmpresa(tipo: TipoDeEmpresa): FaixaDoOrganograma | null {
  if (tipo === "CN") return "controladoras";
  if (tipo === "PR") return "controladas";
  return null;
}

/**
 * Por que a empresa nao aparece no organograma.
 *
 * DIFERENTE do quadro: uma SC fora do quadro e correto e esperado (ela e socia,
 * aparece na faixa de socios), mas fora do organograma inteiro nao — e por isso o
 * relato aqui so existe para quem deveria ter faixa e nao teve.
 */
export function motivoForaDoOrganograma(denominacao: string, tipo: TipoDeEmpresa): string | null {
  if (faixaDaEmpresa(tipo) !== null) return null;
  if (tipo === "SC") return null; // socia: o lugar dela e a faixa de socios
  return `"${denominacao}" não aparece no organograma: sem "tipo de empresa" (CN ou PR) não há faixa onde posicioná-la.`;
}

/** So PF e socia (SC) entram na faixa "Socios"; o resto ja aparece em outra faixa. */
export function socioEntraNaFaixa(tipoPessoa: string | null, tipoEmpresa: string | null): boolean {
  const tp = String(tipoPessoa ?? "").trim().toUpperCase();
  const te = String(tipoEmpresa ?? "").trim().toUpperCase();
  return tp === "PF" || te === "SC";
}

// ---------------------------------------------------------------------------
// Bem e matricula no quadro derivado (PR)
// ---------------------------------------------------------------------------

/**
 * O quadro derivado le SO bem com `status_integralizacao = 'Aprovado'`.
 *
 * E regra de negocio correta — bem pendente nao virou quota —, mas era muda: um
 * cliente com tudo "Em analise" gerava quadro vazio e a tela dizia que estava
 * tudo bem.
 */
export const STATUS_QUE_INTEGRALIZA = "Aprovado";

export function bemIntegraliza(status: string | null | undefined): boolean {
  return String(status ?? "").trim() === STATUS_QUE_INTEGRALIZA;
}

export type MotivoDaMatricula = "impedimento" | "sem_valor" | "sem_titular" | null;

/**
 * Por que a matricula nao entra na apuracao do quadro derivado.
 *
 * A ORDEM IMPORTA e espelha a do codigo: impedimento primeiro (regra), depois
 * valor, depois titular. Uma matricula impedida E sem valor e relatada como
 * impedida, que e a causa que o consultor resolve primeiro.
 */
export function motivoDaMatriculaFora(args: {
  temImpedimentoAtivo: boolean;
  valor: number | null;
  totalDeTitulares: number;
}): MotivoDaMatricula {
  if (args.temImpedimentoAtivo) return "impedimento";
  if (args.valor == null || !Number.isFinite(args.valor)) return "sem_valor";
  if (args.totalDeTitulares === 0) return "sem_titular";
  return null;
}

/** O impedimento so vale enquanto nao cancelado. */
export function temImpedimentoAtivo(impedimentos: Array<{ cancelado?: unknown }> | null | undefined): boolean {
  return (impedimentos ?? []).some((i) => i && i.cancelado !== true);
}

/** Uma frase por motivo, agrupada por empresa — nao uma linha por matricula. */
export function relatoDasMatriculas(denominacao: string, motivos: MotivoDaMatricula[]): string[] {
  const conta = (m: MotivoDaMatricula) => motivos.filter((x) => x === m).length;
  const saida: string[] = [];
  const semValor = conta("sem_valor");
  const semTitular = conta("sem_titular");

  /* Matricula com impedimento ativo fica fora do quadro por regra; nao e dado faltando, e nao avisa. */
  if (semValor > 0) {
    saida.push(`${plural(semValor, "matrícula ficou", "matrículas ficaram")} fora do quadro de "${denominacao}": sem valor contábil na matrícula nem no bem.`);
  }
  if (semTitular > 0) {
    saida.push(`${plural(semTitular, "matrícula ficou", "matrículas ficaram")} fora do quadro de "${denominacao}": nenhum titular vinculado.`);
  }
  return saida;
}

// ---------------------------------------------------------------------------
// Percentuais
// ---------------------------------------------------------------------------

/**
 * Com total de quotas zerado, todo percentual vira `NaN` e o `fmtPct` imprime
 * "—" em TODAS as linhas. O quadro sai parecendo dado faltando, linha a linha,
 * quando o que faltou foi um numero so.
 *
 * Acontece quando os movimentos de quota se anulam: a view `v_quadro_societario`
 * corta socio com saldo zero (`HAVING sum(quotas) <> 0`), mas saldos de sinais
 * opostos ainda somam zero no total da empresa.
 */
export function percentuaisSaemVazios(totalQuotas: number): boolean {
  return !(totalQuotas > 0);
}

export function relatoDePercentualVazio(denominacao: string): string {
  return `O quadro de "${denominacao}" sai com todos os percentuais em "—": o total de quotas apurado é zero.`;
}

/*
 * NAO EXISTE AVISO DE "SOCIO ZERADO", e a ausencia e deliberada.
 *
 * `v_quadro_societario` termina em `HAVING sum(quotas) <> 0`, entao quem entrou
 * com 100 quotas e cedeu as 100 e cortado dentro da view. Houve uma versao deste
 * arquivo que comparava a view com `movimentacao_quotas` para denunciar esses
 * sumicos.
 *
 * Estava errado: **o quadro societario e ESTADO FINAL, em todo o sistema.** A
 * tela `QuadroSocietario` le a mesma view, entao o ex-socio nao aparece no
 * cadastro tampouco — nao ha discrepancia entre o deck e a tela para explicar. O
 * aviso anunciava comportamento correto, que e o mesmo criterio que ja exclui a
 * socia (SC) sem faixa no organograma.
 *
 * O que sobrou disso e o `houveMovimento` do `motivoDoQuadroAusente`: quadro
 * INTEIRO vazio com movimentos lancados e outra coisa, e essa sim e anomalia.
 */
