import { describe, expect, it } from 'vitest';

import { nomeDoArquivo, planilhaDoProtocolo } from '@/lib/protocoloPlanilha';
import type { BeneficiarioDoProtocolo, SecaoDaGrade } from '@/lib/protocoloRemuneracao';

const COLUNAS: BeneficiarioDoProtocolo[] = [
  { id: 'b1', nome: 'Sócios Fundadores', ordem: 10 },
  { id: 'b2', nome: 'Sucessores na Gestão', ordem: 20 },
];

/* Um tema com duas linhas, que é onde se vê o tema aparecer só na primeira. */
const SECOES: SecaoDaGrade[] = [
  {
    tema_id: 't-vei',
    tema: 'Veículos',
    linhas: [
      {
        linha_id: 'l1',
        item_id: 'i1',
        item: 'Modelo do Veículo',
        celulas: [
          { beneficiario_id: 'b1', beneficiario: 'Sócios Fundadores', texto: 'Hilux SRX' },
          { beneficiario_id: 'b2', beneficiario: 'Sucessores na Gestão', texto: null },
        ],
      },
      {
        linha_id: 'l2',
        item_id: 'i2',
        item: 'Abastecimento',
        celulas: [
          { beneficiario_id: 'b1', beneficiario: 'Sócios Fundadores', texto: 'Por conta da sociedade' },
          { beneficiario_id: 'b2', beneficiario: 'Sucessores na Gestão', texto: 'Idem' },
        ],
      },
    ],
  },
];

describe('planilhaDoProtocolo', () => {
  it('reproduz o layout do modelo: tema, item, e uma coluna por beneficiário', () => {
    const { celulas } = planilhaDoProtocolo(SECOES, COLUNAS, null);

    expect(celulas).toEqual([
      ['Protocolo de Remuneração', '', '', ''],
      ['', '', '', ''],
      ['Critérios', '', 'Sócios Fundadores', 'Sucessores na Gestão'],
      ['Veículos', 'Modelo do Veículo', 'Hilux SRX', ''],
      ['', 'Abastecimento', 'Por conta da sociedade', 'Idem'],
    ]);
  });

  it('escreve o tema só na primeira linha do grupo, como a célula mesclada', () => {
    const { celulas } = planilhaDoProtocolo(SECOES, COLUNAS, null);

    expect(celulas[3][0]).toBe('Veículos');
    expect(celulas[4][0]).toBe('');
  });

  it('célula sem regra sai vazia, e a linha mantém todas as colunas', () => {
    /* A saída é um quadro: coluna que some desalinha a leitura inteira. */
    const { celulas } = planilhaDoProtocolo(SECOES, COLUNAS, null);

    expect(celulas[3]).toHaveLength(4);
    expect(celulas[3][3]).toBe('');
  });

  it('o texto de abertura entra como segunda linha quando existe', () => {
    const { celulas } = planilhaDoProtocolo(SECOES, COLUNAS, '  Este Protocolo visa regrar…  ');

    expect(celulas[1][0]).toBe('Este Protocolo visa regrar…');
    expect(celulas[2]).toEqual(['', '', '', '']);
  });

  it('sem texto de abertura não sobra linha fantasma', () => {
    /* O modelo da casa não tem preâmbulo e começa direto. Uma linha a mais
       desalinharia a conferência contra ele. */
    const semPreambulo = planilhaDoProtocolo(SECOES, COLUNAS, null).celulas;
    const comPreambulo = planilhaDoProtocolo(SECOES, COLUNAS, 'Texto').celulas;

    expect(comPreambulo).toHaveLength(semPreambulo.length + 1);
    expect(semPreambulo[1]).toEqual(['', '', '', '']);
  });

  it('a coluna da regra nasce larga, porque ali mora parágrafo', () => {
    const { larguras } = planilhaDoProtocolo(SECOES, COLUNAS, null);

    expect(larguras).toHaveLength(4);
    expect(larguras[2].wch).toBeGreaterThan(40);
  });

  it('protocolo sem linha nenhuma ainda sai com cabeçalho', () => {
    const { celulas } = planilhaDoProtocolo([], COLUNAS, null);

    expect(celulas).toHaveLength(3);
    expect(celulas[2]).toEqual(['Critérios', '', 'Sócios Fundadores', 'Sucessores na Gestão']);
  });
});

describe('nomeDoArquivo', () => {
  it('leva cliente e versão, porque as versões circulam juntas', () => {
    /* No acervo o Toqueto tem V1 e VF lado a lado na mesma pasta: sem a versão
       no nome, a segunda baixada vira "(1)" e ninguém sabe qual é qual. */
    expect(nomeDoArquivo('Toqueto', 2)).toBe('Protocolo-de-Remuneracao-Toqueto-v2.xlsx');
  });

  it('desmonta pontuação e acento, que em nome de arquivo é caminho ou lixo', () => {
    expect(nomeDoArquivo('[TESTE 1 · ENVIAR] Abacaxi Elétrico Mineração e Balé S.A.', 1)).toBe(
      'Protocolo-de-Remuneracao-TESTE-1-ENVIAR-Abacaxi-Eletrico-Mineracao-e-Bale-S-A-v1.xlsx',
    );
  });

  it('nome que vira nada não deixa o arquivo sem identidade', () => {
    expect(nomeDoArquivo('···', 1)).toBe('Protocolo-de-Remuneracao-cliente-v1.xlsx');
  });
});
