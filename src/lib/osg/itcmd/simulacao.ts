// Orquestração dos seis passos do FLUXO (docs/osg/sucessao/Relatorios/
// FLUXO-calculo-itcmd.md §2). Entram os totais do acervo por cenário, o universo
// de quotas da sociedade e as quotas que cada doador transmite a cada donatário;
// sai uma apuração por par doador × donatário, mais o rollup por donatário.
//
// A UNIDADE DE APURAÇÃO É O PAR DOADOR × DONATÁRIO, e não o donatário.
//
//   Manual da GIA ITCD-e Doação/Outros (SEFAZ/MT, 2025), págs. 9 e 16: "cada um
//   dos doadores deve preencher uma GIA-ITCD-e referente à sua respectiva parte,
//   conforme previsto pelo regime matrimonial". Uma GIA por doador, cada uma com
//   sua própria progressividade.
//
// Isso NÃO é detalhe de forma. A tabela é progressiva, então somar as parcelas de
// dois doadores numa base única empurra o donatário para uma faixa mais alta e
// cobra imposto a mais. Num caso real de dez/2025 (dois doadores, duas donatárias,
// acervo de R$ 9,5 mi) a base combinada dá R$ 605.925,68 e as quatro GIAs
// efetivamente emitidas somaram R$ 485.193,66 — R$ 120.732,02 de diferença.
//
// Quem é doador é pergunta FISCAL, não societária: a titularidade sai do quadro,
// mas o cônjuge meeiro doa a parte dele mesmo sem constar como sócio. A divisão
// não é derivável daqui e entra como aresta declarada — ver `EntradaDoacao`.
//
// O que este módulo NÃO faz (SPEC §1 e spec 01 §2.5): não aplica fator de
// usufruto — a base é sempre integral —, não calcula Patrimônio Líquido
// Ajustado, não equaliza participação final, não deriva valor de mercado de
// produtividade por hectare, não decide a meação, não lê banco e não conhece
// React.
//
// Fronteira pública em `string` decimal: `bigint` é detalhe interno (§2.3).

import {
  CENTAVO,
  divArredondado,
  formatMoney,
  parseInteiro,
  parseMoney,
  quantizar2,
  ZERO,
  type Money,
} from '@/lib/osg/itcmd/dinheiro';
import { devidoDoAto } from '@/lib/osg/itcmd/acumulacao';

export type Cenario = 'contabil' | 'itr' | 'mercado';

export const CENARIOS: readonly Cenario[] = ['contabil', 'itr', 'mercado'];

export const ROTULO_CENARIO: Record<Cenario, string> = {
  contabil: 'Valor contábil',
  itr: 'Valor de ITR',
  mercado: 'Valor de mercado',
};

/**
 * DE ONDE VEM CADA RÉGUA. Mora ao lado do rótulo porque é a mesma explicação na tela de
 * montagem, na de leitura e na lista: três cópias divergiriam.
 */
export const DICA_CENARIO: Record<Cenario, string> = {
  contabil: 'O acervo pelo valor contábil dos imóveis, que é o que está registrado na '
    + 'contabilidade da sociedade.',
  itr: 'O acervo pelo valor declarado no ITR das matrículas, que o cliente já declara '
    + 'à Receita.',
  mercado: 'O acervo pelo valor de mercado das matrículas. Só existe quando alguém '
    + 'preencheu esse valor no Diagnóstico Patrimonial.',
};

export interface EntradaPessoa {
  id: string;
  nome: string;
}

/**
 * Uma aresta doador → donatário. É a unidade da apuração e corresponde a uma
 * linha de beneficiário dentro da GIA daquele doador.
 */
export interface EntradaDoacao {
  doadorId: string;
  donatarioId: string;
  /** Quotas que este doador transmite a este donatário — inteiro, em string. */
  quotasRecebidas: string;
  /**
   * Base que este donatário já recebeu DESTE MESMO DOADOR NO MESMO ANO CIVIL,
   * declarada pelo analista. `null` = nenhuma.
   *
   * O trio doador · beneficiário · ano civil é o que a Lei 10.488/2016, arts. 3º e
   * 5º, manda acumular, e é por isso que o campo mora na ARESTA e não no
   * donatário: doação de outro doador entra numa apuração separada, e pendurar
   * uma única "doação anterior" no donatário a somaria na faixa errada.
   *
   * Nunca derivada do quadro societário: ele é foto do estado, não histórico, e
   * deduzir dele conta duas vezes (SPEC §4 e negativo N5).
   */
  doacaoAnterior: string | null;
}

