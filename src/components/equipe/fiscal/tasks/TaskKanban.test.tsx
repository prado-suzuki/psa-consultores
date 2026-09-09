import { fireEvent, render, screen } from '@testing-library/react';
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
      expect(screen.getByText('Agosto de 2026')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('a coluna Concluído deixa de acumular para sempre', async () => {
    // Era a única coluna do sistema sem recorte de tempo: o quadro recebia toda
    // tarefa que já existiu, e Concluído só crescia. Andar de mês agora esvazia.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(HOJE);
    try {
      const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      montar([
        tarefa({ id: 'T1', title: 'Concluída em agosto', due_date: '2026-08-10' }),
        tarefa({ id: 'T2', title: 'Concluída em maio', due_date: '2026-05-04' }),
      ]);

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

describe('TaskKanban — uma coluna por vez no celular', () => {
  /*
    Sete colunas de 340px mais as folgas pedem 2.476px. Num celular de 358px
    úteis cabia UMA coluna e uma tira da seguinte — e a tira era o que aparecia
    no print de 08/09. A rolagem de lado do quadro era ainda a terceira de três
    barrinhas empilhadas na tela.

    Estas asserções olham classe porque jsdom não calcula layout, e porque
    nenhuma delas dá erro de build se cair.
  */
  /**
   * A coluna cujo cabeçalho traz `rotulo`.
   *
   * `getAllByText` e não `getByText`: o seletor de coluna mostra o MESMO rótulo
   * do cabeçalho da coluna escolhida, então o texto aparece duas vezes na tela.
   * O que distingue é o ancestral de 340px, que só a coluna tem.
   */
  const colunaDe = (rotulo: string) =>
    screen
      .getAllByText(rotulo)
      .map((no) => no.closest('[class*="w-[340px]"]'))
      .find((no): no is HTMLElement => no !== null) ?? null;

  it('só a coluna escolhida ocupa a largura; as outras seis saem por CSS', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(HOJE);
    try {
      montar([tarefa({ status: 'backlog', due_date: '2026-08-10' })]);

      // Começa no primeiro status, sempre — e não no primeiro que tem cartão:
      // visão que troca de identidade conforme o dado ninguém prevê.
      expect(colunaDe('Backlog')?.className).toContain('max-md:w-full');
      expect(colunaDe('A Fazer')?.className).toContain('max-md:hidden');

      // Saem por CSS e não desmontadas, então rolagem e arraste de cada coluna
      // sobrevivem à troca.
      expect(colunaDe('A Fazer')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('as setas andam entre as colunas e param nas pontas', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(HOJE);
    try {
      montar([]);

      const anterior = screen.getByRole('button', { name: 'Coluna anterior' });
      const proxima = screen.getByRole('button', { name: 'Próxima coluna' });

      // Desabilitar nas pontas é o que dá a sensação de onde se está nas sete,
      // sem um "3 de 7" escrito na tela.
      expect(anterior).toBeDisabled();
      expect(proxima).toBeEnabled();

      fireEvent.click(proxima);
      expect(colunaDe('Pendente Cliente')?.className).toContain('max-md:w-full');
      expect(colunaDe('Backlog')?.className).toContain('max-md:hidden');
      expect(anterior).toBeEnabled();

      fireEvent.click(anterior);
      expect(colunaDe('Backlog')?.className).toContain('max-md:w-full');
      expect(anterior).toBeDisabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('o quadro não rola de lado no celular, porque não há nada ao lado', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(HOJE);
    try {
      montar([]);

      const quadro = colunaDe('Backlog')?.parentElement;
      expect(quadro?.className).toContain('overflow-x-auto');
      // Deixar a rolagem ligada devolveria uma das três barrinhas que a fase 2
      // tirou da tela.
      expect(quadro?.className).toContain('max-md:overflow-x-hidden');
    } finally {
      vi.useRealTimers();
    }
  });
});
