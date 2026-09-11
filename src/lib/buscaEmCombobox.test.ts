import { describe, expect, it } from 'vitest';

import {
  casaSemAcento,
  grafiasDeDocumento,
  normalizarParaBusca,
  resumoDeDocumentos,
} from './buscaEmCombobox';

describe('normalizarParaBusca', () => {
  it('tira acento, caixa e espaço das pontas', () => {
    expect(normalizarParaBusca('  São Paulo Ltda  ')).toBe('sao paulo ltda');
    expect(normalizarParaBusca('AÇÃO & Ótica')).toBe('acao & otica');
  });

  it('preserva o que não é acento', () => {
    expect(normalizarParaBusca('12.345.678/0001-99')).toBe('12.345.678/0001-99');
  });
});

describe('casaSemAcento', () => {
  it('acha com e sem acento, nos dois sentidos', () => {
    expect(casaSemAcento(['São Paulo Comércio'], 'sao')).toBe(true);
    expect(casaSemAcento(['Sao Paulo Comercio'], 'são')).toBe(true);
  });

  it('busca vazia casa com tudo', () => {
    expect(casaSemAcento(['qualquer coisa'], '')).toBe(true);
    expect(casaSemAcento(['qualquer coisa'], '   ')).toBe(true);
  });

  it('exige trecho contínuo — letra salteada é trabalho do filtro do cmdk, não deste', () => {
    expect(casaSemAcento(['Cliente PSA'], 'clpsa')).toBe(false);
    expect(casaSemAcento(['Cliente PSA'], 'te ps')).toBe(true);
  });

  it('basta uma palavra-chave casar', () => {
    expect(casaSemAcento(['Cliente PSA', '12345678000199'], '12345')).toBe(true);
  });
});

describe('grafiasDeDocumento', () => {
  it('devolve CNPJ pontuado e só dígitos, nessa ordem', () => {
    expect(grafiasDeDocumento('12345678000199')).toEqual(['12.345.678/0001-99', '12345678000199']);
  });

  it('reconhece CPF de 11 dígitos', () => {
    expect(grafiasDeDocumento('12345678901')).toEqual(['123.456.789-01', '12345678901']);
  });

  it('normaliza documento que já veio pontuado', () => {
    expect(grafiasDeDocumento('12.345.678/0001-99')).toEqual(['12.345.678/0001-99', '12345678000199']);
  });

  it('não devolve palavra-chave vazia para documento ausente ou sem dígito', () => {
    expect(grafiasDeDocumento(null)).toEqual([]);
    expect(grafiasDeDocumento(undefined)).toEqual([]);
    expect(grafiasDeDocumento('')).toEqual([]);
    expect(grafiasDeDocumento('sem numero')).toEqual([]);
  });

  it('documento com contagem de dígitos fora do padrão sai uma vez só', () => {
    expect(grafiasDeDocumento('123')).toEqual(['123']);
  });
});

describe('resumoDeDocumentos', () => {
  it('um documento vira o próprio documento pontuado', () => {
    expect(resumoDeDocumentos(['12345678000199'])).toBe('12.345.678/0001-99');
  });

  it('mais de um vira a contagem', () => {
    expect(resumoDeDocumentos(['12345678000199', '98765432000100'])).toBe('2 CNPJs');
  });

  it('nenhum não vira texto nenhum', () => {
    expect(resumoDeDocumentos([])).toBeUndefined();
    expect(resumoDeDocumentos([''])).toBeUndefined();
  });
});
