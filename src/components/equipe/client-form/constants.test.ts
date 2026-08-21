import { describe, expect, it } from 'vitest';

import { formatDateMask, motivoDataInvalida, parseDateMask } from './constants';

// O defeito que originou estes testes: `parseDateMask` conferia só faixas, então
// 31/06/2026 virava a string "2026-06-31". A tela relia esse valor e o
// JavaScript rolava para 01/07/2026, de modo que o campo mostrava uma data e o
// rascunho guardava outra, impossível, que só estourava no banco ao salvar.

describe('formatDateMask', () => {
  it('vai pondo as barras conforme os dígitos entram', () => {
    expect(formatDateMask('3')).toBe('3');
    expect(formatDateMask('3106')).toBe('31/06');
    expect(formatDateMask('31062026')).toBe('31/06/2026');
  });

  it('ignora o que não é dígito e para em oito', () => {
    expect(formatDateMask('31/06/2026999')).toBe('31/06/2026');
  });
});

describe('parseDateMask', () => {
  it('aceita data que existe', () => {
    expect(parseDateMask('30/06/2026')).toBe('2026-06-30');
    expect(parseDateMask('31/12/2026')).toBe('2026-12-31');
    expect(parseDateMask('01/01/2000')).toBe('2000-01-01');
  });

  it('recusa dia que o mês não tem', () => {
    expect(parseDateMask('31/06/2026')).toBeNull();
    expect(parseDateMask('31/04/2026')).toBeNull();
    expect(parseDateMask('30/02/2026')).toBeNull();
  });

  it('trata fevereiro pelo calendário, não por regra escrita à mão', () => {
    expect(parseDateMask('29/02/2026')).toBeNull();
    expect(parseDateMask('29/02/2028')).toBe('2028-02-29');
    expect(parseDateMask('28/02/2026')).toBe('2026-02-28');
  });

  it('recusa faixa impossível de dia e de mês', () => {
    expect(parseDateMask('00/01/2026')).toBeNull();
    expect(parseDateMask('32/01/2026')).toBeNull();
    expect(parseDateMask('01/13/2026')).toBeNull();
    expect(parseDateMask('01/00/2026')).toBeNull();
  });

  it('recusa ano fora do período aceito e máscara incompleta', () => {
    expect(parseDateMask('31/12/1999')).toBeNull();
    expect(parseDateMask('01/01/2061')).toBeNull();
    expect(parseDateMask('31/06/20')).toBeNull();
    expect(parseDateMask('')).toBeNull();
  });
});

describe('motivoDataInvalida', () => {
  it('não devolve motivo quando a data é boa', () => {
    expect(motivoDataInvalida('30/06/2026')).toBeNull();
    expect(motivoDataInvalida('29/02/2028')).toBeNull();
  });

  it('separa data que não existe de máscara incompleta e de ano fora do período', () => {
    expect(motivoDataInvalida('31/06/2026')).toBe('inexistente');
    expect(motivoDataInvalida('30/02/2026')).toBe('inexistente');
    expect(motivoDataInvalida('01/13/2026')).toBe('inexistente');
    expect(motivoDataInvalida('31/06/20')).toBe('incompleta');
    expect(motivoDataInvalida('')).toBe('incompleta');
    expect(motivoDataInvalida('31/12/1999')).toBe('fora_do_periodo');
    expect(motivoDataInvalida('01/01/2061')).toBe('fora_do_periodo');
  });
});
