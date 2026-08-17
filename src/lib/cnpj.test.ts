import { describe, it, expect } from 'vitest';
import { cnpjIncompleto, formatarCnpj } from './cnpj';

describe('formatarCnpj', () => {
  it('formata o que foi digitado só com números', () => {
    expect(formatarCnpj('23112230000148')).toBe('23.112.230/0001-48');
  });

  it('acompanha a digitação parcial', () => {
    expect(formatarCnpj('23')).toBe('23');
    expect(formatarCnpj('231')).toBe('23.1');
    expect(formatarCnpj('23112230')).toBe('23.112.230');
    expect(formatarCnpj('231122300001')).toBe('23.112.230/0001');
  });

  it('mantém formatado o que já vem com máscara e descarta excesso', () => {
    expect(formatarCnpj('47.389.323/0001-82')).toBe('47.389.323/0001-82');
    expect(formatarCnpj('23112230000148999')).toBe('23.112.230/0001-48');
  });

  it('devolve vazio para nulo, vazio ou só pontuação', () => {
    expect(formatarCnpj(null)).toBe('');
    expect(formatarCnpj('')).toBe('');
    expect(formatarCnpj('.../-')).toBe('');
  });
});

describe('cnpjIncompleto', () => {
  it('acusa só quando há dígitos de menos', () => {
    expect(cnpjIncompleto('23.112.230/0001')).toBe(true);
    expect(cnpjIncompleto('23.112.230/0001-48')).toBe(false);
    expect(cnpjIncompleto('')).toBe(false);
    expect(cnpjIncompleto(null)).toBe(false);
  });
});