export interface EntradaSimulacao {
  /**
   * Competência da UPF (`AAAA-MM`). É RÓTULO do retrato, não fonte do valor: quem
   * manda é `upf`. Serve para a simulação dizer de que mês ela é.
   */
  competencia: string;
  /**
   * Valor da UPF em reais, DIGITADO pelo analista. Entra como dado, nunca é
   * buscado em série interna — a UPF é publicada mensalmente pela SEFAZ/MT e
   * qualquer lista embutida no código envelhece e trava a apuração do mês novo.
   */
  upf: string;
  /** Universo de quotas da sociedade. */
  totalDeQuotas: string;
  /** Total do acervo em cada cenário. `null` = cenário sem valor informado. */
  totaisDoAcervo: Record<Cenario, string | null>;
  /** Doadores FISCAIS do ato — um por GIA, cônjuge meeiro incluído. */
  doadores: EntradaPessoa[];
  donatarios: EntradaPessoa[];
  doacoes: EntradaDoacao[];
  /**
   * PERCENTUAL DA BASE DE CÁLCULO, com 2 casas. Ausente = `'100.00'`.
   *
   * É o campo `Percentual de Redução de Base de Cálculos` da GIA, e só aparece onde há
   * usufruto. Duas opções, as duas já usadas pelo mesmo cliente no mesmo dia:
   *
   *   100,00  — base integral (Decreto 2.125/03, art. 28, §3º, III). A guia imprime
   *             "com encerramento da tributação": nada mais é devido na extinção.
   *             Foi a opção da doação do Agro Aliança (GIA 337978) e das quatro do MMS.
   *    70,00  — redução automática do art. 11, §2º, I. Fica parcela DEVIDA na extinção
   *             do usufruto. Foi a opção da instituição (GIA 338021): base
   *             899.322,90 = 70% de 1.284.747,00, imposto R$ 28.169,92.
   *
   * O fator entra ANTES da faixa, sobre a base de cada apuração — é assim que o
   * demonstrativo da SEFAZ faz: reduz o `Valor para cálculo Tributável` e só depois
   * aplica isenção e alíquotas.
   */
  pctDaBase?: string;
}

export interface ApuracaoDoCenario {
  base: string;
  imposto: string;
}

/** Uma GIA: um doador, um beneficiário, uma apuração progressiva própria. */
export interface LinhaDaGia {
  doadorId: string;
  doadorNome: string;
  donatarioId: string;
  donatarioNome: string;
  quotasRecebidas: string;
  /**
   * O "Percentual Transmitido ao Beneficiário" desta GIA: quotas recebidas ÷
   * quotas que ESTE doador transmite. É o campo que o declarante digita, com 4
   * casas, e a soma dos beneficiários de uma mesma GIA fecha em 100%.
   */
  percentualDaGia: string;
  doacaoAnterior: string | null;
  /** `null` no cenário sem valor informado — ausência não é zero. */
  porCenario: Record<Cenario, ApuracaoDoCenario | null>;
}

/**
 * O que um donatário recebe e paga somando TODAS as GIAs em que ele aparece.
 * É rollup de apresentação: a apuração aconteceu por GIA.
 */
export interface LinhaDoDonatario {
  donatarioId: string;
  nome: string;
  quotasRecebidas: string;
  /** Participação no CAPITAL da sociedade, em %, com 4 casas (ex.: "50.0000"). */
  percentual: string;
  /** Participação no ATO INTEIRO: quotas recebidas ÷ quotas doadas no ato. */
  percentualDoAto: string;
  /** Quantas GIAs este donatário responde — uma por doador. */
  numeroDeGias: number;
  /**
   * Soma do que ele já havia recebido, somando as GIAs. `null` = nada declarado.
   * É rollup de LEITURA: cada parcela acumula só na guia do seu doador, e somar
   * aqui serve para o quadro dizer "já recebeu R$ X", não para apurar.
   */
  doacaoAnterior: string | null;
  porCenario: Record<Cenario, ApuracaoDoCenario | null>;
}

