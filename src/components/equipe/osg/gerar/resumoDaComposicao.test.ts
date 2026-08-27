import { describe, expect, it } from 'vitest';
import type { BlocoDescartado, BlocoGerado } from '@/lib/templates';
import { blocosForaDaFolha, fraseExcluidosPorFlag, resumoDaFolha } from '@/components/equipe/osg/gerar/resumoDaComposicao';

const bloco = (id: string, instanciaDe?: string): BlocoGerado => ({
  id,
  instanciaDe,
  tipo: 'clausula',
  obrigatorio: true,
  conteudo: 'texto',
  segmentos: [{ tipo: 'texto', texto: 'texto' }],
});

const descartado = (id: string, motivo: BlocoDescartado['motivo'], instanciaDe?: string): BlocoDescartado => ({
  id,
  instanciaDe,
  tipo: 'clausula',
  motivo,
});

describe('resumoDaFolha — o rodapé não pode mentir', () => {
  it('conta o que SAIU, não o que foi composto', () => {
    // O sintoma: folha vazia e o rodapé anunciando "1 blocos · preenchido do
    // cadastro", porque a contagem era `template.blocos.length`.
    expect(
      resumoDaFolha({
        blocos: [],
        descartados: [descartado('posicao-fecho', 'lista-vazia')],
        totalNoModelo: 1,
        excluidosPorFlag: 0,
      }),
    ).toBe('0 de 1 blocos · 1 sem dado para preencher');
  });

  it('documento inteiro sai com a frase de sempre', () => {
    expect(
      resumoDaFolha({ blocos: [bloco('a'), bloco('b')], descartados: [], totalNoModelo: 2, excluidosPorFlag: 0 }),
    ).toBe('2 blocos · preenchido do cadastro');
  });

  it('distingue o que a flag tirou do que ficou sem dado', () => {
    expect(
      resumoDaFolha({
        blocos: [bloco('a')],
        descartados: [descartado('c', 'campos-vazios')],
        totalNoModelo: 3,
        excluidosPorFlag: 1,
      }),
    ).toBe('1 de 3 blocos · ajustado ao perfil da empresa · 1 sem dado para preencher');
  });

  it('condição não marcada tem frase própria, não vira "perfil da empresa"', () => {
    // As seis resoluções da alteração contratual moram no mesmo modelo do
    // contrato social: num contrato de constituição elas ficam de fora porque
    // nenhum evento foi marcado, e chamar isso de perfil da empresa mente.
    expect(
      resumoDaFolha({
        blocos: [bloco('a')],
        descartados: [],
        totalNoModelo: 7,
        excluidosPorFlag: 0,
        excluidosPorEvento: 6,
      }),
    ).toBe('1 de 7 blocos · 6 fora por condição não marcada');
  });

  it('os dois motivos convivem, cada um com a sua frase', () => {
    expect(
      resumoDaFolha({
        blocos: [bloco('a')],
        descartados: [],
        totalNoModelo: 5,
        excluidosPorFlag: 2,
        excluidosPorEvento: 2,
      }),
    ).toBe('1 de 5 blocos · ajustado ao perfil da empresa · 2 fora por condição não marcada');
  });

  it('conta POSIÇÕES do modelo: repetidor com sete instâncias não vira "7 de 2 blocos"', () => {
    const instancias = ['1', '2', '3', '4', '5', '6', '7'].map((n) => bloco(`p-imoveis#${n}`, 'p-imoveis'));
    expect(
      resumoDaFolha({
        blocos: [bloco('p-preambulo'), ...instancias],
        descartados: [],
        totalNoModelo: 2,
        excluidosPorFlag: 0,
      }),
    ).toBe('2 blocos · preenchido do cadastro');
  });
});

describe('blocosForaDaFolha', () => {
  it('nomeia a posição e explica o motivo', () => {
    const fora = blocosForaDaFolha(
      [descartado('posicao-fecho', 'lista-vazia'), descartado('posicao-memorial', 'tabela-vazia')],
      [],
      (id) => (id === 'posicao-fecho' ? 'Fecho e assinaturas' : 'Memorial descritivo'),
    );

    expect(fora).toEqual([
      {
        id: 'posicao-fecho',
        nome: 'Fecho e assinaturas',
        motivo: 'lista-vazia',
        explicacao: 'a lista que ele percorre não trouxe nenhum item',
      },
      {
        id: 'posicao-memorial',
        nome: 'Memorial descritivo',
        motivo: 'tabela-vazia',
        explicacao: 'a tabela dele saiu só com o cabeçalho',
      },
    ]);
  });

  it('explica que o parágrafo saiu porque a cláusula governante ficou de fora', () => {
    const fora = blocosForaDaFolha(
      [descartado('p-administracao', 'clausula-descartada')],
      [],
      () => 'Parágrafo — Administração e poderes (1)',
    );

    expect(fora).toEqual([
      {
        id: 'p-administracao',
        nome: 'Parágrafo — Administração e poderes (1)',
        motivo: 'clausula-descartada',
        explicacao: 'a cláusula que o governa ficou de fora',
      },
    ]);
  });

  it('repetidor que perdeu UMA instância e manteve outras não é avisado', () => {
    const fora = blocosForaDaFolha(
      [descartado('p#2', 'campos-vazios', 'p')],
      [bloco('p#1', 'p')],
      (id) => id,
    );
    expect(fora).toEqual([]);
  });

  it('não repete a mesma posição quando várias instâncias caem', () => {
    const fora = blocosForaDaFolha(
      [descartado('p#1', 'campos-vazios', 'p'), descartado('p#2', 'campos-vazios', 'p')],
      [],
      (id) => id,
    );
    expect(fora.map((b) => b.id)).toEqual(['p']);
  });
});

describe('fraseExcluidosPorFlag — o plural muda o verbo inteiro', () => {
  it('nenhum excluído: diz que tudo se aplica', () => {
    expect(fraseExcluidosPorFlag([])).toBe('Todas as cláusulas do modelo se aplicam a esta empresa.');
  });

  it('um excluído fica no singular', () => {
    expect(fraseExcluidosPorFlag(['Questões Diversas'])).toBe(
      '1 cláusula não se aplica a esta empresa e ficou de fora: Questões Diversas.',
    );
  });

  it('mais de um: "ficaram", nunca a palavra inexistente "ficouaram"', () => {
    const frase = fraseExcluidosPorFlag(['Questões Diversas', 'Teste Tabela GeoRef']);
    expect(frase).toBe(
      '2 cláusulas não se aplicam a esta empresa e ficaram de fora: Questões Diversas, Teste Tabela GeoRef.',
    );
    expect(frase).not.toContain('ficouaram');
  });
});
