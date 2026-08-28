import { describe, expect, it } from 'vitest';
import {
  ratearAto, repartirProporcional, type ParteDoRateio,
} from '@/lib/osg/rateioDoAto';

describe('repartição proporcional em inteiros', () => {
  it('soma sempre exata, mesmo com resto indivisível', () => {
    expect(repartirProporcional(10n, [1n, 1n, 1n])).toEqual([4n, 3n, 3n]);
    expect(repartirProporcional(10n, [1n, 1n, 1n]).reduce((a, q) => a + q, 0n)).toBe(10n);
    expect(repartirProporcional(100n, [1n, 3n])).toEqual([25n, 75n]);
    expect(repartirProporcional(7n, [2n, 2n, 3n]).reduce((a, q) => a + q, 0n)).toBe(7n);
  });

  it('herdeiro de fora: dois doadores transmitem 3/4 do que têm', () => {
    // Patrimônio 4.448.500 e dois filhos, um só recebendo: o ato movimenta
    // 3.336.375, e cada meeiro entra com a metade disso.
    expect(repartirProporcional(3_336_375n, [2_224_250n, 2_224_250n]))
      .toEqual([1_668_188n, 1_668_187n]);
  });

  it('peso zero não recebe nada', () => {
    expect(repartirProporcional(10n, [0n, 5n, 5n])).toEqual([0n, 5n, 5n]);
  });

  it('recusa repartir o que não tem peso, em vez de dividir por zero', () => {
    expect(() => repartirProporcional(10n, [0n, 0n])).toThrow(/todos os pesos são zero/i);
    expect(repartirProporcional(0n, [0n, 0n])).toEqual([0n, 0n]);
    expect(() => repartirProporcional(-1n, [1n])).toThrow(/negativo/i);
    expect(() => repartirProporcional(1n, [-1n])).toThrow(/negativo/i);
  });
});

const somaLinhas = (celulas: { doadorId: string; quotas: bigint }[]) => {
  const m = new Map<string, bigint>();
  for (const c of celulas) m.set(c.doadorId, (m.get(c.doadorId) ?? 0n) + c.quotas);
  return m;
};
const somaColunas = (celulas: { donatarioId: string; quotas: bigint }[]) => {
  const m = new Map<string, bigint>();
  for (const c of celulas) m.set(c.donatarioId, (m.get(c.donatarioId) ?? 0n) + c.quotas);
  return m;
};

/** Os dois totais fecham exatos — é o invariante que o módulo existe para manter. */
const conferirTotais = (
  doadores: ParteDoRateio[],
  donatarios: ParteDoRateio[],
) => {
  const celulas = ratearAto(doadores, donatarios);
  const linhas = somaLinhas(celulas);
  const colunas = somaColunas(celulas);
  for (const d of doadores) {
    if (d.quotas > 0n) expect(linhas.get(d.id), `linha ${d.id}`).toBe(d.quotas);
  }
  for (const d of donatarios) {
    if (d.quotas > 0n) expect(colunas.get(d.id), `coluna ${d.id}`).toBe(d.quotas);
  }
  return celulas;
};

