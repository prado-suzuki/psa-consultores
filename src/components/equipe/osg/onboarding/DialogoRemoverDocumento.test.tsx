import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DialogoRemoverDocumento } from './DialogoRemoverDocumento';

const abrir = (props: Partial<Parameters<typeof DialogoRemoverDocumento>[0]> = {}) => {
  const onCancelar = vi.fn();
  const onConfirmar = vi.fn();
  render(
    <DialogoRemoverDocumento
      documento="Certidão de matrícula"
      doCatalogo
      onCancelar={onCancelar}
      onConfirmar={onConfirmar}
      {...props}
    />,
  );
  return { onCancelar, onConfirmar };
};

describe('DialogoRemoverDocumento', () => {
  it('fica fechado sem documento', () => {
    abrir({ documento: null });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('nomeia o documento e diz o que o cliente deixa de ver', () => {
    abrir();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Remover “Certidão de matrícula” desta solicitação?')).toBeInTheDocument();
    expect(screen.getByText(/O cliente deixa de ver este documento na lista do portal\./)).toBeInTheDocument();
  });

  it('diz como pedir de novo conforme a origem do documento', () => {
    abrir();
    expect(screen.getByText(/use Incluir nos opcionais do grupo/)).toBeInTheDocument();
  });

  it('documento criado à mão volta por um novo com o mesmo nome', () => {
    abrir({ doCatalogo: false });
    expect(screen.getByText(/adicione um documento com o mesmo nome/)).toBeInTheDocument();
    expect(screen.queryByText(/opcionais do grupo/)).not.toBeInTheDocument();
  });

  it('confirma pelo botão com o mesmo nome da ação', async () => {
    const { onConfirmar } = abrir();
    await userEvent.click(screen.getByRole('button', { name: 'Remover desta solicitação' }));
    expect(onConfirmar).toHaveBeenCalledTimes(1);
  });

  it('cancelar não remove', async () => {
    const { onCancelar, onConfirmar } = abrir();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancelar).toHaveBeenCalled();
    expect(onConfirmar).not.toHaveBeenCalled();
  });
});
