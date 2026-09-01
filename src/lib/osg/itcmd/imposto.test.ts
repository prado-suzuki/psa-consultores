import { describe, expect, it } from 'vitest';
import { formatMoney, parseMoney } from '@/lib/osg/itcmd/dinheiro';
import { FAIXAS, faixaDaBase, tetoDaFaixa, upfDaCompetencia } from '@/lib/osg/itcmd/faixas';
import { aplicarFaixa, impostoExato } from '@/lib/osg/itcmd/imposto';

// UPF de fevereiro de 2026 — a competência dos casos de referência (SPEC §5).
const UPF_FEV = upfDaCompetencia('2026-02');
const CENTAVO = parseMoney('0.01');

// Tetos das faixas nessa competência (SPEC §8):
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
    // A competência move a tabela inteira: o teto é múltiplo da UPF.
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

  it('referência: as duas guias reais do Agro Aliança (GIA-ITCD 337978 e 338021)', () => {
    // Ambas de 21/05/2026, UPF de R$ 260,10. Junto com a de 2022 acima, as guias
    // reais passam a exercer as faixas 2, 3, 4 e 5 — todas as tributadas.
    //
    // A guia publica a base fatiada, e é dela que sai o total: isento até 500 UPF,
    // depois 500 UPF a 2%, 3.000 a 4%, 6.000 a 6% e o excedente a 8%. A forma
    // fechada tem que dar o mesmo número sem fatiar nada.
    const upf = upfDaCompetencia('2026-05');
    const casos: Array<[string, number, string]> = [
      // 338021, instituição de usufruto: base é 70% de 1.284.747,00.
      // Fatias publicadas: 130.050,00 a 2% + 639.222,90 a 4%.
      ['899322.90', 3, '28169.92'],
      // 337978, doação de 4.448.500,00 quotas com reserva de usufruto, base 100%.
      // Regina, 25,91%: 130.050,00 a 2% + 780.300,00 a 4% + 112.206,35 a 6%.
      ['1152606.35', 4, '40545.38'],
      // Cristina, 74,09%: as três acima cheias + 694.893,65 a 8%.
      ['3295893.65', 5, '183040.49'],
    ];
    for (const [base, ordem, esperado] of casos) {
      const m = parseMoney(base);
      expect(faixaDaBase(m, upf).ordem, `faixa de ${base}`).toBe(ordem);
      expect(formatMoney(impostoExato(m, upf)), `imposto de ${base}`).toBe(esperado);
    }
    // O "Valor Total do ITCD" da 337978 é a soma dos dois donatários.
    const total =
      impostoExato(parseMoney('1152606.35'), upf) + impostoExato(parseMoney('3295893.65'), upf);
    expect(formatMoney(total)).toBe('223585.87');
    // A isenção é por DONATÁRIO, não por doação: a guia desconta 500 × 260,10 de
    // cada um dos dois. É por isso que dividir reduz imposto até o limite da lei.
    expect(formatMoney(tetoDaFaixa(FAIXAS[0], upf)!)).toBe('130050.00');
  });

  it('referência: os três cenários do caso homologado (SPEC §8)', () => {
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
