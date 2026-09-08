import { describe, expect, it } from 'vitest';
import { resolverModelo } from './modeloDocumento';

const completo = {
  modelo_bucket: 'osg-modelos',
  modelo_path: 'documento-tipo/bem--x/Modelo X.xlsx',
  modelo_nome: 'Planilha X (modelo).xlsx',
};

describe('resolverModelo', () => {
  it('devolve o modelo quando bucket e caminho estão preenchidos', () => {
    expect(resolverModelo(completo)).toEqual({
      bucket: 'osg-modelos',
      path: 'documento-tipo/bem--x/Modelo X.xlsx',
      nome: 'Planilha X (modelo).xlsx',
    });
  });

  it('sem caminho não há modelo, que é o estado dos 60+ tipos sem planilha', () => {
    expect(resolverModelo({ ...completo, modelo_path: null })).toBeNull();
    expect(resolverModelo({ ...completo, modelo_path: '   ' })).toBeNull();
  });

  it('sem bucket também não há: endereço pela metade não vira botão', () => {
    expect(resolverModelo({ ...completo, modelo_bucket: null })).toBeNull();
  });

  it('entrada nula ou ausente devolve nulo, e não estoura', () => {
    expect(resolverModelo(null)).toBeNull();
    expect(resolverModelo(undefined)).toBeNull();
  });

  it('sem nome amigável, usa o basename do caminho', () => {
    expect(resolverModelo({ ...completo, modelo_nome: null })?.nome).toBe('Modelo X.xlsx');
    expect(resolverModelo({ ...completo, modelo_nome: '  ' })?.nome).toBe('Modelo X.xlsx');
  });

  it('caminho sem barra é o próprio nome', () => {
    const semPasta = { ...completo, modelo_path: 'Modelo.xlsx', modelo_nome: null };
    expect(resolverModelo(semPasta)?.nome).toBe('Modelo.xlsx');
  });
});
