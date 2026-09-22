import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedFiltros } from '@/components/comentarios/feed/FeedFiltros';
import { FILTROS_VAZIOS, type FeedFiltros as Filtros } from '@/lib/feedFiltros';

vi.mock('@/hooks/useTaxReferenceData', () => ({
  useExternalClients: () => ({ data: [{ id: 'CL1', nome: 'Frigorífico Vale' }] }),
  useOrgProjectsForFilter: () => ({
    data: [{ id: 'P1', name: 'Fechamento mensal', external_client_id: 'CL1' }],
  }),
  useTeamProfilesSafe: () => ({ data: [{ id: 'U2', first_name: 'Ana', last_name: 'Souza' }] }),
}));

function renderizar(filtros: Partial<Filtros> = {}) {
  const onFiltrosChange = vi.fn();
  const valor = { ...FILTROS_VAZIOS, ...filtros };
  render(<FeedFiltros filtros={valor} onFiltrosChange={onFiltrosChange} />);
  return { onFiltrosChange, valor };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('FeedFiltros', () => {
  it('Tudo e Menções alternam a leitura do feed', () => {
    const { onFiltrosChange } = renderizar();
    fireEvent.click(screen.getByRole('radio', { name: /só as conversas em que me mencionam/ }));
    expect(onFiltrosChange).toHaveBeenCalledWith({ ...FILTROS_VAZIOS, apenasMencoes: true });
  });

  it('Anexos desliga Menções: são leituras em alternância', () => {
    const { onFiltrosChange } = renderizar({ apenasMencoes: true });
    fireEvent.click(screen.getByRole('radio', { name: /só as conversas com anexo/ }));
    expect(onFiltrosChange).toHaveBeenCalledWith({ ...FILTROS_VAZIOS, apenasAnexos: true });
  });

  it('a busca fica à vista e só vira recorte depois de 350 ms', () => {
    vi.useFakeTimers();
    const { onFiltrosChange } = renderizar();

    fireEvent.change(screen.getByRole('searchbox', { name: /Buscar no texto/ }), {
      target: { value: 'balancete' },
    });
    act(() => vi.advanceTimersByTime(349));
    expect(onFiltrosChange).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onFiltrosChange).toHaveBeenCalledWith({ ...FILTROS_VAZIOS, busca: 'balancete' });
  });

  it('Enter busca sem esperar e Esc limpa', () => {
    const { onFiltrosChange } = renderizar();
    const campo = screen.getByRole('searchbox', { name: /Buscar no texto/ });

    fireEvent.change(campo, { target: { value: 'razão' } });
    fireEvent.keyDown(campo, { key: 'Enter' });
    expect(onFiltrosChange).toHaveBeenLastCalledWith({ ...FILTROS_VAZIOS, busca: 'razão' });

    fireEvent.keyDown(campo, { key: 'Escape' });
    expect(onFiltrosChange).toHaveBeenLastCalledWith({ ...FILTROS_VAZIOS, busca: '' });
    expect(campo).toHaveValue('');
  });

  it('período fica à vista com o preset escolhido', () => {
    renderizar({ periodo: '7d' });
    expect(screen.getByRole('combobox', { name: 'Período' })).toHaveTextContent('Últimos 7 dias');
  });

  it('sem filtro ligado não há linha de etiquetas', () => {
    renderizar();
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).not.toBeInTheDocument();
  });

  it('filtros do popover viram etiquetas com nome e ×, e o botão conta só eles', () => {
    const { onFiltrosChange, valor } = renderizar({
      clienteId: 'CL1',
      projetoId: 'P1',
      autorId: 'U2',
      apenasMencoes: true,
      busca: 'balancete',
    });

    expect(screen.getByText('Frigorífico Vale')).toBeInTheDocument();
    expect(screen.getByText('Fechamento mensal')).toBeInTheDocument();
    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Filtros/ })).toHaveTextContent('3');

    fireEvent.click(screen.getByRole('button', { name: 'Remover filtro de projeto' }));
    expect(onFiltrosChange).toHaveBeenLastCalledWith({ ...valor, projetoId: null });
  });

  it('cadastro ainda não carregado mostra o tipo, não o uuid', () => {
    renderizar({ clienteId: 'CL-DESCONHECIDO' });
    expect(screen.getByText('Cliente selecionado')).toBeInTheDocument();
  });

  it('Limpar filtros aparece com qualquer filtro ligado e zera tudo', () => {
    const { onFiltrosChange } = renderizar({ periodo: 'hoje' });
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(onFiltrosChange).toHaveBeenCalledWith(FILTROS_VAZIOS);
  });
});
