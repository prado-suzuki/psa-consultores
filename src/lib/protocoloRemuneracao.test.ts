import { describe, expect, it } from 'vitest';

import {
  type BeneficiarioDoProtocolo,
  type LinhaComItem,
  type RegraDoProtocolo,
  diffDaLinha,
  montarGrade,
  ordenarBeneficiarios,
  regrasParaSalvar,
} from '@/lib/protocoloRemuneracao';

/*
 * Os dados abaixo são do modelo da casa e do Potrich, não inventados: dois temas
 * reais ("Remuneração pelo trabalho, acionistas e figuras cativas" e "Veículos"),
 * itens reais, e as duas colunas que o Potrich usa de verdade.
 */

const TEMA_REMUNERACAO = {
  id: 't-remuneracao',
  nome: 'Remuneração pelo trabalho, acionistas e figuras cativas',
  ordem: 10,
};
const TEMA_VEICULOS = { id: 't-veiculos', nome: 'Veículos', ordem: 30 };

const linhas: LinhaComItem[] = [
  /* De propósito fora de ordem, para provar que a função ordena. */
  {
    id: 'l-abastecimento',
    ordem: 30,
    item: { id: 'i-abastecimento', nome: 'Abastecimento', ordem: 30, tema: TEMA_VEICULOS },
  },
  {
    id: 'l-modelo',
    ordem: 10,
    item: { id: 'i-modelo', nome: 'Modelo do Veículo', ordem: 10, tema: TEMA_VEICULOS },
  },
  {
    id: 'l-pro-labore',
    ordem: 10,
    item: {
      id: 'i-pro-labore',
      nome: 'Remuneração pelo trabalho',
      ordem: 10,
      tema: TEMA_REMUNERACAO,
    },
  },
];

const beneficiarios: BeneficiarioDoProtocolo[] = [
  { id: 'b-sucessores', nome: 'Sucessores na Gestão', ordem: 20 },
  { id: 'b-fundadores', nome: 'Sócios Fundadores', ordem: 10 },
];

const regras: RegraDoProtocolo[] = [
  {
    linha_id: 'l-pro-labore',
    beneficiario_id: 'b-fundadores',
    texto: 'R$ 45.000,00 por Fundador',
  },
  {
    linha_id: 'l-modelo',
    beneficiario_id: 'b-fundadores',
    texto: 'Veículo utilitário até R$ 600.000,00',
  },
];

describe('ordenarBeneficiarios', () => {
  it('ordena pela ordem, não pela ordem de chegada', () => {
    expect(ordenarBeneficiarios(beneficiarios).map((b) => b.nome)).toEqual([
      'Sócios Fundadores',
      'Sucessores na Gestão',
    ]);
  });

  it('desempata pelo nome quando alguém repetiu a ordem à mão', () => {
    const empatados = [
      { id: 'b', nome: 'Sócios Gestores', ordem: 10 },
      { id: 'a', nome: 'Fundadores', ordem: 10 },
    ];

    expect(ordenarBeneficiarios(empatados).map((b) => b.nome)).toEqual([
      'Fundadores',
      'Sócios Gestores',
    ]);
  });

  it('não mexe no array que recebeu', () => {
    const original = [...beneficiarios];
    ordenarBeneficiarios(beneficiarios);

    expect(beneficiarios).toEqual(original);
  });
});

describe('montarGrade', () => {
  it('agrupa por tema e ordena os temas pela ordem do catálogo', () => {
    const grade = montarGrade(linhas, beneficiarios, regras);

    expect(grade.map((s) => s.tema)).toEqual([
      'Remuneração pelo trabalho, acionistas e figuras cativas',
      'Veículos',
    ]);
  });

  it('ordena as linhas DENTRO do tema, e não pela ordem global', () => {
    /*
     * Este é o caso que erra fácil: "Remuneração pelo trabalho" e "Modelo do
     * Veículo" têm ambos ordem 10, porque no catálogo cada tema recomeça a
     * contagem. Ordenar a grade inteira por `ordem` juntaria os dois no topo e
     * quebraria os temas.
     */
    const grade = montarGrade(linhas, beneficiarios, regras);

    expect(grade[1].linhas.map((l) => l.item)).toEqual(['Modelo do Veículo', 'Abastecimento']);
  });

  it('devolve uma célula por beneficiário em toda linha, porque a saída é planilha', () => {
    const grade = montarGrade(linhas, beneficiarios, regras);
    const todas = grade.flatMap((s) => s.linhas);

    expect(todas).toHaveLength(3);
    for (const linha of todas) expect(linha.celulas).toHaveLength(2);
  });

  it('ordena as colunas pela ordem do beneficiário, não pela ordem de chegada', () => {
    const grade = montarGrade(linhas, beneficiarios, regras);

    expect(grade[0].linhas[0].celulas.map((c) => c.beneficiario)).toEqual([
      'Sócios Fundadores',
      'Sucessores na Gestão',
    ]);
  });

  it('põe null na célula que ninguém preencheu', () => {
    const grade = montarGrade(linhas, beneficiarios, regras);
    const proLabore = grade[0].linhas[0];

    expect(proLabore.celulas[0].texto).toBe('R$ 45.000,00 por Fundador');
    expect(proLabore.celulas[1].texto).toBeNull();
  });

  it('sem linha nenhuma devolve grade vazia, e não um tema vazio', () => {
    expect(montarGrade([], beneficiarios, regras)).toEqual([]);
  });
});

