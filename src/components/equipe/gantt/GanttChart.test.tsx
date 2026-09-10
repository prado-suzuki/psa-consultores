import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GanttChart } from './GanttChart';
import type { GanttGrupo } from './tiposDeGantt';

/**
 * A coluna de nomes do Gantt, e a largura que ela pode gastar.
 *
 * No desktop ela mede 300px, e isso é razoável ao lado de uma linha do tempo de
 * 1.320px. Num celular de 358px úteis, 300px é **84% da tela** gasta antes da
 * primeira barra: nome e barra nunca apareciam juntos, que é a única coisa que
 * um Gantt existe para mostrar.
 *
 * A coluna já era `sticky left-0` antes desta frente — ela não sai da tela
 * quando a linha do tempo rola. O que faltava era só ela caber.
 */

const HOJE = new Date(2026, 7, 12, 9, 0, 0);

const grupos: GanttGrupo[] = [
  {
    id: 'U1',
    nome: 'Monica Matunaga',
    resumo: '2 tarefas • 1/2 concluídas',
    itens: [
      {
        id: 'T1',
        titulo: 'Elaborar Protocolo e Justificativa da Reestruturação Societária',
        inicio: new Date(2026, 7, 10),
        fim: new Date(2026, 7, 14),
        papel: 'fila',
        concluido: false,
        detalhe: null,
      },
    ],
  },
];

function definirLargura(px: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: px });
}

/** A coluna de nomes é o botão fixo à esquerda de cada linha. */
const colunaDoGrupo = () => screen.getByRole('button', { name: /Monica Matunaga/ });

describe('GanttChart — a coluna de nomes cabe no celular', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(HOJE);
  });

  afterEach(() => {
    vi.useRealTimers();
    definirLargura(1024);
  });

  it('no desktop a coluna fica em 300px', () => {
    definirLargura(1280);
    render(<GanttChart grupos={grupos} rotuloDaColuna="Responsável / Tarefa" />);

    expect(colunaDoGrupo().style.width).toBe('300px');
  });

  it('no celular ela cai para 132px, para a barra caber ao lado', () => {
    definirLargura(390);
    render(<GanttChart grupos={grupos} rotuloDaColuna="Responsável / Tarefa" />);

    // 132px deixam ~226px de linha do tempo, uns cinco dias na escala de mês.
    // Com 300px sobravam 58px, e nenhuma barra aparecia.
    expect(colunaDoGrupo().style.width).toBe('132px');
  });

  it('a coluna continua fixa à esquerda quando a linha do tempo rola', () => {
    definirLargura(390);
    render(<GanttChart grupos={grupos} rotuloDaColuna="Responsável / Tarefa" />);

    // É o que torna a coluna estreita suficiente: o nome não sai da tela.
    expect(colunaDoGrupo().className).toContain('sticky');
    expect(colunaDoGrupo().className).toContain('left-0');
  });

  it('o que trunca tem tooltip, porque a coluna estreita corta mais', () => {
    definirLargura(390);
    render(<GanttChart grupos={grupos} rotuloDaColuna="Responsável / Tarefa" />);

    // Lição da Lista: texto cortado sem tooltip é texto perdido. Em toque não há
    // hover para recuperá-lo, mas no desktop o mouse resolve — e sem o `title`
    // não resolve em lugar nenhum.
    expect(colunaDoGrupo()).toHaveAttribute(
      'title',
      'Monica Matunaga — 2 tarefas • 1/2 concluídas',
    );

    // O grupo nasce fechado: a tarefa só existe depois de abrir.
    fireEvent.click(colunaDoGrupo());

    // A barra na linha do tempo carrega o mesmo texto, então há dois botões com
    // esse nome. O da coluna é o que fica fixo à esquerda.
    const tarefa = screen
      .getAllByRole('button', { name: /Elaborar Protocolo/ })
      .find((no) => no.className.includes('left-0'));
    expect(tarefa).toBeDefined();
    expect(tarefa).toHaveAttribute(
      'title',
      'Elaborar Protocolo e Justificativa da Reestruturação Societária',
    );
  });
});