describe('rateio do ato — matriz doador × donatário', () => {
  it('caso de 2026: dois doadores meeiros, duas donatárias desiguais', () => {
    // O ato real: 4.448.500 quotas, Regina com 25,91% e Cristina com 74,09%.
    // Cada meeiro contribui na mesma proporção, e aqui divide exato.
    const celulas = conferirTotais(
      [{ id: 'avelino', quotas: 2_224_250n }, { id: 'iracema', quotas: 2_224_250n }],
      [{ id: 'regina', quotas: 1_152_528n }, { id: 'cristina', quotas: 3_295_972n }],
    );

    expect(celulas).toHaveLength(4);
    const porPar = new Map(celulas.map((c) => [`${c.doadorId}>${c.donatarioId}`, c.quotas]));
    expect(porPar.get('avelino>regina')).toBe(576_264n);
    expect(porPar.get('avelino>cristina')).toBe(1_647_986n);
    expect(porPar.get('iracema>regina')).toBe(576_264n);
    expect(porPar.get('iracema>cristina')).toBe(1_647_986n);
  });

  it('caso de dez/2025: blocos desiguais, duas donatárias iguais', () => {
    const celulas = conferirTotais(
      [{ id: 'pai', quotas: 12_596_190n }, { id: 'mae', quotas: 6_487_402n }],
      [{ id: 'f1', quotas: 9_541_796n }, { id: 'f2', quotas: 9_541_796n }],
    );
    const porPar = new Map(celulas.map((c) => [`${c.doadorId}>${c.donatarioId}`, c.quotas]));
    expect(porPar.get('pai>f1')).toBe(6_298_095n);
    expect(porPar.get('pai>f2')).toBe(6_298_095n);
    expect(porPar.get('mae>f1')).toBe(3_243_701n);
    expect(porPar.get('mae>f2')).toBe(3_243_701n);
  });

  it('resto indivisível não vaza: nenhuma quota se cria nem se perde', () => {
    // 3 doadores × 3 donatários com números primos entre si — o piso proporcional
    // deixa resto em quase toda célula, e é aqui que fechar só uma das dimensões
    // apareceria.
    conferirTotais(
      [{ id: 'a', quotas: 101n }, { id: 'b', quotas: 103n }, { id: 'c', quotas: 107n }],
      [{ id: 'x', quotas: 97n }, { id: 'y', quotas: 109n }, { id: 'z', quotas: 105n }],
    );

    // Um caso pequeno em que dá para ver a matriz inteira: 3 e 4 em 7.
    const celulas = conferirTotais(
      [{ id: 'a', quotas: 3n }, { id: 'b', quotas: 4n }],
      [{ id: 'x', quotas: 5n }, { id: 'y', quotas: 2n }],
    );
    expect(celulas.reduce((acc, c) => acc + c.quotas, 0n)).toBe(7n);
  });

  it('uma quota só, entre muita gente, ainda fecha', () => {
    const celulas = conferirTotais(
      [{ id: 'a', quotas: 1n }],
      [{ id: 'x', quotas: 1n }],
    );
    expect(celulas).toEqual([{ doadorId: 'a', donatarioId: 'x', quotas: 1n }]);
  });

  it('par que não recebe nada não vira GIA', () => {
    // Doador com zero quota não emite guia; donatário com zero não aparece.
    const celulas = ratearAto(
      [{ id: 'a', quotas: 100n }, { id: 'vazio', quotas: 0n }],
      [{ id: 'x', quotas: 100n }, { id: 'nada', quotas: 0n }],
    );
    expect(celulas).toEqual([{ doadorId: 'a', donatarioId: 'x', quotas: 100n }]);
  });

  it('totais que não batem são recusados, não ajustados', () => {
    expect(() => ratearAto(
      [{ id: 'a', quotas: 100n }],
      [{ id: 'x', quotas: 99n }],
    )).toThrow(/Nada se cria nem se perde/i);

    expect(() => ratearAto(
      [{ id: 'a', quotas: -1n }],
      [{ id: 'x', quotas: -1n }],
    )).toThrow(/negativas/i);
  });

  it('ato vazio é lista vazia, não erro', () => {
    expect(ratearAto([], [])).toEqual([]);
    expect(ratearAto([{ id: 'a', quotas: 0n }], [{ id: 'x', quotas: 0n }])).toEqual([]);
  });

  it('a mesma entrada dá sempre a mesma matriz', () => {
    const doadores = [{ id: 'a', quotas: 7n }, { id: 'b', quotas: 11n }];
    const donatarios = [{ id: 'x', quotas: 5n }, { id: 'y', quotas: 13n }];
    const primeira = ratearAto(doadores, donatarios);
    for (let n = 0; n < 5; n += 1) {
      expect(ratearAto(doadores, donatarios)).toEqual(primeira);
    }
  });
});
