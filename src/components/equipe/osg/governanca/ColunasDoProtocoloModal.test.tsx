import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ColunasDoProtocoloModal } from '@/components/equipe/osg/governanca/ColunasDoProtocoloModal';

const COLUNAS = [
  { id: 'b-fund', nome: 'Fundadores', ordem: 1 },
  { id: 'b-socios', nome: 'Sócios', ordem: 2 },
  { id: 'b-gest', nome: 'Sócios Gestores', ordem: 3 },
];

function abrir(regras: Record<string, number>) {
  render(
    <ColunasDoProtocoloModal
      open
      onOpenChange={() => {}}
      colunas={COLUNAS}
      regrasPorColuna={new Map(Object.entries(regras))}
      salvando={false}
      onAcrescentar={vi.fn()}
      onRenomear={vi.fn()}
      onTirar={vi.fn()}
    />,
  );
}

describe('o aviso de tirar coluna conta o que se perde', () => {
  it('diz quantas regras a coluna tem', async () => {
    abrir({ 'b-fund': 45, 'b-socios': 1 });
    await userEvent.click(screen.getByRole('button', { name: 'Tirar a coluna Fundadores' }));
    expect(screen.getByText(/As 45 regras escritas nesta coluna/)).toBeInTheDocument();
  });

  it('concorda no singular', async () => {
    abrir({ 'b-socios': 1 });
    await userEvent.click(screen.getByRole('button', { name: 'Tirar a coluna Sócios' }));
    expect(screen.getByText(/A regra escrita nesta coluna se perde/)).toBeInTheDocument();
  });

  it('coluna vazia não anuncia perda', async () => {
    abrir({});
    await userEvent.click(screen.getByRole('button', { name: 'Tirar a coluna Sócios Gestores' }));
    expect(screen.getByText(/Nenhuma regra foi escrita nesta coluna ainda/)).toBeInTheDocument();
    expect(screen.queryByText(/não há como desfazer/)).not.toBeInTheDocument();
  });
});
