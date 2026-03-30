/* ══════════════════════════════════════════════════════════════
 *  Hook orquestrador — Apuração PIS/COFINS
 *  Consome dados do fetch e produz resultados calculados
 *  com useMemo granulares para minimizar re-renders.
 * ══════════════════════════════════════════════════════════════ */

import { useMemo } from 'react';
import type {
  ApuracaoInput,
  ItemCredito,
  ResultadoPeriodo,
  TotaisApuracao,
  PivotRowGeneric,
  ContaNode,
  PisCofsinPeriodo,
} from '@/types/pisCofins';
import {
  calcTodosPeriodos,
  calcTodosPeriodosBalancete,
  calcTotais,
  isItemReceita,
  isItemCredito,
  isItemSuspenso,
  isItemOutrasSaidas,
  isItemIsencaoCredito,
  valorBaseBalancete,
} from '@/lib/apuracaoPisCofins';
import { buildPivotGeneric, flattenContasToItens, extractLeafNodesByAccount } from '@/lib/pisCofinsFilters';

interface UseCalculatorParams {
  data: ApuracaoInput | null | undefined;
  tipoApuracao: 'EFD' | 'BALANCETE';
  periodoFechado: boolean;
  extraContas?: Map<string, { tipo: 'D' | 'C'; desc: string }>;
}

interface ColumnsData {
  periods: string[];
  yearsMap: Map<string, string[]>;
}

interface PivotTables {
  resumoData: PivotRowGeneric[];
  debitosData: PivotRowGeneric[];
  isencoesData: PivotRowGeneric[];
  outrasSaidasData: PivotRowGeneric[];
  creditosData: PivotRowGeneric[];
  isencoesCreditoData: PivotRowGeneric[];
}

