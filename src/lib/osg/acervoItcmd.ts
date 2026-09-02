// Passo 1 do FLUXO: somar os imóveis do cliente, um total por cenário.
//
// Vive FORA de `src/lib/osg/itcmd/` de propósito. Ali dentro `number` é proibido
// para dinheiro; aqui é a fronteira com o cadastro, onde o valor chega como
// `number` (coluna `numeric` do Postgres). Este módulo converte para a string
// decimal que o motor recebe, e recusa o que não couber na escala de 4 casas em
// vez de truncar em silêncio.
//
// Os três cenários vêm de `valoresDoBem`, com a mesma regra: bem com matrícula
// soma as matrículas, bem sem matrícula usa o próprio valor. O de ITR sai de
// `vlr_imposto_anual`, que apesar do nome guarda o valor DECLARADO no ITR — é o
// campo que o Diagnóstico Patrimonial usa e que a OSG preenche.
// `bem.vlr_itr_iptu` NÃO é usado: não tem campo em tela nenhuma e está vazio em
// 27 de 27 no sandbox.

import { formatMoney, parseMoney, ZERO, type Money } from '@/lib/osg/itcmd/dinheiro';
import type { Cenario } from '@/lib/osg/itcmd/simulacao';
import type { ValoresDoBem } from '@/lib/osg/valoresDoBem';

export interface ImovelDoAcervo {
  id: string;
  referencia: string;
  denominacao: string;
  /** Os três cenários já derivados (soma das matrículas ou valor do bem). */
  valores: ValoresDoBem;
  /**
   * O IMÓVEL RURAL a que este bem pertence — o código do imóvel no Incra
   * (`bem.ccir_codigo`). `null` = o bem é um imóvel por si.
   *
   * É o dado que faltava, e sem ele nenhuma regra automática acerta. O valor da terra
   * nua é declarado por IMÓVEL, numa DITR, e um imóvel rural pode ter várias
   * matrículas — no Agro Aliança a DITR do CIB 3049863-5 cobre as matrículas 64.514,
   * 64.515 e 64.516 numa declaração só, e a do CIB 4886323-8 cobre 13.180 e 13.447.
   * Cada uma dessas matrículas é um bem no cadastro, então o valor de uma declaração
   * fica lançado num bem e os irmãos ficam vazios.
   *
   * Sem a chave, "vazio" e "declarado junto com o irmão" são indistinguíveis: uma regra
   * frouxa soma só os preenchidos e apura imposto a MENOS em silêncio; uma estrita
   * bloqueia cadastro correto e empurra alguém a copiar o valor do irmão, apurando a
   * MAIS em silêncio. Com a chave, some a escolha entre dois erros.
   */
  imovelRural: string | null;
}

export interface TotalDoCenario {
  /**
   * O total para LER. Decimal em string, `null` quando nenhum imóvel tem este valor.
   *
   * Pode ser PARCIAL: se um imóvel do acervo não tem o valor deste cenário, este campo
   * traz a soma dos que têm e `semValor` diz quantos ficaram fora. É assim que a lista do
   * Diagnóstico Patrimonial mostra, e ali está certo — é leitura.
   */
  total: string | null;
  /**
   * O total para APURAR, e é outro número: `null` sempre que faltou imóvel.
   *
   * ACERVO INCOMPLETO NÃO É BASE. Somar só os imóveis que têm valor e chamar isso de
   * acervo apura imposto sobre patrimônio menor que o real, sem nada em tela dizendo que
   * faltou bem — e é imposto A MENOS, o erro que ninguém reclama. Medido no sandbox: dos
   * 13 imóveis da Agro Aliança, 10 têm valor de ITR e 10 de mercado; da Fazenda Santa
   * Terezinha, 8 de 10 no ITR. As duas bases saíam a menos, caladas.
   *
   * Os dois campos existem separados de propósito: `total` segue alimentando leitura, e
   * quem calcula usa este. Cenário com `totalFiscal` nulo cai em `cenariosIndisponiveis`,
   * a gravação se recusa e a tela nomeia o que falta no cadastro — o mesmo mecanismo que
   * já valia para o cenário sem valor nenhum.
   */
  totalFiscal: string | null;
  /** Imóveis com exatamente uma declaração de valor neste cenário. */
  comValor: number;
  /** Imóveis sem declaração nenhuma. É o que torna o cenário indisponível. */
  semValor: number;
  /**
   * Imóveis com MAIS DE UMA declaração no mesmo cenário — e isso também derruba o
   * cenário, em vez de somar.
   *
   * A DITR declara um valor por imóvel. Duas matrículas do mesmo imóvel com valor
   * significa que alguém copiou o número do irmão para "preencher o que faltava", e
   * somar os dois infla o acervo. É o erro que a regra anterior induzia, e agora ele
   * aparece nomeado em vez de virar base de cálculo.
   */
  ambiguos: number;
  /** Quantas unidades este cenário conta: bens no contábil, imóveis no ITR e no mercado. */
  unidades: number;
  /** O nome da unidade, para a tela falar a língua do cenário. */
  unidade: 'bem' | 'imóvel';
  /** As unidades sem valor, para a tela nomear em vez de só contar. */
  semValorNomes: string[];
  /** As unidades com valor declarado mais de uma vez. */
  ambiguosNomes: string[];
}

