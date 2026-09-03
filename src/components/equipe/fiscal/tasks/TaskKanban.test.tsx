import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { OrgTask } from '@/hooks/useOrgTasks';
import { TaskKanban } from '@/components/equipe/fiscal/tasks/TaskKanban';
import { usePeriodoDeTarefas } from '@/hooks/usePeriodoDeTarefas';
import { TestProviders } from '@/test/queryWrapper';

// Radix (Select/DropdownMenu) usa APIs de pointer ausentes no jsdom.
Object.defineProperties(Element.prototype, {
  hasPointerCapture: { configurable: true, value: () => false },
  setPointerCapture: { configurable: true, value: () => {} },
  releasePointerCapture: { configurable: true, value: () => {} },
});

vi.mock('@/hooks/useOrgTasks', () => ({
  useUpdateOrgTask: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useCreateOrgTaskComment: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'U1' } }) }));
vi.mock('@/hooks/useOrgProjects', () => ({
  useOrgProjectClusterIds: () => ({ data: ['CL1'] }),
}));
vi.mock('@/hooks/useReviewerCandidates', () => ({
  useReviewerCandidates: () => ({ data: [], isLoading: false }),
}));

const HOJE = new Date(2026, 7, 12, 9, 0, 0);

const tarefa = (overrides: Partial<OrgTask> = {}) =>
  ({
    id: 'T1',
    title: 'Apuração de ICMS',
    status: 'done',
    priority: 'media',
    assigned_to: null,
    assigned_to_name: null,
    due_date: '2026-08-10',
    tags: [],
    category: 'fiscal',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
    ...overrides,
  }) as unknown as OrgTask;

function QuadroComPeriodo({ tasks }: { tasks: OrgTask[] }) {
  const periodo = usePeriodoDeTarefas(tasks);
  return <TaskKanban tasks={periodo.tarefas} periodo={periodo} area="tax" onEdit={() => {}} />;
}

/** O quadro consulta os perfis da equipe, então precisa do QueryClient. */
const montar = (tasks: OrgTask[]) =>
  render(
    <TestProviders>
      <QuadroComPeriodo tasks={tasks} />
    </TestProviders>,
  );

describe('TaskKanban — barra de período', () => {
  it('o quadro ganhou a mesma barra da Lista, Tabela, Calendário e Gantt', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(HOJE);
    try {
      montar([]);

      expect(screen.getByRole('button', { name: 'Hoje' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Mês anterior' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Próximo mês' })).toBeInTheDocument();
      // O título abre o seletor, e o padrão dele é "Tudo".
      expect(screen.getByRole('button', { name: 'Tudo' })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('por padrão o quadro mostra o projeto inteiro, de qualquer mês', async () => {
    // A trava do mês foi relatada aqui e na Tabela: quem abre um projeto quer as
    // entregas dele, e a do mês seguinte ficava fora da tela sem avisar.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(HOJE);
    try {
      const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      montar([
        tarefa({ id: 'T1', title: 'Entrega de agosto', due_date: '2026-08-10' }),
        tarefa({ id: 'T2', title: 'Entrega de setembro', due_date: '2026-09-15' }),
      ]);

      expect(screen.getByText('Entrega de agosto')).toBeInTheDocument();
      expect(screen.getByText('Entrega de setembro')).toBeInTheDocument();

      // E o mês continua a um clique, na grade do próprio título: ano no
      // cabeçalho, doze meses sem rolagem.
      await usuario.click(screen.getByRole('button', { name: 'Tudo' }));
      expect(screen.getByText('2026')).toBeInTheDocument();
      await usuario.click(screen.getByRole('button', { name: 'set' }));

      expect(screen.getByText('Entrega de setembro')).toBeInTheDocument();
      expect(screen.queryByText('Entrega de agosto')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Setembro de 2026/ })).toBeInTheDocument();

      // E a saída do mês fica à vista, sem precisar reabrir o menu: "não
      // aparece nada" tem esta causa comum.
      await usuario.click(screen.getByRole('button', { name: 'Ver tudo' }));
      expect(screen.getByText('Entrega de agosto')).toBeInTheDocument();
      expect(screen.getByText('Entrega de setembro')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('o atalho Atrasadas usa a conta do dashboard de área, e o título o diz', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(HOJE);
    try {
      const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      montar([
        // O `status` é explícito porque o padrão da fábrica é `done`, e é
        // justamente ele que decide se uma tarefa vencida está atrasada.
        tarefa({ id: 'T1', title: 'Venceu e está aberta', due_date: '2026-08-03', status: 'todo' }),
        tarefa({ id: 'T2', title: 'Venceu e foi concluída', due_date: '2026-08-04', status: 'done' }),
        tarefa({ id: 'T3', title: 'Vence adiante', due_date: '2026-08-28', status: 'todo' }),
      ]);

      await usuario.click(screen.getByRole('button', { name: 'Tudo' }));
      await usuario.click(screen.getByRole('menuitemradio', { name: 'Atrasadas' }));

      expect(screen.getByRole('button', { name: /Atrasadas/ })).toBeInTheDocument();
      expect(screen.getByText('Venceu e está aberta')).toBeInTheDocument();
      // Concluída não é atrasada: quem decide isso é o `matchesUrgency`.
      expect(screen.queryByText('Venceu e foi concluída')).not.toBeInTheDocument();
      expect(screen.queryByText('Vence adiante')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('a coluna Concluído deixa de acumular para sempre — no recorte de mês', async () => {
    // Era a única coluna do sistema sem recorte de tempo: o quadro recebia toda
    // tarefa que já existiu, e Concluído só crescia. Escolher um mês esvazia.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(HOJE);
    try {
      const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      montar([
        tarefa({ id: 'T1', title: 'Concluída em agosto', due_date: '2026-08-10' }),
        tarefa({ id: 'T2', title: 'Concluída em maio', due_date: '2026-05-04' }),
      ]);

      // `Hoje` é o caminho de "tudo" para o mês corrente: a seta anda um mês.
      await usuario.click(screen.getByRole('button', { name: 'Hoje' }));
      expect(screen.getByText('Concluída em agosto')).toBeInTheDocument();
      expect(screen.queryByText('Concluída em maio')).not.toBeInTheDocument();

      // Três passos para trás e a de maio aparece, a de agosto sai.
      for (let i = 0; i < 3; i++) {
        await usuario.click(screen.getByRole('button', { name: 'Mês anterior' }));
      }

      expect(screen.getByText('Concluída em maio')).toBeInTheDocument();
      expect(screen.queryByText('Concluída em agosto')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('tarefa sem prazo aparece no quadro só com o mês corrente à vista', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(HOJE);
    try {
      const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      montar([tarefa({ id: 'T3', title: 'Definir escopo', due_date: null })]);

      // Em "tudo" ela aparece porque nada é recortado; a regra é do mês.
      expect(screen.getByText('Definir escopo')).toBeInTheDocument();

      await usuario.click(screen.getByRole('button', { name: 'Próximo mês' }));
      expect(screen.queryByText('Definir escopo')).not.toBeInTheDocument();

      await usuario.click(screen.getByRole('button', { name: 'Hoje' }));
      expect(screen.getByText('Definir escopo')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