export interface SaidaSimulacao {
  competencia: string;
  upf: string;
  totalDeQuotas: string;
  /** A apuração propriamente dita: uma linha por GIA. */
  gias: LinhaDaGia[];
  /** Rollup por donatário — é o que os três quadros mostram. */
  linhas: LinhaDoDonatario[];
  /**
   * Total do acervo em cada cenário, como entrou. Vai na saída porque a simulação
   * é RETRATO: o quadro mostra "total do acervo" ao lado do imposto, e ler isso do
   * cadastro na hora de exibir faria versão antiga mudar quando o cadastro muda.
   */
  acervoPorCenario: Record<Cenario, string | null>;
  /** Soma das bases de todas as GIAs, por cenário. */
  basesPorCenario: Record<Cenario, string | null>;
  /**
   * Soma dos impostos JÁ ARREDONDADOS de cada GIA. É a convenção do §2.3:
   * arredondar por apuração e somar dá um centavo de diferença do somar-e-depois
   * arredondar, e a convenção está escrita justamente por isso.
   */
  totaisPorCenario: Record<Cenario, string | null>;
  cenariosIndisponiveis: Cenario[];
}

export function simular(entrada: EntradaSimulacao): SaidaSimulacao {
  const upf = quantizar2(parseMoney(entrada.upf));
  if (upf <= 0n) {
    throw new Error(
      `Valor da UPF inválido: ${JSON.stringify(entrada.upf)}. `
      + 'Informe o valor publicado pela SEFAZ/MT para a competência.',
    );
  }
  const totalDeQuotas = parseInteiro(entrada.totalDeQuotas);
  if (totalDeQuotas <= 0n) {
    throw new Error('O total de quotas da sociedade tem de ser positivo.');
  }

  // O percentual da base, escalado em 2 casas. Fora de (0, 100] não é percentual de
  // base: 0 seria apurar nada e acima de 100 seria tributar mais do que existe.
  const fatorDaBase = entrada.pctDaBase == null
    ? BASE_INTEGRAL
    : quantizar2(parseMoney(entrada.pctDaBase));
  if (fatorDaBase <= 0n || fatorDaBase > BASE_INTEGRAL) {
    throw new Error(
      `Percentual da base de cálculo inválido: ${JSON.stringify(entrada.pctDaBase)}. `
      + 'A GIA aceita 100,00 (base integral) ou 70,00 (redução do usufruto).',
    );
  }

  const doadores = new Map(entrada.doadores.map((p) => [p.id, p.nome]));
  const donatarios = new Map(entrada.donatarios.map((p) => [p.id, p.nome]));
  if (doadores.size === 0) {
    throw new Error('Simulação sem doador: a GIA-ITCD é emitida por doador.');
  }

  // Uma aresta por par. Duas linhas para o mesmo par seriam duas GIAs do mesmo
  // doador ao mesmo beneficiário no mesmo ato — que é uma, com a soma das quotas.
  const vistos = new Set<string>();
  const quotasPorAresta = entrada.doacoes.map((d) => {
    if (!doadores.has(d.doadorId)) {
      throw new Error(`Doação atribuída a doador desconhecido: ${d.doadorId}.`);
    }
    if (!donatarios.has(d.donatarioId)) {
      throw new Error(`Doação atribuída a donatário desconhecido: ${d.donatarioId}.`);
    }
    const chave = `${d.doadorId}\0${d.donatarioId}`;
    if (vistos.has(chave)) {
      throw new Error(
        `${doadores.get(d.doadorId)} → ${donatarios.get(d.donatarioId)} aparece `
        + 'duas vezes no ato. O par doador × donatário é uma GIA só.',
      );
    }
    vistos.add(chave);

    const quotas = parseInteiro(d.quotasRecebidas);
    if (quotas < 0n) {
      throw new Error('Quotas recebidas negativas na simulação do ITCD.');
    }
    return quotas;
  });

  const quotasDoAto = quotasPorAresta.reduce((acc, q) => acc + q, ZERO);
  if (quotasDoAto > totalDeQuotas) {
    throw new Error(
      `As quotas distribuídas (${quotasDoAto}) passam do universo de quotas `
      + `da sociedade (${totalDeQuotas}).`,
    );
  }

  /** Quotas que cada doador transmite — denominador do percentual da GIA dele. */
  const quotasPorDoador = new Map<string, bigint>();
  entrada.doacoes.forEach((d, i) => {
    quotasPorDoador.set(d.doadorId, (quotasPorDoador.get(d.doadorId) ?? ZERO) + quotasPorAresta[i]);
  });

  // Passo 1 já vem pronto na entrada: totalizar o acervo é leitura de cadastro,
  // não cálculo do motor. Cenário sem valor entra como `null` e sai como `null`.
  const totais = new Map<Cenario, Money | null>(
    CENARIOS.map((c) => {
      const bruto = entrada.totaisDoAcervo[c];
      return [c, bruto == null ? null : quantizar2(parseMoney(bruto))];
    }),
  );

  const gias: LinhaDaGia[] = entrada.doacoes.map((d, i) => {
    const quotas = quotasPorAresta[i];
    const doadorNome = doadores.get(d.doadorId) as string;
    const donatarioNome = donatarios.get(d.donatarioId) as string;

    // Passo 5 — a doação anterior deste par compõe a base acumulada da GIA.
    const anterior = d.doacaoAnterior == null
      ? ZERO
      : quantizar2(parseMoney(d.doacaoAnterior));
    if (anterior < 0n) {
      throw new Error(`Doação anterior negativa em ${doadorNome} → ${donatarioNome}.`);
    }

    const porCenario = {} as Record<Cenario, ApuracaoDoCenario | null>;
    for (const cenario of CENARIOS) {
      const total = totais.get(cenario) ?? null;
      if (total === null) {
        porCenario[cenario] = null;
        continue;
      }
      // Passos 3 e 4 — percentual × total do cenário, quantizado a 2 casas
      // ANTES da fórmula. A formulação é por percentual, e não por valor de
      // quota: se a quota valer R$ 1,00 ou R$ 2,00 o imposto não muda (§5).
      const base = reduzir(baseDaAresta(total, quotas, totalDeQuotas), fatorDaBase);
      // Passo 6 — a tabela, com o arredondamento uma única vez. A progressividade
      // corre DENTRO desta GIA: é aqui que a apuração por par se materializa.
      const imposto = quantizar2(devidoDoAto(anterior, base, upf));
      porCenario[cenario] = { base: formatMoney(base), imposto: formatMoney(imposto) };
    }

    const doadas = quotasPorDoador.get(d.doadorId) ?? ZERO;
    return {
      doadorId: d.doadorId,
      doadorNome,
      donatarioId: d.donatarioId,
      donatarioNome,
      quotasRecebidas: quotas.toString(),
      percentualDaGia: doadas > ZERO ? formatarPercentual(quotas, doadas) : '0.0000',
      doacaoAnterior: d.doacaoAnterior == null ? null : formatMoney(anterior),
      porCenario,
    };
  });

  const linhas = rollupPorDonatario(entrada, gias, quotasDoAto, totalDeQuotas);

  const acervoPorCenario = {} as Record<Cenario, string | null>;
  const basesPorCenario = {} as Record<Cenario, string | null>;
  const totaisPorCenario = {} as Record<Cenario, string | null>;
  const cenariosIndisponiveis: Cenario[] = [];

  for (const cenario of CENARIOS) {
    const acervo = totais.get(cenario) ?? null;
    acervoPorCenario[cenario] = acervo == null ? null : formatMoney(acervo);
    if (acervo == null) {
      basesPorCenario[cenario] = null;
      totaisPorCenario[cenario] = null;
      cenariosIndisponiveis.push(cenario);
      continue;
    }
    let somaBases = ZERO;
    let somaImpostos = ZERO;
    for (const gia of gias) {
      const apuracao = gia.porCenario[cenario];
      if (!apuracao) continue;
      somaBases += parseMoney(apuracao.base);
      somaImpostos += parseMoney(apuracao.imposto);
    }
    basesPorCenario[cenario] = formatMoney(somaBases);
    totaisPorCenario[cenario] = formatMoney(somaImpostos);
  }

  return {
    competencia: entrada.competencia,
    upf: formatMoney(upf),
    totalDeQuotas: totalDeQuotas.toString(),
    gias,
    linhas,
    acervoPorCenario,
    basesPorCenario,
    totaisPorCenario,
    cenariosIndisponiveis,
  };
}

