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
  comValor: number;
  semValor: number;
  imoveis: number;
}

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

export function totalizarAcervo(imoveis: ImovelDoAcervo[]): Record<Cenario, TotalDoCenario> {
  const porCenario = (cenario: Cenario): TotalDoCenario => {
    const valores = imoveis.map((i) => valorDoImovel(i, cenario));
    const preenchidos = valores.filter((v): v is string => v != null);
    const semValor = valores.length - preenchidos.length;
    // `formatMoney` já entrega 2 casas com meio para cima — é aqui que a
    // quantização exigida pela fórmula (SPEC §2.3) acontece.
    const total = preenchidos.length === 0 ? null : formatMoney(somar(preenchidos));
    return {
      total,
      // Um imóvel de fora basta para o total não servir de base.
      totalFiscal: semValor > 0 ? null : total,
      comValor: preenchidos.length,
      semValor,
      imoveis: valores.length,
    };
  };

  return { contabil: porCenario('contabil'), itr: porCenario('itr'), mercado: porCenario('mercado') };
}