export function usePisCofinsCalculator({ data, tipoApuracao, periodoFechado, extraContas }: UseCalculatorParams) {

  const hasEfdRecord = (i: ItemCredito): boolean => i.vlr_efd !== 0;

  // ── 0. Normalizar dados (achatar contas hierárquicas se necessário) ──
  const normalizedData: ApuracaoInput | null = useMemo(() => {
    if (!data) return null;
    const needsFlatten = data.periodos.some(p => p.contas && p.contas.length > 0 && (!p.itens_credito || p.itens_credito.length === 0));
    if (!needsFlatten && (!extraContas || extraContas.size === 0)) return data;

    const extraSet = extraContas ? new Set(extraContas.keys()) : new Set<string>();

    return {
      ...data,
      periodos: data.periodos.map((p) => {
        let itens = needsFlatten && p.contas
          ? flattenContasToItens(p.contas)
          : [...(p.itens_credito ?? [])];

        // Inject synthetic items for extra accounts
        if (extraContas && extraContas.size > 0 && p.contas) {
          const leafMap = extractLeafNodesByAccount(p.contas, extraSet);
          for (const [codCta, { tipo, desc }] of extraContas) {
            const leaf = leafMap.get(codCta);
            if (!leaf) continue;

            const alreadyInjected = itens.some(
              (i) => i.bloco_efd === 'EXTRA' && i.cod_cta === codCta,
            );
            if (alreadyInjected) continue;

            const value = leaf.saldo_periodo || leaf.saldo_atual || 0;
            if (value === 0) continue;

            itens.push({
              cst_pis: tipo === 'D' ? '01' : '50',
              aliq_pis: tipo === 'D' ? 0 : 1.65,
              cod_cta: codCta,
              descricao_conta: desc || leaf.descricao_conta,
              bloco_efd: 'EXTRA',
              vlr_efd: value,
              credito: leaf.credito ?? 0,
              debito: leaf.debito ?? 0,
              saldo_periodo: leaf.saldo_periodo ?? 0,
              saldo_atual: leaf.saldo_atual ?? 0,
            });
          }
        }

        return { ...p, itens_credito: itens };
      }),
    };
  }, [data, extraContas]);

  // ── 0b. Dados filtrados (EFD exclui itens sem registro) ──
  const filteredData: ApuracaoInput | null = useMemo(() => {
    if (!normalizedData) return null;
    if (tipoApuracao !== 'EFD') return normalizedData;
    return {
      ...normalizedData,
      periodos: normalizedData.periodos.map((p) => ({
        ...p,
        itens_credito: p.itens_credito.filter(hasEfdRecord),
      })),
    };
  }, [normalizedData, tipoApuracao]);

  // ── 1. Resultados de apuração por período ──
  const resultados: ResultadoPeriodo[] = useMemo(() => {
    if (!filteredData) return [];
    return tipoApuracao === 'EFD'
      ? calcTodosPeriodos(filteredData)
      : calcTodosPeriodosBalancete(filteredData, periodoFechado);
  }, [filteredData, tipoApuracao, periodoFechado]);

  // ── 2. Totais acumulados ──
  const totais: TotaisApuracao = useMemo(() => calcTotais(resultados), [resultados]);

  // ── 3. Colunas (períodos e agrupamento por ano) ──
  const columnsData: ColumnsData = useMemo(() => {
    if (!filteredData) return { periods: [], yearsMap: new Map<string, string[]>() };

    const periods = filteredData.periodos.map((p) => p.dt_ini.substring(0, 7)).sort();
    const yearsMap = new Map<string, string[]>();

    periods.forEach((p) => {
      const [year] = p.split('-');
      if (!yearsMap.has(year)) yearsMap.set(year, []);
      yearsMap.get(year)!.push(p);
    });

    return { periods, yearsMap };
  }, [filteredData]);

  // ── Helpers para valueFn baseados no tipo de apuração ──
  const valueFnEfdOrBal = useMemo(() => {
    if (tipoApuracao === 'EFD') {
      return (i: ItemCredito) => i.vlr_efd;
    }
    return (i: ItemCredito) => valorBaseBalancete(i, periodoFechado);
  }, [tipoApuracao, periodoFechado]);

  const valueFnEfd = useMemo(() => (i: ItemCredito) => i.vlr_efd, []);

  const periodos = filteredData?.periodos;

  // ── 4. Tabelas pivotadas com dependências granulares ──

  // Débitos, Isenções e Outras Saídas dependem apenas de vlr_efd (não de tipoApuracao/periodoFechado)
  const debitosData = useMemo(
    () => !periodos ? [] : buildPivotGeneric(periodos, isItemReceita, (i) => i.cod_cta, valueFnEfd),
    [periodos, valueFnEfd],
  );

  const isencoesData = useMemo(
    () => !periodos ? [] : buildPivotGeneric(periodos, isItemSuspenso, (i) => i.cod_cta, valueFnEfd),
    [periodos, valueFnEfd],
  );

  const outrasSaidasData = useMemo(
    () => !periodos ? [] : buildPivotGeneric(periodos, isItemOutrasSaidas, (i) => i.cod_cta, valueFnEfd),
    [periodos, valueFnEfd],
  );

  // Resumo, Créditos e Isenções de Crédito dependem de tipoApuracao + periodoFechado
  const resumoData = useMemo(
    () => !periodos ? [] : buildPivotGeneric(periodos, () => true, (i) => `${i.cst_pis}-${i.cod_cta}`, valueFnEfdOrBal),
    [periodos, valueFnEfdOrBal],
  );

  const creditosData = useMemo(
    () => !periodos ? [] : buildPivotGeneric(periodos, isItemCredito, (i) => i.cod_cta, valueFnEfdOrBal),
    [periodos, valueFnEfdOrBal],
  );

  const isencoesCreditoData = useMemo(
    () => !periodos ? [] : buildPivotGeneric(periodos, isItemIsencaoCredito, (i) => i.cod_cta, valueFnEfdOrBal),
    [periodos, valueFnEfdOrBal],
  );

  const tables: PivotTables = useMemo(() => ({
    resumoData,
    debitosData,
    isencoesData,
    outrasSaidasData,
    creditosData,
    isencoesCreditoData,
  }), [resumoData, debitosData, isencoesData, outrasSaidasData, creditosData, isencoesCreditoData]);

  // ── 5. Árvore hierárquica para o Resumo Prado ──
  const contasTree: { dt_ini: string; contas: ContaNode[] }[] = useMemo(() => {
    if (!data) return [];
    return data.periodos
      .filter(p => p.contas && p.contas.length > 0)
      .map(p => ({ dt_ini: p.dt_ini, contas: p.contas! }));
  }, [data]);

  // ── 6. Set of cod_cta that actually participate in débito/crédito via EFD ──
  const efdContasSet: Set<string> = useMemo(() => {
    if (!normalizedData) return new Set<string>();
    const set = new Set<string>();
    for (const p of normalizedData.periodos) {
      for (const item of p.itens_credito) {
        if (item.bloco_efd === 'EXTRA') continue;
        if (!isItemReceita(item) && !isItemCredito(item)) continue;
        set.add(item.cod_cta);
      }
    }
    return set;
  }, [normalizedData]);

  return {
    resultados,
    totais,
    columnsData,
    tables,
    contasTree,
    efdContasSet,
  };
}
