import { describe, expect, it } from 'vitest';

import { letraDaColuna, nomeDoArquivo, planilhaXmlDoProtocolo } from '@/lib/protocoloPlanilhaXml';
import type { BeneficiarioDoProtocolo, SecaoDaGrade } from '@/lib/protocoloRemuneracao';

/*
 * O envelope do modelo, reduzido ao que a função precisa encontrar para trocar.
 * O importante é que `<cols>` e `<pageSetup>` estejam aqui: eles NÃO podem ser
 * tocados, e é por isso que a saída sai com a cara do modelo.
 */
const MODELO =
  '<?xml version="1.0"?><worksheet><dimension ref="A1:L106"/>' +
  '<cols><col min="3" max="3" width="8.625"/></cols>' +
  '<sheetData><row r="1"><c r="C1" s="14"/></row></sheetData>' +
  '<mergeCells count="15"><mergeCell ref="C1:L1"/></mergeCells>' +
  '<pageMargins left="1"/><pageSetup orientation="landscape"/></worksheet>';

const COLUNAS: BeneficiarioDoProtocolo[] = [
  { id: 'b1', nome: 'Sócios Fundadores', ordem: 10 },
  { id: 'b2', nome: 'Sucessores na Gestão', ordem: 20 },
];

const SECOES: SecaoDaGrade[] = [
  {
    tema_id: 't1',
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
    tema_id: 't2',
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

const gerar = () => planilhaXmlDoProtocolo(MODELO, SECOES, COLUNAS).xml;

describe('o que do modelo NÃO se toca', () => {
  it('preserva as larguras de coluna, que são metade da cara do arquivo', () => {
    expect(gerar()).toContain('<cols><col min="3" max="3" width="8.625"/></cols>');
  });

  it('preserva a configuração de impressão e as margens', () => {
    const xml = gerar();

    expect(xml).toContain('<pageSetup orientation="landscape"/>');
    expect(xml).toContain('<pageMargins left="1"/>');
  });

  it('troca só o sheetData, as mesclagens e a dimensão', () => {
    const xml = gerar();

    /* 3 de cabeçalho + item, vão, item, vão entre temas, e o item do segundo
       tema = 8 linhas. A última coluna é J porque são dois beneficiários. */
    expect(xml).not.toContain('A1:L106');
    expect(xml).toContain('<dimension ref="A1:J8"/>');
  });
});

describe('os estilos são os do modelo, por posição', () => {
  it('o título usa o estilo 14 e a linha nasce oculta, como no modelo', () => {
    const xml = gerar();

    expect(xml).toContain('<row r="1" spans="3:10" ht="24.95" hidden="1" customHeight="1">');
    expect(xml).toContain('<c r="C1" s="14" t="inlineStr">');
  });

  it('a segunda linha também é oculta, que é o que o Potrich entregue faz', () => {
    expect(gerar()).toContain('ht="27" hidden="1" customHeight="1"');
  });

  it('o nome da coluna usa o estilo 8, e o vão entre elas o 12', () => {
    const xml = gerar();

    expect(xml).toContain('<c r="H3" s="8" t="inlineStr"><is><t xml:space="preserve">Sócios Fundadores');
    expect(xml).toContain('<c r="I3" s="12"/>');
  });

  it('na linha de item: tema 15, item 4, valor 9, vãos 3 e 10', () => {
    const xml = gerar();
    const linha = xml.slice(xml.indexOf('<row r="4"'), xml.indexOf('<row r="5"'));

    expect(linha).toContain('<c r="C4" s="15" t="inlineStr"><is><t xml:space="preserve">Veículos');
    expect(linha).toContain('<c r="D4" s="3"/>');
    expect(linha).toContain('<c r="E4" s="4" t="inlineStr"><is><t xml:space="preserve">Modelo do Veículo');
    expect(linha).toContain('<c r="H4" s="9" t="inlineStr"><is><t xml:space="preserve">Hilux SRX');
    expect(linha).toContain('<c r="G4" s="10"/>');
  });

  it('a linha de vão é baixa e só carrega a célula do tema', () => {
    const xml = gerar();
    const vao = xml.slice(xml.indexOf('<row r="5"'), xml.indexOf('<row r="6"'));

    expect(vao).toContain('ht="3.95" customHeight="1"');
    expect(vao).toContain('<c r="C5" s="15"/>');
    expect(vao).not.toContain('r="E5"');
  });
});

describe('a grade', () => {
  it('intercala vão entre itens e NÃO depois do último do tema', () => {
    /* A mesclagem do tema tem de terminar num item, como no modelo, onde C4:C14
       acaba na linha 14, que é item. */
    const xml = gerar();

    expect(xml).toContain('<row r="6"'); // Abastecimento, o segundo item
    expect(xml).toContain('<c r="E6" s="4" t="inlineStr"><is><t xml:space="preserve">Abastecimento');
  });

  it('SEPARA UM TEMA DO SEGUINTE com uma linha inteiramente vazia', () => {
    /*
     * Foi o defeito que a consultoria viu no arquivo baixado: os temas saíam
     * colados. No modelo existe uma linha entre um bloco e o outro, e ela é de
     * outra natureza que o vão de dentro do tema: não tem célula NENHUMA, é
     * auto-fechada, fica fora de qualquer mesclagem e é um pouco mais alta
     * (5.1 contra 3.95). Medido nas onze passagens de tema do modelo: C4:C14
     * termina em 14 e C16:C22 começa em 16, com a 15 vazia no meio.
     */
    const xml = gerar();

    expect(xml).toContain('<row r="7" spans="3:10" ht="5.1" customHeight="1"/>');
    /* E o tema seguinte começa DEPOIS dela, não colado no item anterior. */
    expect(xml).toContain('<c r="C8" s="15" t="inlineStr"><is><t xml:space="preserve">Outros benefícios');
  });

  it('não põe vão antes do PRIMEIRO tema, que não tem nada acima para separar', () => {
    const xml = gerar();

    expect(xml).toContain('<row r="4" spans="3:10" s="2" customFormat="1" ht="30">');
    expect(xml).not.toContain('<row r="4" spans="3:10" ht="5.1" customHeight="1"/>');
  });

  it('mescla o tema do primeiro ao último item dele', () => {
    expect(gerar()).toContain('<mergeCell ref="C4:C6"/>');
  });

  it('tema de um item só não vira mesclagem', () => {
    expect(gerar()).not.toContain('<mergeCell ref="C7:C7"/>');
  });

  it('mescla o título de ponta a ponta e o "Critérios" sobre tema e item', () => {
    const xml = gerar();

    expect(xml).toContain('<mergeCell ref="C1:J1"/>');
    expect(xml).toContain('<mergeCell ref="C2:E3"/>');
  });

  it('célula sem regra sai vazia mas existe, porque coluna que some desalinha', () => {
    expect(gerar()).toContain('<c r="J4" s="9"/>');
  });
});

describe('o texto de abertura', () => {
  it('NÃO vai para a planilha, e a grade começa logo abaixo do cabeçalho', () => {
    /*
     * Ele foi escrito na entrega de 17/09, acima do cabeçalho, como no Potrich,
     * e a consultoria tirou em 18/09: na planilha aquilo vira uma faixa de texto
     * no topo que ninguém pediu. O campo continua no cadastro, com destino no
     * instrumento em prosa.
     *
     * A linha 3 é o cabeçalho e a 4 é o primeiro tema. Sem esta asserção, um
     * preâmbulo que voltasse a ser escrito empurraria a grade uma linha para
     * baixo sem quebrar mais nada.
     */
    const xml = gerar();

    expect(xml).not.toContain('Este Protocolo visa regrar');
    expect(xml).toContain('<c r="H3" s="8" t="inlineStr"><is><t xml:space="preserve">Sócios Fundadores');
    expect(xml).toContain('<c r="C4" s="15" t="inlineStr"><is><t xml:space="preserve">Veículos');
  });
});

describe('o XML aceita o que a consultoria escreve', () => {
  it('escapa & e < , que abririam o arquivo corrompido', () => {
    const comSimbolo: SecaoDaGrade[] = [
      {
        ...SECOES[0],
        linhas: [
          {
            ...SECOES[0].linhas[0],
            celulas: [
              {
                beneficiario_id: 'b1',
                beneficiario: 'Sócios Fundadores',
                texto: 'menor que 5 & maior que 2 <ver anexo>',
              },
              { beneficiario_id: 'b2', beneficiario: 'Sucessores na Gestão', texto: null },
            ],
          },
        ],
      },
    ];
    const xml = planilhaXmlDoProtocolo(MODELO, comSimbolo, COLUNAS).xml;

    expect(xml).toContain('menor que 5 &amp; maior que 2 &lt;ver anexo&gt;');
    expect(xml).not.toContain('& maior');
  });

  it('mantém o espaço em volta, que em regra de protocolo é significativo', () => {
    expect(gerar()).toContain('xml:space="preserve"');
  });
});

describe('letraDaColuna', () => {
  it('traduz a posição na letra que o Excel usa', () => {
    expect([0, 2, 7, 11, 25, 26].map(letraDaColuna)).toEqual(['A', 'C', 'H', 'L', 'Z', 'AA']);
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
