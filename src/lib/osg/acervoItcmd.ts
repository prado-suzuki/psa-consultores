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
  /** Decimal em string para o motor. `null` = nenhum imóvel tem este valor. */
  total: string | null;
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
  const s = String(v);
  if (!DECIMAL_ATE_4_CASAS.test(s)) {
    throw new Error(
      `Valor de imóvel fora da escala do motor (4 casas decimais): ${s}. `
      + 'Corrija o cadastro em vez de arredondar aqui.',
    );
  }
  return s;
}

/** Valor de um imóvel no cenário, ou `null` quando não há valor informado. */
export function valorDoImovel(imovel: ImovelDoAcervo, cenario: Cenario): number | null {
  if (cenario === 'contabil') return imovel.valores.contabil.valor;
  if (cenario === 'mercado') return imovel.valores.mercado.valor;
  return imovel.valores.itr.valor;
}

/** Soma exata em bigint: somar `number` acumularia erro de float. */
function somar(valores: number[]): Money {
  return valores.reduce<Money>((acc, v) => acc + parseMoney(numeroParaDecimal(v)), ZERO);
}

export function totalizarAcervo(imoveis: ImovelDoAcervo[]): Record<Cenario, TotalDoCenario> {
  const porCenario = (cenario: Cenario): TotalDoCenario => {
    const valores = imoveis.map((i) => valorDoImovel(i, cenario));
    const preenchidos = valores.filter((v): v is number => v != null);
    return {
      // `formatMoney` já entrega 2 casas com meio para cima — é aqui que a
      // quantização exigida pela fórmula (SPEC §2.3) acontece.
      total: preenchidos.length === 0 ? null : formatMoney(somar(preenchidos)),
      comValor: preenchidos.length,
      semValor: valores.length - preenchidos.length,
      imoveis: valores.length,
    };
  };

  return { contabil: porCenario('contabil'), itr: porCenario('itr'), mercado: porCenario('mercado') };
}
