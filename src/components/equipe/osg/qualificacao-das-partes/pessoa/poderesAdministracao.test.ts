import { describe, expect, it } from 'vitest';
import {
  descreverExcecao, descreverPoderes, lerPoderes, poderesParaGravar, poderesVazios,
} from './poderesAdministracao';

/**
 * O cenário aqui é o inverso do caso do teste e2e (que era "isolada, exceto os
 * atos da cláusula sexta"): uma diretoria que assina EM CONJUNTO como regra e
 * tem exceções em que um administrador age sozinho. Se a estrutura só soubesse
 * descrever o caso da MMS, este cadastro não caberia.
 */
const diretoriaConjunta = {
  forma: 'conjunta' as const,
  excecoes: [
    { atos: 'movimentação bancária até R$ 50.000,00', exigencia: 'isolada' as const },
    { atos: 'representação perante órgãos públicos', exigencia: 'isolada' as const },
  ],
  observacao: 'Alienação de imóveis depende de aprovação em reunião de sócios.',
};

describe('poderesAdministracao', () => {
  it('grava a regra geral, as exceções e a observação, e mantém o booleano legado em sincronia', () => {
    const gravado = poderesParaGravar(diretoriaConjunta);
    expect(gravado.pode_isoladamente).toBe(false);
    expect(gravado.poderes.excecoes).toHaveLength(2);
    expect(gravado.poderes.excecoes[0]).toEqual({
      atos: 'movimentação bancária até R$ 50.000,00', exigencia: 'isolada',
    });
    expect(gravado.poderes.observacao).toBe('Alienação de imóveis depende de aprovação em reunião de sócios.');
  });

  it('sobrevive à ida e volta do banco sem perder nenhuma exceção', () => {
    const ida = poderesParaGravar(diretoriaConjunta).poderes;
    expect(lerPoderes(JSON.parse(JSON.stringify(ida)), false)).toEqual(diretoriaConjunta);
  });

  it('descarta exceção em branco e apara os textos', () => {
    const { poderes } = poderesParaGravar({
      forma: 'isolada',
      excecoes: [{ atos: '  atos da cláusula sexta  ', exigencia: 'conjunta' }, { atos: '   ', exigencia: 'conjunta' }],
      observacao: '  ',
    });
    expect(poderes.excecoes).toEqual([{ atos: 'atos da cláusula sexta', exigencia: 'conjunta' }]);
    expect(poderes.observacao).toBe('');
  });

  it('espelha o booleano quando a forma é isolada', () => {
    expect(poderesParaGravar({ ...poderesVazios(), forma: 'isolada' }).pode_isoladamente).toBe(true);
  });

  it('deriva a forma do cadastro antigo, que só tinha o booleano', () => {
    expect(lerPoderes(null, true)).toEqual({ forma: 'isolada', excecoes: [], observacao: '' });
    expect(lerPoderes(null, null)).toEqual({ forma: 'conjunta', excecoes: [], observacao: '' });
  });

  it('ignora conteúdo malformado vindo do jsonb sem quebrar a tela', () => {
    expect(lerPoderes('não é objeto', true).forma).toBe('isolada');
    expect(lerPoderes({ forma: 'qualquer', excecoes: 'nada disso' }, false)).toEqual({
      forma: 'conjunta', excecoes: [], observacao: '',
    });
    expect(lerPoderes({ excecoes: [{ atos: 'aval', exigencia: 'inventada' }] }, true).excecoes).toEqual([
      { atos: 'aval', exigencia: 'conjunta' },
    ]);
  });

  it('resume os poderes para a lista, contando as exceções', () => {
    expect(descreverPoderes(poderesVazios())).toBe('Assina em conjunto');
    expect(descreverPoderes({ ...poderesVazios(), forma: 'isolada' })).toBe('Assina isoladamente');
    expect(descreverPoderes(diretoriaConjunta)).toBe('Assina em conjunto, com 2 exceções');
    expect(descreverPoderes({ ...diretoriaConjunta, excecoes: diretoriaConjunta.excecoes.slice(0, 1) }))
      .toBe('Assina em conjunto, com 1 exceção');
    expect(descreverExcecao(diretoriaConjunta.excecoes[0]))
      .toBe('movimentação bancária até R$ 50.000,00: assina isoladamente');
  });
});