/**
 * A GRANULARIDADE DE CADA CENÁRIO — e ela NÃO é a mesma. Este é o coração do módulo.
 *
 * CONTÁBIL é valor de integralização: cada matrícula entrou no capital por um valor
 * próprio, definido no ato societário. No Agro Aliança as três matrículas da Fazenda
 * Aliança entraram por R$ 1.200.000,00 cada, e é a soma delas que fecha o capital de
 * R$ 9.557.944,00. Aqui todo bem tem de ter o seu valor, e todos somam.
 *
 * ITR e MERCADO são avaliações da PROPRIEDADE. A DITR declara um valor de terra nua por
 * imóvel rural — o CIB 3049863-5 cobre as matrículas 64.514, 64.515 e 64.516 numa
 * declaração só —, e a avaliação de mercado segue a mesma unidade. Aqui o valor entra
 * UMA VEZ por imóvel, e matrícula irmã vazia é o esperado.
 *
 * Contando bens onde a unidade é o imóvel, o Agro Aliança aparecia como "3 de 13 bens
 * sem valor de ITR" e a gravação era recusada, num acervo que estava correto. Contando
 * uma vez por imóvel, os totais dão 37.574.919,57 e 64.659.680,42 — exatamente os que a
 * apresentação da OSG usou e os que as quatro simulações do histórico gravaram.
 */
const UNIDADE_DO_CENARIO: Record<Cenario, 'bem' | 'imóvel'> = {
  contabil: 'bem',
  itr: 'imóvel',
  mercado: 'imóvel',
};

const DECIMAL_ATE_4_CASAS = /^-?\d+(\.\d{1,4})?$/;

/**
 * `number` do cadastro → string decimal da fronteira do motor. Recusa não
 * finito, notação exponencial e mais de 4 casas: nesses casos a escala 1e-4 não
 * representaria o valor, e arredondar por conta própria seria inventar dado.
 */
export function numeroParaDecimal(v: number): string {
  if (!Number.isFinite(v)) {
    throw new Error(`Valor de imóvel não finito no cadastro: ${v}. Esperado número finito.`);
  }
  return decimalDoCadastro(String(v));
}

/**
 * A MESMA GUARDA, sobre o decimal já em string.
 *
 * É por aqui que o acervo passa desde que a soma das matrículas virou exata: o valor
 * chega como decimal, e a única pergunta que sobra é se ele cabe na escala de 4 casas
 * do motor. Recusar continua sendo melhor que arredondar, e a mensagem diz o número.
 */
export function decimalDoCadastro(s: string): string {
  if (!DECIMAL_ATE_4_CASAS.test(s)) {
    throw new Error(
      `Valor de imóvel fora da escala do motor (4 casas decimais): ${s}. `
      + 'Corrija o cadastro em vez de arredondar aqui.',
    );
  }
  return s;
}

/**
 * Valor de um imóvel no cenário, em DECIMAL, ou `null` quando não há valor que sirva
 * de base.
 *
 * SOMA PARCIAL NÃO É VALOR. Um imóvel com duas matrículas e uma só preenchida devolve,
 * em `valores.contabil`, a soma de uma parcela: um número menor que o real. A lista do
 * Diagnóstico mostra isso rotulado como "soma parcial", e ali está certo — é leitura.
 * Aqui é BASE DE CÁLCULO, e usar a parcial apuraria imposto a menos sobre um acervo
 * incompleto, sem nada na tela dizendo que faltou matrícula.
 *
 * Devolvendo `null`, o imóvel entra em `semValor`, o cenário vira indisponível e a
 * calculadora se recusa a gravar dizendo qual valor falta no cadastro. É o mecanismo
 * que já existe para o cenário sem valor nenhum; o parcial passa a usar o mesmo.
 */
