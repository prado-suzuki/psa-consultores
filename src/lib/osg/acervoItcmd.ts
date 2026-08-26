// Passo 1 do FLUXO: somar os imóveis do cliente, um total por cenário.
//
// Vive FORA de `src/lib/osg/itcmd/` de propósito. Ali dentro `number` é proibido
// para dinheiro; aqui é a fronteira com o cadastro, onde o valor chega como
// `number` (coluna `numeric` do Postgres). Este módulo converte para a string
// decimal que o motor recebe, e recusa o que não couber na escala de 4 casas em
// vez de truncar em silêncio.
//
// Contábil e mercado vêm de `valoresDoBem` (bem com matrícula soma as
// matrículas; bem sem matrícula usa o próprio valor). O ITR **não tem campo
// canônico**: `matricula.vlr_itr_iptu` não existe e `bem.vlr_itr_iptu` está
// vazio em 27 de 27 no sandbox. Ler `bem.vlr_itr_iptu` é ler o que existe; a
// escolha do campo oficial é decisão do tech lead
// (CADASTRO-para-calculadora.md §3.1), e por isso a origem do número é
// DECLARADA na tela em vez de disfarçada.

import { formatMoney, parseMoney, ZERO, type Money } from '@/lib/osg/itcmd/dinheiro';
import type { Cenario } from '@/lib/osg/itcmd/simulacao';
import type { ValoresDoBem } from '@/lib/osg/valoresDoBem';

export interface ImovelDoAcervo {
  id: string;
  referencia: string;
  denominacao: string;
  /** Contábil e mercado já derivados (soma das matrículas ou valor do bem). */
  valores: ValoresDoBem;
  /** Único campo de ITR/IPTU que existe hoje — na tabela `bem`. */
  vlr_itr_iptu: number | null;
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
  return imovel.vlr_itr_iptu;
}

/**
 * De onde saiu (ou não saiu) o valor de ITR do imóvel. Existe separado de
 * `origemDoValor` porque a regra é outra: o ITR não tem coluna na matrícula, e
 * afirmar "soma das matrículas" para ele seria falso.
 */
export function origemDoValorDeItr(imovel: ImovelDoAcervo): string {
  if (imovel.vlr_itr_iptu == null) {
    return 'Sem valor de ITR/IPTU cadastrado (campo canônico ainda não definido)';
  }
  if (imovel.valores.matriculas > 0) {
    return `Valor do próprio bem — a matrícula não tem campo de ITR/IPTU `
      + `(o bem tem ${imovel.valores.matriculas} matrícula(s))`;
  }
  return 'Valor do próprio bem (sem matrícula)';
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
