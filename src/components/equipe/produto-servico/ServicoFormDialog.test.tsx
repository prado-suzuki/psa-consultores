import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  catalogo: [
    { id: 's-1', nome: '1.Constituição / Alteração contratual', cluster_id: 'tax', estrutura_clusters: { name: 'TAX' } },
    { id: 's-2', nome: '1.2.Outro serviço', cluster_id: 'tax', estrutura_clusters: { name: 'TAX' } },
  ],
}));

vi.mock('@/hooks/useCategorias', () => ({
  useServicosPrestadosList: () => ({ data: mocks.catalogo }),
  useServicosPrestadosSave: () => ({ save: mocks.save }),
}));

vi.mock('@/components/equipe/produto-servico/ClusterSelect', () => ({
  default: ({ onChange }: { onChange: (id: string) => void }) => (
    <button onClick={() => onChange('osg')}>Trocar para OSG</button>
  ),
}));

import ServicoFormDialog from '@/components/equipe/produto-servico/ServicoFormDialog';

describe('edição de serviço', () => {
  it('edita o nome sem exigir um grupo ou alterar o número existente', async () => {
    mocks.save.mockResolvedValue('s-1');
    const onFechar = vi.fn();
    render(<ServicoFormDialog aberto servico={{
      id: 's-1', nome: '1.Constituição / Alteração contratual', cluster_id: 'tax',
      estrutura_clusters: { name: 'TAX' },
    }} onFechar={onFechar} />);

    expect(screen.queryByText('Grupo')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Número')).toHaveValue('1');
    await userEvent.setup().clear(screen.getByLabelText(/Nome/));
    await userEvent.setup().type(screen.getByLabelText(/Nome/), 'Constituição contratual');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Salvar' }));

    expect(mocks.save).toHaveBeenCalledWith('s-1', '1.Constituição contratual', 'tax');
    expect(onFechar).toHaveBeenCalled();
  });

  it('sugere o próximo número ao criar e recalcula ao trocar de cluster', async () => {
    mocks.save.mockResolvedValue('novo');
    const user = userEvent.setup();
    render(<ServicoFormDialog aberto servico={null} clusterPadrao="tax" onFechar={vi.fn()} />);

    expect(screen.getByLabelText('Número (automático)')).toHaveValue('2');
    await user.click(screen.getByRole('button', { name: 'Trocar para OSG' }));
    expect(screen.getByLabelText('Número (automático)')).toHaveValue('1');

    await user.type(screen.getByLabelText(/Nome/), 'Serviço novo');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(mocks.save).toHaveBeenLastCalledWith(null, '1.Serviço novo', 'osg');
  });
});