export function valorDoImovel(imovel: ImovelDoAcervo, cenario: Cenario): string | null {
  const derivado = cenario === 'contabil' ? imovel.valores.contabil
    : cenario === 'mercado' ? imovel.valores.mercado
      : imovel.valores.itr;

  if (derivado.decimal == null) return null;
  if (imovel.valores.origem === 'matriculas'
    && derivado.comValor < imovel.valores.matriculas) return null;
  return derivado.decimal;
}

/**
 * Soma exata em bigint, a partir do DECIMAL do cadastro.
 *
 * Recebe string e não `number` de propósito: a soma das matrículas já aconteceu em
 * inteiro dentro de `valoresDoBem`, e passar por `number` no caminho reintroduziria o
 * float que fazia 100,10 + 200,20 virar 300.29999999999995 e derrubar a apuração.
 */
function somar(valores: string[]): Money {
  return valores.reduce<Money>((acc, v) => acc + parseMoney(decimalDoCadastro(v)), ZERO);
}

/**
 * OS BENS AGRUPADOS POR IMÓVEL RURAL.
 *
 * Bem sem `imovelRural` é um imóvel por si — e a chave usada é o próprio id, que não
 * colide com código nenhum do Incra. Isso é FALHA FECHADA de propósito: se alguém
 * esquecer de informar o código, os irmãos aparecem como imóveis separados e sem valor,
 * e o cenário fica indisponível. Bloquear é recuperável; somar errado, não.
 */
function porImovelRural(imoveis: ImovelDoAcervo[]): ImovelDoAcervo[][] {
  const grupos = new Map<string, ImovelDoAcervo[]>();
  for (const i of imoveis) {
    const chave = i.imovelRural ?? `bem:${i.id}`;
    const atual = grupos.get(chave);
    if (atual) atual.push(i); else grupos.set(chave, [i]);
  }
  return [...grupos.values()];
}

/** Como o imóvel se chama na tela: a referência do bem, ou o nome mais as matrículas. */
function nomeDoImovel(grupo: ImovelDoAcervo[]): string {
  const [primeiro] = grupo;
  if (grupo.length === 1) return `${primeiro.referencia} · ${primeiro.denominacao}`;
  return `${primeiro.denominacao} (${grupo.length} matrículas)`;
}

export function totalizarAcervo(imoveis: ImovelDoAcervo[]): Record<Cenario, TotalDoCenario> {
  const porCenario = (cenario: Cenario): TotalDoCenario => {
    const unidade = UNIDADE_DO_CENARIO[cenario];
    // No contábil cada bem responde por si, então o "grupo" é ele sozinho — e o laço
    // abaixo serve aos dois casos sem se ramificar: grupo de um com um valor é o
    // comportamento antigo, ao pé da letra.
    const grupos = unidade === 'imóvel' ? porImovelRural(imoveis) : imoveis.map((i) => [i]);
    const declarados: string[] = [];
    const semValorNomes: string[] = [];
    const ambiguosNomes: string[] = [];

    for (const grupo of grupos) {
      const valores = grupo
        .map((i) => valorDoImovel(i, cenario))
        .filter((v): v is string => v != null);

      // UMA DECLARAÇÃO POR IMÓVEL é o normal: a DITR traz um valor de terra nua para a
      // propriedade toda, e as outras matrículas do mesmo imóvel ficam vazias por
      // desenho — não por falta.
      if (valores.length === 1) declarados.push(valores[0]);
      else if (valores.length === 0) semValorNomes.push(nomeDoImovel(grupo));
      else ambiguosNomes.push(nomeDoImovel(grupo));
    }

    // `formatMoney` já entrega 2 casas com meio para cima — é aqui que a
    // quantização exigida pela fórmula (SPEC §2.3) acontece.
    const total = declarados.length === 0 ? null : formatMoney(somar(declarados));
    const problema = semValorNomes.length > 0 || ambiguosNomes.length > 0;
    return {
      total,
      // Um imóvel sem valor, ou com dois, basta para o total não servir de base.
      totalFiscal: problema ? null : total,
      comValor: declarados.length,
      semValor: semValorNomes.length,
      ambiguos: ambiguosNomes.length,
      unidades: grupos.length,
      unidade,
      semValorNomes,
      ambiguosNomes,
    };
  };

  return { contabil: porCenario('contabil'), itr: porCenario('itr'), mercado: porCenario('mercado') };
}
