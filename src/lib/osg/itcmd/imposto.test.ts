import { describe, expect, it } from 'vitest';
import { formatMoney, parseMoney } from '@/lib/osg/itcmd/dinheiro';
import { FAIXAS, faixaDaBase, tetoDaFaixa, upfDaCompetencia } from '@/lib/osg/itcmd/faixas';
import { aplicarFaixa, impostoExato } from '@/lib/osg/itcmd/imposto';

// UPF de fevereiro de 2026 — a competência de todos os casos do WP (SPEC §5).
const UPF_FEV = upfDaCompetencia('2026-02');
const CENTAVO = parseMoney('0.01');

// Tetos das faixas nessa competência (SPEC §8, células D92:D95):
// 500 · 1.000 · 4.000 · 10.000 UPF = 127.600 · 255.200 · 1.020.800 · 2.552.000.
const TETOS = FAIXAS.slice(0, 4).map((f) => tetoDaFaixa(f, UPF_FEV)!);

describe('imposto — forma fechada', () => {
  it('faixa: um caso dentro de cada uma das cinco faixas', () => {
    // Cada linha traz a conta feita à mão a partir de `alíquota × base − dedução × UPF`.
    const casos: Array<[string, number, string]> = [
      // isento: nada a apurar
      ['100000.00', 1, '0.00'],
      // 0,02 × 200.000     −  10 × 255,20 =   4.000,00 −  2.552,00
      ['200000.00', 2, '1448.00'],
      // 0,04 × 500.000     −  30 × 255,20 =  20.000,00 −  7.656,00
      ['500000.00', 3, '12344.00'],
      // 0,06 × 2.000.000   − 110 × 255,20 = 120.000,00 − 28.072,00
      ['2000000.00', 4, '91928.00'],
      // 0,08 × 3.324.700   − 310 × 255,20 = 265.976,00 − 79.112,00
      ['3324700.00', 5, '186864.00'],
    ];
    for (const [base, ordem, esperado] of casos) {
      const m = parseMoney(base);
      expect(faixaDaBase(m, UPF_FEV).ordem, `faixa de ${base}`).toBe(ordem);
      expect(formatMoney(impostoExato(m, UPF_FEV)), `imposto de ${base}`).toBe(esperado);
    }
  });

  it('limite: base igual ao teto cai na faixa DE BAIXO, e um centavo acima sobe', () => {
    TETOS.forEach((teto, i) => {
      const ordemDeBaixo = FAIXAS[i].ordem;
      expect(faixaDaBase(teto, UPF_FEV).ordem, `teto ${formatMoney(teto)}`).toBe(ordemDeBaixo);
      expect(faixaDaBase(teto + CENTAVO, UPF_FEV).ordem).toBe(ordemDeBaixo + 1);
      // Um centavo ABAIXO do teto obviamente também é a de baixo — o que este
      // ramo prende é o `<=`, não o `<`.
      expect(faixaDaBase(teto - CENTAVO, UPF_FEV).ordem).toBe(ordemDeBaixo);
    });
    // Os tetos são os do WP (D92:D95): a competência move a tabela inteira.
    expect(TETOS.map(formatMoney)).toEqual([
      '127600.00', '255200.00', '1020800.00', '2552000.00',
    ]);
  });

  it('continuidade: nos quatro limites a função não dá salto', () => {
    // É para isto que as deduções de 0/10/30/110/310 UPF existem. Dedução errada
    // aparece como degrau exatamente aqui, e nenhuma lista de valores pega isso.
    TETOS.forEach((teto, i) => {
      const deBaixo = aplicarFaixa(FAIXAS[i], teto, UPF_FEV);
      const deCima = aplicarFaixa(FAIXAS[i + 1], teto, UPF_FEV);
      expect(deCima, `degrau no teto ${formatMoney(teto)}`).toBe(deBaixo);

      // E pouco antes / pouco depois: a diferença é só a alíquota de cima
      // aplicada ao centavo que separa os dois pontos.
      const antes = impostoExato(teto, UPF_FEV);
      const depois = impostoExato(teto + CENTAVO, UPF_FEV);
      expect(depois - antes).toBe(FAIXAS[i + 1].aliquotaPercentual * CENTAVO / 100n);
    });
  });

  it('referência: a guia real da SEFAZ/MT (GIA-ITCD A 213388, 02/09/2022)', () => {
    // A guia publica (188.500,94 − 110.515,00) × 2% = 1.559,72. Os R$ 110.515,00
    // são 500 × 221,03 — o teto da faixa isenta naquela competência, que a forma
    // fechada escreve como dedução de 10 UPF.
    const upf2022 = parseMoney('221.03');
    const base = parseMoney('188500.94');
    expect(faixaDaBase(base, upf2022).ordem).toBe(2);
    expect(formatMoney(impostoExato(base, upf2022))).toBe('1559.72');
    // A UPF de 2022 não está na série de 2026: ela entra como valor, e é assim
    // que uma guia antiga se confere sem poluir a série publicada.
  });

  it('referência: os três cenários do caso homologado (SPEC §8, E97/G97/I97)', () => {
    const casos: Array<[string, string]> = [
      ['3324700.00', '186864.00'],
      ['14577996.03', '1087127.68'],
      ['161480140.91', '12839299.27'],
    ];
    for (const [base, esperado] of casos) {
      expect(formatMoney(impostoExato(parseMoney(base), UPF_FEV)), base).toBe(esperado);
    }
  });

  it('imposto negativo LANÇA erro, nunca trunca em zero', () => {
    // Só é alcançável com a faixa resolvida errada — é justamente esse defeito
    // que a guarda pega. 0,08 × 100.000 − 310 × 255,20 = 8.000 − 79.112 < 0.
    const faixa5 = FAIXAS[4];
    expect(() => aplicarFaixa(faixa5, parseMoney('100000.00'), UPF_FEV)).toThrow(/negativ/i);
    // Pela via normal a mesma base é isenta, e isento é zero de verdade.
    expect(formatMoney(impostoExato(parseMoney('100000.00'), UPF_FEV))).toBe('0.00');
  });

  it('base com mais de duas casas é recusada: é ela que garante a exatidão', () => {
    // A base por donatário é quantizada ANTES da fórmula (SPEC §2.3). Sem isso,
    // alíquota × base pode passar de 4 casas e a escala 1e-4 deixaria de ser exata.
    expect(() => impostoExato(parseMoney('14577996.025'), UPF_FEV)).toThrow(/duas casas/i);
  });
});
