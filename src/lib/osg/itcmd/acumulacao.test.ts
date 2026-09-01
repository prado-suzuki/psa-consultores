import { describe, expect, it } from 'vitest';
import { CENTAVO, formatMoney, parseMoney, type Money } from '@/lib/osg/itcmd/dinheiro';
import { upfDaCompetencia } from '@/lib/osg/itcmd/faixas';
import { impostoExato } from '@/lib/osg/itcmd/imposto';
import { acumular, devidoDoAto } from '@/lib/osg/itcmd/acumulacao';

const UPF_FEV = upfDaCompetencia('2026-02');

// Reparte um total em `k` parcelas de 2 casas que somam EXATAMENTE o total
// (o resto de centavos vai para a primeira). Sem sorteio: a invariante tem de
// valer sempre, e um teste que muda a cada execução não prova nada.
const repartir = (total: Money, k: number): Money[] => {
  const centavos = total / CENTAVO;
  const cota = centavos / BigInt(k);
  const resto = centavos - cota * BigInt(k);
  return Array.from({ length: k }, (_, i) => (cota + (i === 0 ? resto : 0n)) * CENTAVO);
};

describe('acumulação por donatário', () => {
  it('invariante: a soma dos devidos é a apuração da base consolidada, em qualquer ordem e qualquer número de atos', () => {
    // O fato gerador é por donatário e a faixa sai da base ACUMULADA. Logo
    // fracionar não economiza — e essa é a propriedade que fecha o buraco.
    const totais = ['3324700.00', '4448500.00', '1000000.00', '127600.00', '255200.01'];
    for (const t of totais) {
      const total = parseMoney(t);
      const consolidado = impostoExato(total, UPF_FEV);
      for (let k = 1; k <= 7; k += 1) {
        const partes = repartir(total, k);
        // Todas as rotações da mesma partição: a ordem dos atos não pode mudar
        // o total devido (telescopagem de f).
        for (let giro = 0; giro < k; giro += 1) {
          const ordem = [...partes.slice(giro), ...partes.slice(0, giro)];
          const r = acumular(ordem, UPF_FEV);
          expect(r.baseConsolidada, `${t} em ${k} atos`).toBe(total);
          expect(r.totalDevido, `${t} em ${k} atos, giro ${giro}`).toBe(consolidado);
        }
        // E na ordem invertida, que é o caso que mais expõe erro de sinal.
        expect(acumular([...partes].reverse(), UPF_FEV).totalDevido).toBe(consolidado);
      }
    }
  });

  it('referência: quatro atos de R$ 831.175 somam o mesmo que um de R$ 3.324.700', () => {
    // SPEC §7.2. Sem acumulação daria 4 × 25.591,00 = R$ 102.364,00 — economia
    // indevida de R$ 84.500,00.
    const atos = Array.from({ length: 4 }, () => parseMoney('831175.00'));
    const r = acumular(atos, UPF_FEV);
    expect(r.atos.map((a) => formatMoney(a.devido))).toEqual([
      '25591.00', '46078.00', '49870.50', '65324.50',
    ]);
    expect(formatMoney(r.totalDevido)).toBe('186864.00');
    expect(r.totalDevido).toBe(impostoExato(parseMoney('3324700.00'), UPF_FEV));
  });

  it('referência: 35 atos de R$ 127.100, cada um isento sozinho, somam R$ 276.768,00 e não zero', () => {
    // Cada ato está abaixo dos 500 UPF (R$ 127.600). Somados, a base é
    // R$ 4.448.500 e cai na faixa de 8% (SPEC §7.2).
    const um = parseMoney('127100.00');
    expect(formatMoney(impostoExato(um, UPF_FEV))).toBe('0.00');

    const r = acumular(Array.from({ length: 35 }, () => um), UPF_FEV);
    expect(formatMoney(r.baseConsolidada)).toBe('4448500.00');
    expect(formatMoney(r.totalDevido)).toBe('276768.00');
    // Os primeiros atos continuam sem imposto: a faixa só é cruzada no caminho.
    expect(formatMoney(r.atos[0].devido)).toBe('0.00');
    expect(r.atos.some((a) => a.devido > 0n)).toBe(true);
  });

  it('acima do topo o incremento é linear: 8% cheios, sem nova dedução', () => {
    // SPEC §7.3 — anterior 3.000.000 (f = 160.888,00), mais 100.000 → 8.000,00.
    const anterior = parseMoney('3000000.00');
    expect(formatMoney(impostoExato(anterior, UPF_FEV))).toBe('160888.00');
    const devido = devidoDoAto(anterior, parseMoney('100000.00'), UPF_FEV);
    expect(formatMoney(devido)).toBe('8000.00');
  });

  it('base de ato negativa é recusada com erro: acumulação não anda para trás', () => {
    expect(() => devidoDoAto(parseMoney('100000.00'), parseMoney('-1.00'), UPF_FEV))
      .toThrow(/negativ/i);
  });
});