/**
 * Soma as GIAs de cada donatário, na ordem em que ele aparece na entrada. Soma os
 * impostos JÁ arredondados por GIA — é o que ele vai efetivamente recolher, um
 * DAR por guia, e não a apuração de uma base fictícia consolidada.
 */
function rollupPorDonatario(
  entrada: EntradaSimulacao,
  gias: LinhaDaGia[],
  quotasDoAto: bigint,
  totalDeQuotas: bigint,
): LinhaDoDonatario[] {
  return entrada.donatarios
    .map((p) => {
      const suas = gias.filter((g) => g.donatarioId === p.id);
      const quotas = suas.reduce((acc, g) => acc + BigInt(g.quotasRecebidas), ZERO);

      const porCenario = {} as Record<Cenario, ApuracaoDoCenario | null>;
      for (const cenario of CENARIOS) {
        const apuracoes = suas.map((g) => g.porCenario[cenario]);
        if (apuracoes.length === 0 || apuracoes.some((a) => a == null)) {
          porCenario[cenario] = null;
          continue;
        }
        let base = ZERO;
        let imposto = ZERO;
        for (const a of apuracoes) {
          base += parseMoney((a as ApuracaoDoCenario).base);
          imposto += parseMoney((a as ApuracaoDoCenario).imposto);
        }
        porCenario[cenario] = { base: formatMoney(base), imposto: formatMoney(imposto) };
      }

      const declaradas = suas.filter((g) => g.doacaoAnterior != null);
      const anterior = declaradas.length === 0
        ? null
        : formatMoney(declaradas.reduce(
          (acc, g) => acc + parseMoney(g.doacaoAnterior as string), ZERO,
        ));

      return {
        donatarioId: p.id,
        nome: p.nome,
        quotasRecebidas: quotas.toString(),
        percentual: formatarPercentual(quotas, totalDeQuotas),
        percentualDoAto: quotasDoAto > ZERO ? formatarPercentual(quotas, quotasDoAto) : '0.0000',
        numeroDeGias: suas.length,
        doacaoAnterior: anterior,
        porCenario,
      };
    })
    // Donatário cadastrado que não recebe nada neste ato não é linha do quadro.
    .filter((l) => l.numeroDeGias > 0);
}

