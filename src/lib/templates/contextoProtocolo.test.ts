import { describe, expect, it } from 'vitest';

import { camposDoProtocolo, gradeDoProtocolo } from './contextoProtocolo';
import type { BeneficiarioDoProtocolo, SecaoDaGrade } from '@/lib/protocoloRemuneracao';

/*
 * Dois temas reais do modelo da casa, com as colunas que o Potrich usa de
 * verdade. "Veículos" tem duas linhas de propósito: é nele que se vê o tema
 * aparecer só na primeira, como na planilha.
 */
const colunas: BeneficiarioDoProtocolo[] = [
  { id: 'b-fundadores', nome: 'Sócios Fundadores', ordem: 10 },
  { id: 'b-sucessores', nome: 'Sucessores na Gestão', ordem: 20 },
];

const secoes: SecaoDaGrade[] = [
  {
    tema_id: 't-remuneracao',
    tema: 'Remuneração pelo trabalho, acionistas e figuras cativas',
    linhas: [
      {
        linha_id: 'l-pro-labore',
        item_id: 'i-pro-labore',
        item: 'Remuneração pelo trabalho',
        celulas: [
          {
            beneficiario_id: 'b-fundadores',
            beneficiario: 'Sócios Fundadores',
            texto: 'R$ 45.000,00 por Fundador',
          },
          { beneficiario_id: 'b-sucessores', beneficiario: 'Sucessores na Gestão', texto: null },
        ],
      },
    ],
  },
  {
    tema_id: 't-veiculos',
    tema: 'Veículos',
    linhas: [
      {
        linha_id: 'l-modelo',
        item_id: 'i-modelo',
        item: 'Modelo do Veículo',
        celulas: [
          { beneficiario_id: 'b-fundadores', beneficiario: 'Sócios Fundadores', texto: 'Hilux' },
          { beneficiario_id: 'b-sucessores', beneficiario: 'Sucessores na Gestão', texto: 'Strada' },
        ],
      },
      {
        linha_id: 'l-abastecimento',
        item_id: 'i-abastecimento',
        item: 'Abastecimento',
        celulas: [
          { beneficiario_id: 'b-fundadores', beneficiario: 'Sócios Fundadores', texto: null },
          { beneficiario_id: 'b-sucessores', beneficiario: 'Sucessores na Gestão', texto: null },
        ],
      },
    ],
  },
];

describe('camposDoProtocolo', () => {
  it('leva o texto de abertura aparado', () => {
    expect(camposDoProtocolo('  Este Protocolo visa regrar…  ')).toEqual({
      protocoloTextoDeAbertura: 'Este Protocolo visa regrar…',
    });
  });

  it('sem texto de abertura manda string vazia, e não a palavra null', () => {
    expect(camposDoProtocolo(null)).toEqual({ protocoloTextoDeAbertura: '' });
  });
});

describe('gradeDoProtocolo', () => {
  it('nomeia as listas com prefixo próprio, para não colidir no documento', () => {
    expect(Object.keys(gradeDoProtocolo(secoes, colunas))).toEqual([
      'protocoloColunas',
      'protocoloLinhas',
    ]);
  });

  it('põe a chave do papel por fora, senão a tela Gerar pede o campo à mão', () => {
    const { protocoloColunas } = gradeDoProtocolo(secoes, colunas);

    expect(protocoloColunas[0]).toEqual({ colunaDoProtocolo: { nome: 'Sócios Fundadores' } });
  });

  it('escreve o tema só na primeira linha do grupo, como a célula mesclada da planilha', () => {
    const { protocoloLinhas } = gradeDoProtocolo(secoes, colunas);
    const temas = protocoloLinhas.map(
      (l) => (l.linhaDoProtocolo as Record<string, string>).tema,
    );

    expect(temas).toEqual([
      'Remuneração pelo trabalho, acionistas e figuras cativas',
      'Veículos',
      '',
    ]);
  });

  it('achata os temas numa lista só de linhas, na ordem da grade', () => {
    const { protocoloLinhas } = gradeDoProtocolo(secoes, colunas);
    const itens = protocoloLinhas.map(
      (l) => (l.linhaDoProtocolo as Record<string, string>).item,
    );

    expect(itens).toEqual(['Remuneração pelo trabalho', 'Modelo do Veículo', 'Abastecimento']);
  });

  it('mantém a grade retangular: célula vazia vira string vazia e não some', () => {
    const { protocoloLinhas } = gradeDoProtocolo(secoes, colunas);

    /* A linha de Abastecimento não tem nada escrito e ainda assim traz as duas
       colunas: no documento, coluna que some desalinha o quadro inteiro. */
    const abastecimento = protocoloLinhas[2].celulas as Array<Record<string, unknown>>;

    expect(abastecimento).toHaveLength(2);
    expect(abastecimento[0]).toEqual({ celula: { texto: '' } });
  });

  it('leva o texto da célula preenchida como está', () => {
    const { protocoloLinhas } = gradeDoProtocolo(secoes, colunas);
    const proLabore = protocoloLinhas[0].celulas as Array<Record<string, unknown>>;

    expect(proLabore[0]).toEqual({ celula: { texto: 'R$ 45.000,00 por Fundador' } });
    expect(proLabore[1]).toEqual({ celula: { texto: '' } });
  });

  it('protocolo sem linha nenhuma devolve as listas vazias, e não quebra', () => {
    expect(gradeDoProtocolo([], colunas).protocoloLinhas).toEqual([]);
  });
});
