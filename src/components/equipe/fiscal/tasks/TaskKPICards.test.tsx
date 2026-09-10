import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TaskKPICards } from './TaskKPICards';
import { statusList } from '@/lib/taskStatusColors';

/**
 * A régua de status aparece nas SETE abas do painel de tarefas, então um defeito
 * de largura aqui é um defeito em todas elas. Em 09/09/2026 ela era a primeira
 * de três rolagens horizontais empilhadas na tela do Kanban: sete status a
 * `min-w-[120px]` pedem 840px, o dobro do que um celular tem.
 *
 * O teste olha as classes de propósito. É o único jeito de travar "não volte a
 * depender de rolagem horizontal no celular" sem medir layout — e jsdom não
 * calcula layout. O mesmo raciocínio de `src/lib/sidebarMedidas.test.ts`.
 */
const regua = () => {
  const chip = screen.getByText('Backlog');
  const celula = chip.parentElement;
  if (!celula?.parentElement) throw new Error('não achei a régua acima da célula');
  return { celula, caixa: celula.parentElement };
};

describe('régua de status', () => {
  it('conta as tarefas de cada status, e mostra zero onde não há nenhuma', () => {
    render(
      <TaskKPICards
        tasks={[
          { status: 'todo' },
          { status: 'todo' },
          { status: 'done' },
        ]}
      />,
    );

    for (const status of statusList) {
      expect(screen.getByText(status.label)).toBeInTheDocument();
    }

    // Os números ficam ao lado do rótulo, na mesma célula.
    expect(screen.getByText('A Fazer').parentElement).toHaveTextContent('2');
    expect(screen.getByText('Concluído').parentElement).toHaveTextContent('1');
    expect(screen.getByText('Backlog').parentElement).toHaveTextContent('0');
  });

  it('no celular é grade, e a rolagem horizontal só existe de `md` para cima', () => {
    render(<TaskKPICards tasks={[]} />);
    const { caixa } = regua();

    expect(caixa.className).toContain('grid-cols-2');
    // A rolagem continua valendo na faixa estreita entre 768px e os 840px que a
    // régua pede — o que não pode é ela ser o padrão, que é o caso do celular.
    expect(caixa.className).toContain('md:overflow-x-auto');
    expect(caixa.className).not.toMatch(/(^|\s)overflow-x-auto/);
  });

  it('a última célula fecha a linha, em vez de sobrar sozinha num canto', () => {
    render(<TaskKPICards tasks={[]} />);

    // Sete status não dividem nem por 2 nem por 3: sem isto a "Concluído" fica
    // num canto e a grade parece ter uma célula faltando.
    const ultimo = statusList[statusList.length - 1];
    expect(screen.getByText(ultimo.label).parentElement?.className).toContain('col-span-2');
  });
});