describe('regrasParaSalvar', () => {
  it('manda a célula em branco para apagar, porque o banco recusa texto vazio', () => {
    const { paraGravar, paraApagar } = regrasParaSalvar([
      { beneficiario_id: 'b-fundadores', texto: 'Não se aplica' },
      { beneficiario_id: 'b-sucessores', texto: '   ' },
    ]);

    expect(paraGravar).toEqual([{ beneficiario_id: 'b-fundadores', texto: 'Não se aplica' }]);
    expect(paraApagar).toEqual(['b-sucessores']);
  });

  it('não confunde "Não se aplica" com célula vazia', () => {
    const { paraGravar, paraApagar } = regrasParaSalvar([
      { beneficiario_id: 'b-fundadores', texto: 'Não se aplica' },
    ]);

    expect(paraGravar).toHaveLength(1);
    expect(paraApagar).toHaveLength(0);
  });

  it('apara o espaço sobrando, que o modelo da casa tem de verdade', () => {
    const { paraGravar } = regrasParaSalvar([
      { beneficiario_id: 'b-fundadores', texto: '  Custos de manutenção  ' },
    ]);

    expect(paraGravar[0].texto).toBe('Custos de manutenção');
  });
});

describe('diffDaLinha', () => {
  const nome = (id: string) =>
    ({ 'b-fundadores': 'Sócios Fundadores', 'b-sucessores': 'Sucessores na Gestão' })[id] ?? id;

  it('usa o nome do beneficiário como chave, e não o uuid', () => {
    const mudou = diffDaLinha(
      [{ linha_id: 'l-modelo', beneficiario_id: 'b-fundadores', texto: 'Hilux' }],
      [{ beneficiario_id: 'b-fundadores', texto: 'Ranger' }],
      nome,
    );

    expect(mudou).toEqual({ 'Sócios Fundadores': { old: 'Hilux', new: 'Ranger' } });
  });

  it('deixa de fora quem não mudou', () => {
    const mudou = diffDaLinha(
      [
        { linha_id: 'l-modelo', beneficiario_id: 'b-fundadores', texto: 'Hilux' },
        { linha_id: 'l-modelo', beneficiario_id: 'b-sucessores', texto: 'Strada' },
      ],
      [
        { beneficiario_id: 'b-fundadores', texto: 'Hilux' },
        { beneficiario_id: 'b-sucessores', texto: 'Ranger' },
      ],
      nome,
    );

    expect(Object.keys(mudou)).toEqual(['Sucessores na Gestão']);
  });

  it('chama de vazio a célula que não existia, e a que foi apagada', () => {
    const preencheu = diffDaLinha([], [{ beneficiario_id: 'b-fundadores', texto: 'Hilux' }], nome);
    const apagou = diffDaLinha(
      [{ linha_id: 'l-modelo', beneficiario_id: 'b-fundadores', texto: 'Hilux' }],
      [{ beneficiario_id: 'b-fundadores', texto: '' }],
      nome,
    );

    expect(preencheu).toEqual({ 'Sócios Fundadores': { old: 'vazio', new: 'Hilux' } });
    expect(apagou).toEqual({ 'Sócios Fundadores': { old: 'Hilux', new: 'vazio' } });
  });

  it('não registra nada quando nada mudou', () => {
    expect(
      diffDaLinha(
        [{ linha_id: 'l-modelo', beneficiario_id: 'b-fundadores', texto: 'Hilux' }],
        [{ beneficiario_id: 'b-fundadores', texto: 'Hilux' }],
        nome,
      ),
    ).toEqual({});
  });
});
