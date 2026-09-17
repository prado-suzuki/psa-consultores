import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { GradeDoProtocolo } from '@/components/equipe/osg/governanca/GradeDoProtocolo';
import {
  type BeneficiarioDoProtocolo,
  type SecaoDaGrade,
  montarGrade,
} from '@/lib/protocoloRemuneracao';

const COLUNAS: BeneficiarioDoProtocolo[] = [
  { id: 'b-fund', nome: 'Sócios Fundadores', ordem: 10 },
  { id: 'b-suc', nome: 'Sucessores na Gestão', ordem: 20 },
];

/* Dois temas reais do modelo, com Veículos tendo duas linhas: é nele que se vê o
   agrupamento e o andamento parcial. */
const GRADE: SecaoDaGrade[] = [
  {
    tema_id: 't-rem',
    tema: 'Remuneração pelo trabalho, acionistas e figuras cativas',
    linhas: [
      {
        linha_id: 'l1',
        item_id: 'i1',
        item: 'Remuneração pelo trabalho',
        celulas: [
          { beneficiario_id: 'b-fund', beneficiario: 'Sócios Fundadores', texto: 'R$ 45.000,00' },
          { beneficiario_id: 'b-suc', beneficiario: 'Sucessores na Gestão', texto: 'R$ 13.882,00' },
        ],
      },
    ],
  },
  {
    tema_id: 't-vei',
    tema: 'Veículos',
    linhas: [
      {
        linha_id: 'l2',
        item_id: 'i2',
        item: 'Modelo do Veículo',
        celulas: [
          { beneficiario_id: 'b-fund', beneficiario: 'Sócios Fundadores', texto: 'Hilux SRX' },
          { beneficiario_id: 'b-suc', beneficiario: 'Sucessores na Gestão', texto: null },
        ],
      },
      {
        linha_id: 'l3',
        item_id: 'i3',
        item: 'Abastecimento',
        celulas: [
          { beneficiario_id: 'b-fund', beneficiario: 'Sócios Fundadores', texto: null },
          { beneficiario_id: 'b-suc', beneficiario: 'Sucessores na Gestão', texto: null },
        ],
      },
    ],
  },
];

const montar = (over: Partial<Parameters<typeof GradeDoProtocolo>[0]> = {}) => {
  const onAbrirLinha = vi.fn();
  const utils = render(
    <GradeDoProtocolo
      grade={GRADE}
      colunas={COLUNAS}
      onAbrirLinha={onAbrirLinha}
      {...over}
    />,
  );
  return { onAbrirLinha, ...utils };
};

describe('o tema agrupa, e diz quanto falta nele', () => {
  it('põe cada tema como faixa própria, acima dos itens dele', () => {
    const { container } = montar();
    const linhas = [...container.querySelectorAll('tr')].map((r) => r.textContent ?? '');

    /*
     * A ordem inteira de uma vez, em vez de comparar índices dois a dois: assim
     * o próprio erro mostra a grade como ela saiu. A faixa do tema carrega o
     * andamento junto, por isso a comparação é por trecho e não por igualdade.
     */
    expect(linhas.map((t) => t.slice(0, 28))).toEqual([
      'ItemSócios FundadoresSucesso',
      'Remuneração pelo trabalho, a',
      'Remuneração pelo trabalhoR$ ',
      'Veículos1 de 2 preenchidos',
      'Modelo do VeículoHilux SRX—',
      'Abastecimento——',
    ]);
  });

  it('conta o preenchido DENTRO do tema, e não no protocolo todo', () => {
    /*
     * Com 13 temas, o número do topo diz que falta preencher mas não diz onde.
     * Veículos tem 2 itens e só um com regra escrita.
     */
    montar();

    expect(screen.getByText(/Veículos/)).toHaveTextContent('1 de 2 preenchidos');
    expect(screen.getByText(/Remuneração pelo trabalho, acionistas/)).toHaveTextContent(
      '1 de 1 preenchidos',
    );
  });

  it('linha com uma coluna escrita e outra vazia conta como preenchida', () => {
    /* "Modelo do Veículo" só tem texto no Fundador, e mesmo assim está respondida:
       o que falta responder é a linha em branco inteira. */
    montar();
    expect(screen.getByText(/^Veículos/)).toHaveTextContent('1 de 2');
  });
});

describe('a célula', () => {
  it('mostra o texto e guarda o inteiro no title, para conferir sem abrir', () => {
    montar();
    const celula = screen.getByText('Hilux SRX');

    expect(celula).toHaveAttribute('title', 'Hilux SRX');
  });

  it('célula sem regra aparece como travessão, e não some da linha', () => {
    montar();
    const linha = screen.getByText('Abastecimento').closest('tr')!;

    /* As duas colunas continuam ali: a saída é planilha, e coluna que some
       desalinha o quadro inteiro. */
    expect(within(linha).getAllByText('—')).toHaveLength(2);
  });

  it('o texto fica embaixo do cabeçalho certo, coluna por coluna', () => {
    /*
     * O erro silencioso mais caro desta tela seria a regra do Fundador aparecer
     * sob o rótulo do Gestor. Aqui a ordem do cabeçalho e a das células são
     * conferidas posição a posição.
     */
    montar();
    const cabecalhos = screen.getAllByRole('columnheader').map((c) => c.textContent);
    expect(cabecalhos).toEqual(['Item', 'Sócios Fundadores', 'Sucessores na Gestão']);

    const linha = screen.getByText('Remuneração pelo trabalho').closest('tr')!;
    const celulas = within(linha).getAllByRole('cell').map((c) => c.textContent);
    expect(celulas).toEqual(['Remuneração pelo trabalho', 'R$ 45.000,00', 'R$ 13.882,00']);
  });
});

describe('abrir a linha', () => {
  it('clicar numa linha entrega a linha daquela linha, e não outra', async () => {
    const { onAbrirLinha } = montar();

    await userEvent.click(screen.getByText('Abastecimento'));

    expect(onAbrirLinha).toHaveBeenCalledTimes(1);
    expect(onAbrirLinha.mock.calls[0][0]).toMatchObject({ linha_id: 'l3', item: 'Abastecimento' });
  });

  it('clicar na faixa do tema não abre nada', async () => {
    const { onAbrirLinha } = montar();

    await userEvent.click(screen.getByText(/^Veículos/));

    expect(onAbrirLinha).not.toHaveBeenCalled();
  });
});

describe('a grade que o montarGrade produz desenha', () => {
  it('protocolo sem linha nenhuma rende uma tabela só com o cabeçalho', () => {
    montar({ grade: montarGrade([], COLUNAS, []) });

    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
    expect(screen.queryAllByRole('cell')).toHaveLength(0);
  });
});
