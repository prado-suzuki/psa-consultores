import { describe, expect, it } from 'vitest';
import { formatMoney } from '@/lib/osg/itcmd/dinheiro';
import { COMPETENCIAS_UPF, upfDaCompetencia } from '@/lib/osg/itcmd/faixas';

describe('faixas e série de UPF', () => {
  it('invariante da série: a UPF NÃO é linear, então interpolar está proibido', () => {
    // Janeiro→março sobe 0,84 por mês; março→maio sobe 4,06 (SPEC §3.2). Quem
    // projetar +0,84 para maio erra R$ 737,80 por donatário acima de 10.000 UPF.
    const passo = (de: string, para: string) =>
      upfDaCompetencia(para) - upfDaCompetencia(de);

    expect(formatMoney(passo('2026-01', '2026-02'))).toBe('0.84');
    expect(formatMoney(passo('2026-02', '2026-03'))).toBe('0.84');
    // Se a série fosse linear este passo também seria 0,84 — e não é.
    expect(formatMoney(passo('2026-03', '2026-05'))).toBe('4.06');
    expect(formatMoney(upfDaCompetencia('2026-05'))).not.toBe('257.72');
    // A série é tabela, não fórmula: só existem as competências publicadas.
    expect(COMPETENCIAS_UPF.map((c) => c.competencia)).toEqual([
      '2026-01', '2026-02', '2026-03', '2026-05', '2026-08',
    ]);
  });

  it('competência desconhecida FALHA em vez de extrapolar', () => {
    // 2026-04 e 2026-06 existem no calendário e não na série publicada.
    for (const ausente of ['2026-04', '2026-06', '2026-07', '2027-01', 'abril/2026']) {
      expect(() => upfDaCompetencia(ausente)).toThrow(/UPF/i);
    }
    expect(formatMoney(upfDaCompetencia('2026-02'))).toBe('255.20');
  });
});
