// O drawer de filtros é um RASCUNHO: escolher no painel não filtra nada até
// "Aplicar filtros". Esse desenho cria duas armadilhas que estes testes trancam
// — "Limpar" tinha que significar a mesma coisa nos dois botões, e aplicar o
// rascunho não pode reverter a busca, que filtra ao digitar fora do drawer.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);

vi.mock('@/hooks/useTaxReferenceData', () => ({
  useExternalClients: () => ({
    data: [
      { id: 'cliente-abacaxi', nome: 'Abacaxi Elétrico Mineração' },
      { id: 'cliente-banana', nome: 'Banana Quântica Engenharia' },
    ],
  }),
}));

import { TaskFilters } from '@/components/equipe/fiscal/tasks/TaskFilters';
import type { TaskFilters as TaskFiltersType } from '@/hooks/useOrgTasks';

const teamMembers = [{ id: 'anderson', name: 'Anderson Matos' }];
const projects = [
  { id: 'projeto-apuracao', name: 'Apuração Fiscal' },
  { id: 'projeto-revisao', name: 'Revisão Tributária' },
];

function montar(filters: TaskFiltersType) {
  const onFiltersChange = vi.fn();
  const view = render(
    <TaskFilters filters={filters} onFiltersChange={onFiltersChange} teamMembers={teamMembers} projects={projects} />,
  );
  const rerender = (next: TaskFiltersType) =>
    view.rerender(
      <TaskFilters filters={next} onFiltersChange={onFiltersChange} teamMembers={teamMembers} projects={projects} />,
    );
  return { onFiltersChange, rerender };
}

/** O gatilho do drawer; o `^` evita casar com "Limpar filtros"/"Aplicar filtros". */
const abrirDrawer = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: /^Filtros/ }));

describe('TaskFilters', () => {
  it('"Limpar filtros" apaga os filtros de verdade, não só os campos do painel', async () => {
    const user = userEvent.setup();
    const { onFiltersChange } = montar({ assignedTo: 'anderson', search: 'perdcomp' });

    await abrirDrawer(user);
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));

    // A busca sobrevive: ela não é um dos filtros do painel.
    expect(onFiltersChange).toHaveBeenCalledWith({ search: 'perdcomp' });
  });

  it('deixa o drawer aberto ao limpar, para escolher os próximos filtros', async () => {
    const user = userEvent.setup();
    montar({ assignedTo: 'anderson' });

    await abrirDrawer(user);
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));

    expect(screen.getByText('Filtrar tarefas')).toBeInTheDocument();
  });

  it('aplicar não faz a busca voltar no tempo', async () => {
    const user = userEvent.setup();
    const { onFiltersChange, rerender } = montar({ assignedTo: 'anderson' });

    await abrirDrawer(user);
    // O rascunho nasceu sem busca; enquanto o drawer está aberto, a busca muda.
    rerender({ assignedTo: 'anderson', search: 'perdcomp' });
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));

    expect(onFiltersChange).toHaveBeenCalledWith({ assignedTo: 'anderson', search: 'perdcomp' });
  });

  it('permite buscar e selecionar um cliente pelo nome', async () => {
    const user = userEvent.setup();
    const { onFiltersChange } = montar({});

    await abrirDrawer(user);
    await user.click(screen.getByRole('combobox', { name: 'Cliente' }));
    await user.type(screen.getByPlaceholderText('Buscar cliente...'), 'banana');

    expect(screen.queryByText('Abacaxi Elétrico Mineração')).not.toBeInTheDocument();
    await user.click(screen.getByText('Banana Quântica Engenharia'));
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));

    expect(onFiltersChange).toHaveBeenCalledWith({ clientId: 'cliente-banana', contribuinteId: undefined, search: undefined });
  });

  it('permite buscar e selecionar um projeto pelo nome', async () => {
    const user = userEvent.setup();
    const { onFiltersChange } = montar({});

    await abrirDrawer(user);
    await user.click(screen.getByRole('combobox', { name: 'Projeto' }));
    await user.type(screen.getByPlaceholderText('Buscar projeto...'), 'revisão');

    expect(screen.queryByText('Apuração Fiscal')).not.toBeInTheDocument();
    await user.click(screen.getByText('Revisão Tributária'));
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));

    expect(onFiltersChange).toHaveBeenCalledWith({ projectId: 'projeto-revisao', search: undefined });
  });
});
