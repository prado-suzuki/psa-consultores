import { describe, expect, it } from 'vitest';
import { conferirDecksGerados } from '@/lib/osg/resultadoGeracaoApresentacoes';

describe('conferirDecksGerados', () => {
  const esperadas = [
    { nome: 'Diagnóstico Patrimonial', tipo: 'patrimonial' as const },
    { nome: 'Quadro Societário e Organograma', tipo: 'societaria' as const },
  ];

  it('confirma cada apresentação devolvida pela chamada ambas', () => {
    expect(
      conferirDecksGerados(esperadas, {
        arquivos: [
          { tipo: 'patrimonial', nome: 'patrimonial.pptx' },
          { tipo: 'societaria', nome: 'societaria.pptx' },
        ],
        erro: null,
      }),
    ).toEqual({ gerados: ['patrimonial.pptx', 'societaria.pptx'], falhas: [] });
  });

  it('não transforma retorno parcial em sucesso total', () => {
    expect(
      conferirDecksGerados(esperadas, {
        arquivos: [{ tipo: 'patrimonial', nome: 'patrimonial.pptx' }],
        erro: null,
      }),
    ).toEqual({
      gerados: ['patrimonial.pptx'],
      falhas: ['Quadro Societário e Organograma: o servidor não devolveu o arquivo desta apresentação'],
    });
  });
});
