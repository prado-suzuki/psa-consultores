import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DailySprintProgressCard } from '@/components/equipe/daily/DailySprintProgressCard';
import { buildDailySprintProgress } from '@/lib/dailySprintProgress';

const progress = buildDailySprintProgress([
  { id: '1', title: 'Concluir relatório', task_code: 'T-1', status: 'completed', parent_id: null, assigned_to: 'ana' },
  { id: '2', title: 'Revisar cálculos', task_code: 'T-2', status: 'in_progress', parent_id: null, assigned_to: 'ana' },
  { id: '3', title: 'Enviar arquivos', task_code: null, status: 'pending', parent_id: null, assigned_to: 'bruno' },
], [
  { id: 'ana', first_name: 'Ana', last_name: 'Silva' },
  { id: 'bruno', first_name: 'Bruno', last_name: 'Souza' },
]);

describe('DailySprintProgressCard', () => {
  it('exibe o avanço coletivo segmentado e o próximo marco', () => {
    render(<DailySprintProgressCard sprintName="Sprint Agosto" progress={progress} loading={false} />);

    expect(screen.getByText('Sprint Agosto')).toBeInTheDocument();
    expect(screen.getByText('33%')).toBeInTheDocument();
    expect(screen.getByText('1 de 3 concluídas · 1 em andamento')).toBeInTheDocument();
    const progressBar = screen.getByRole('group', { name: 'Progresso coletivo: 33%' });
    const contribution = screen.getByRole('button', { name: 'Ana Silva: 1 de 2 concluídas, 1 em andamento' });
    expect(progressBar).toBeInTheDocument();
    // Cada trecho colorido ocupa somente sua contribuição no total; assim todos
    // ficam contíguos à esquerda e, juntos, formam exatamente o percentual geral.
    expect(progressBar.querySelectorAll('button')).toHaveLength(1);
    expect(Number.parseFloat(contribution.style.width)).toBe(33);
    expect(screen.getByText('Próximo marco: 50%')).toBeInTheDocument();
  });

  it('abre as tarefas da pessoa ao clicar no segmento', async () => {
    const user = userEvent.setup();
    render(<DailySprintProgressCard sprintName="Sprint Agosto" progress={progress} loading={false} />);

    await user.click(screen.getByRole('button', { name: 'Ana Silva: 1 de 2 concluídas, 1 em andamento' }));

    expect(screen.getByRole('heading', { name: 'Tarefas de Ana Silva' })).toBeInTheDocument();
    expect(screen.getByText('Concluir relatório')).toBeInTheDocument();
    expect(screen.getByText('Revisar cálculos')).toBeInTheDocument();
    expect(screen.queryByText('Enviar arquivos')).not.toBeInTheDocument();
  });
});
