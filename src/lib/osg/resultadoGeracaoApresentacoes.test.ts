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

  // A função sempre mandou o motivo por deck em `erros`; o cliente descartava e a
  // pessoa lia o genérico para uma falha que tinha nome.
  it('usa o motivo daquele deck, e não o genérico, quando o servidor diz qual foi', () => {
    expect(
      conferirDecksGerados(esperadas, {
        arquivos: [{ tipo: 'patrimonial', nome: 'patrimonial.pptx' }],
        erro: null,
        errosPorDeck: [
          { tipo: 'societaria', message: 'Template ausente: TEMPLATE_SOCIETARIA.pptx' },
        ],
      }),
    ).toEqual({
      gerados: ['patrimonial.pptx'],
      falhas: ['Quadro Societário e Organograma: Template ausente: TEMPLATE_SOCIETARIA.pptx'],
    });
  });

  it('o erro de outro deck não é usado no lugar do genérico', () => {
    const r = conferirDecksGerados(esperadas, {
      arquivos: [{ tipo: 'patrimonial', nome: 'patrimonial.pptx' }],
      erro: null,
      errosPorDeck: [{ tipo: 'patrimonial', message: 'algo do patrimonial' }],
    });
    expect(r.falhas).toEqual([
      'Quadro Societário e Organograma: o servidor não devolveu o arquivo desta apresentação',
    ]);
  });
});
