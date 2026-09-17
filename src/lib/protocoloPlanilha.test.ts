import { describe, expect, it } from 'vitest';

import { nomeDoArquivo, planilhaDoProtocolo } from '@/lib/protocoloPlanilha';
import type { BeneficiarioDoProtocolo, SecaoDaGrade } from '@/lib/protocoloRemuneracao';

const COLUNAS: BeneficiarioDoProtocolo[] = [
  { id: 'b1', nome: 'Sócios Fundadores', ordem: 10 },
  { id: 'b2', nome: 'Sucessores na Gestão', ordem: 20 },
];

/* Um tema com duas linhas e outro com uma: é a diferença entre haver mesclagem
   de tema e não haver. */
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
          { beneficiario_id: 'b1', beneficiario: 'Sócios Fundadores', texto: 'Pela sociedade' },
          { beneficiario_id: 'b2', beneficiario: 'Sucessores na Gestão', texto: 'Idem' },
        ],
      },
    ],
  },
  {
    tema_id: 't-out',
    tema: 'Outros benefícios ou regras',
    linhas: [
      {
        linha_id: 'l3',
        item_id: 'i3',
        item: 'Outros assuntos',
        celulas: [
          { beneficiario_id: 'b1', beneficiario: 'Sócios Fundadores', texto: null },
          { beneficiario_id: 'b2', beneficiario: 'Sucessores na Gestão', texto: null },
        ],
      },
    ],
  },
];

/* As posições do modelo: C = tema, E = item, H e J = beneficiários. */
const C = 2;
const E = 4;
const H = 7;
const J = 9;

describe('a geometria é a do modelo da casa', () => {
  it('põe cada coisa na coluna em que o modelo põe', () => {
    const { celulas } = planilhaDoProtocolo(SECOES, COLUNAS, null);

    /* Linha 0 título, 1 "Critérios", 2 nomes das colunas, 3 primeiro item. */
    expect(celulas[0][C]).toBe('Protocolo de Remuneração');
    expect(celulas[1][C]).toBe('Critérios');
    expect(celulas[2][H]).toBe('Sócios Fundadores');
    expect(celulas[2][J]).toBe('Sucessores na Gestão');
    expect(celulas[3][C]).toBe('Veículos');
    expect(celulas[3][E]).toBe('Modelo do Veículo');
    expect(celulas[3][H]).toBe('Hilux SRX');
  });

  it('deixa as colunas de vão em branco, que é o que as faz vão', () => {
    const { celulas } = planilhaDoProtocolo(SECOES, COLUNAS, null);

    for (const vao of [0, 1, 3, 5, 6, 8]) expect(celulas[3][vao]).toBe('');
  });

  it('intercala linha em branco entre os itens, como o modelo faz', () => {
    /* É por isso que o modelo tem 106 linhas para 52 itens. */
    const { celulas } = planilhaDoProtocolo(SECOES, COLUNAS, null);

    expect(celulas[4].every((c) => c === '')).toBe(true);
    expect(celulas[5][E]).toBe('Abastecimento');
  });

  it('não deixa branco depois do último item do tema', () => {
    /* A mesclagem do tema tem de terminar num item. No modelo, C4:C14 acaba na
       linha 14, que é item, e não numa linha vazia. */
    const { celulas } = planilhaDoProtocolo(SECOES, COLUNAS, null);
    const ultimaDeVeiculos = celulas[5];

    expect(ultimaDeVeiculos[E]).toBe('Abastecimento');
    expect(celulas[6][C]).toBe('Outros benefícios ou regras');
  });
});

describe('as mesclagens', () => {
  it('mescla o título de ponta a ponta da grade', () => {
    const { mesclagens } = planilhaDoProtocolo(SECOES, COLUNAS, null);

    expect(mesclagens[0]).toEqual({ s: { r: 0, c: C }, e: { r: 0, c: J } });
  });

  it('mescla o tema verticalmente, do primeiro ao último item dele', () => {
    const { mesclagens } = planilhaDoProtocolo(SECOES, COLUNAS, null);
    const doTema = mesclagens.find((m) => m.s.c === C && m.s.r === 3);

    /* Veículos ocupa da linha 3 (Modelo) à 5 (Abastecimento), com a 4 em branco. */
    expect(doTema).toEqual({ s: { r: 3, c: C }, e: { r: 5, c: C } });
  });

  it('tema de um item só não vira mesclagem, que o Excel recusa faixa de uma linha', () => {
    const { mesclagens } = planilhaDoProtocolo(SECOES, COLUNAS, null);

    expect(mesclagens.find((m) => m.s.c === C && m.s.r === 6)).toBeUndefined();
  });

  it('o texto de abertura empurra tudo para baixo e leva mesclagem própria', () => {
    const { celulas, mesclagens } = planilhaDoProtocolo(SECOES, COLUNAS, 'Este Protocolo…');

    expect(celulas[1][C]).toBe('Este Protocolo…');
    expect(celulas[2][C]).toBe('Critérios');
    expect(mesclagens[1]).toEqual({ s: { r: 1, c: C }, e: { r: 1, c: J } });
  });
});

describe('as larguras', () => {
  it('são as do modelo, inclusive as duas primeiras ocultas', () => {
    const { larguras } = planilhaDoProtocolo(SECOES, COLUNAS, null);

    expect(larguras[0]).toEqual({ wch: 1.5, hidden: true });
    expect(larguras[1]).toEqual({ wch: 3.125, hidden: true });
    expect(larguras[C]).toEqual({ wch: 8.625 });
    expect(larguras[E]).toEqual({ wch: 19.375 });
  });

  it('a coluna do beneficiário nasce larga, porque ali mora parágrafo', () => {
    const { larguras } = planilhaDoProtocolo(SECOES, COLUNAS, null);

    expect(larguras[H].wch).toBe(24);
    /* E o vão entre beneficiários é estreito, como o I e o K do modelo. */
    expect(larguras[8]).toEqual({ wch: 4.5 });
    expect(larguras[J].wch).toBe(24);
  });
});

describe('os casos de borda', () => {
  it('protocolo sem linha nenhuma ainda sai com título e cabeçalho', () => {
    const { celulas } = planilhaDoProtocolo([], COLUNAS, null);

    expect(celulas).toHaveLength(3);
    expect(celulas[2][H]).toBe('Sócios Fundadores');
  });

  it('célula sem regra sai vazia, e a linha mantém a largura da grade', () => {
    const { celulas } = planilhaDoProtocolo(SECOES, COLUNAS, null);

    expect(celulas[3][J]).toBe('');
    expect(celulas[3]).toHaveLength(J + 1);
  });
});

describe('nomeDoArquivo', () => {
  it('leva cliente e versão, porque as versões circulam juntas', () => {
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
