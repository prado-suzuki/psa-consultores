import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BarraDePeriodo } from '@/components/shared/BarraDePeriodo';

describe('BarraDePeriodo', () => {
  it('a seta anda para os dois lados, com o sinal da direção', async () => {
    const onPasso = vi.fn();
    render(<BarraDePeriodo titulo="Agosto de 2026" onHoje={vi.fn()} onPasso={onPasso} />);

    await userEvent.click(screen.getByRole('button', { name: 'Período anterior' }));
    await userEvent.click(screen.getByRole('button', { name: 'Próximo período' }));

    expect(onPasso.mock.calls).toEqual([[-1], [1]]);
  });

  it('Hoje nunca desabilita', async () => {
    // O Gantt desabilitava quando o dia já estava na janela desenhada. Botão
    // cinza lê como quebrado, e voltar para hoje recentra a janela mesmo com o
    // dia à vista. Ver o comentário do componente.
    const onHoje = vi.fn();
    render(<BarraDePeriodo titulo="Agosto de 2026" onHoje={onHoje} onPasso={vi.fn()} />);

    const hoje = screen.getByRole('button', { name: 'Hoje' });
    expect(hoje).toBeEnabled();
    await userEvent.click(hoje);
    expect(onHoje).toHaveBeenCalledOnce();
  });

  it('sobe a primeira letra do título, e só ela', () => {
    // date-fns em ptBR devolve mês em minúscula. `capitalize` do CSS não serve:
    // ele subiria cada palavra, e o título do Gantt na escala de semana é
    // "23 ago – 29 ago 2026".
    const { rerender } = render(
      <BarraDePeriodo titulo="agosto de 2026" onHoje={vi.fn()} onPasso={vi.fn()} />,
    );
    expect(screen.getByText('Agosto de 2026')).toBeInTheDocument();

    rerender(<BarraDePeriodo titulo="23 ago – 29 ago 2026" onHoje={vi.fn()} onPasso={vi.fn()} />);
    expect(screen.getByText('23 ago – 29 ago 2026')).toBeInTheDocument();
  });

  it('o controle da tela entra entre Hoje e as setas', () => {
    render(
      <BarraDePeriodo titulo="Agosto de 2026" onHoje={vi.fn()} onPasso={vi.fn()}>
        <button type="button">Escala</button>
      </BarraDePeriodo>,
    );

    const ordem = screen
      .getAllByRole('button')
      .map(botao => botao.getAttribute('aria-label') || botao.textContent);
    expect(ordem).toEqual(['Hoje', 'Escala', 'Período anterior', 'Próximo período']);
  });
});