/**
 * `base = (quotas ÷ total de quotas) × total do cenário`, arredondada meio para
 * cima direto na segunda casa. É esse arredondamento que reproduz o publicado: no
 * cenário de ITR a base exata é 14.577.996,025 e a publicada é 14.577.996,03.
 */
/**
 * 100,00% na mesma escala de `Money` (1e-4). Percentual e dinheiro compartilham a
 * representacao porque os dois vem de `parseMoney`, e misturar escala aqui daria erro
 * de duas ordens de grandeza sem nenhum sintoma visivel.
 */
const BASE_INTEGRAL = 1_000_000n;

function baseDaAresta(totalDoCenario: Money, quotas: bigint, totalDeQuotas: bigint): Money {
  const centavos = divArredondado(totalDoCenario * quotas, totalDeQuotas * CENTAVO);
  return centavos * CENTAVO;
}

/**
 * Aplica o percentual da base. `fator` vem escalado em 2 casas (10000 = 100,00%), que
 * é a precisão do campo na guia.
 *
 * Quantiza em centavos DEPOIS da multiplicação, meio para cima — a guia 338021 traz
 * 899.322,90 para 70% de 1.284.747,00, que é o produto exato, e o imposto que sai dela
 * fecha ao centavo com o demonstrativo da SEFAZ.
 */
function reduzir(base: Money, fator: bigint): Money {
  if (fator === BASE_INTEGRAL) return base;
  const centavos = divArredondado(base * fator, BASE_INTEGRAL * CENTAVO);
  return centavos * CENTAVO;
}

/** Participação em percentual, 4 casas, meio para cima. */
function formatarPercentual(quotas: bigint, denominador: bigint): string {
  const escalado = divArredondado(quotas * 100n * 10_000n, denominador);
  const inteiro = escalado / 10_000n;
  const fracao = (escalado % 10_000n).toString().padStart(4, '0');
  return `${inteiro}.${fracao}`;
}
