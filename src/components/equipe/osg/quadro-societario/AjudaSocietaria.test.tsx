import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { AjudaSocietaria } from './AjudaSocietaria';

const noModal = () =>
  render(
    <Dialog open>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle>Registrar movimento</DialogTitle>
        <AjudaSocietaria chave="aporte" rotulo="Aporte" />
        <button type="button">Quem recebe as quotas</button>
      </DialogContent>
    </Dialog>,
  );

describe('AjudaSocietaria dentro de modal', () => {
  it('o foco automático do modal não abre a dica sobre o campo seguinte', () => {
    noModal();
    expect(screen.getByRole('button', { name: 'Sobre Aporte' })).toHaveFocus();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('foco vindo do teclado continua abrindo a dica', () => {
    noModal();
    const ajuda = screen.getByRole('button', { name: 'Sobre Aporte' });
    screen.getByRole('button', { name: 'Quem recebe as quotas' }).focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    act(() => ajuda.focus());
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('dica fixada pelo clique não intercepta o clique no campo e fecha com ele', async () => {
    noModal();
    fireEvent.click(screen.getByRole('button', { name: 'Sobre Aporte' }));
    const dica = screen.getByRole('tooltip');
    const conteudo = dica.parentElement as HTMLElement;
    expect(conteudo.className).toContain('pointer-events-none');
    expect((conteudo.parentElement as HTMLElement).style.pointerEvents).toBe('none');

    // O Radix só escuta o clique de fora a partir do tique seguinte à abertura.
    await act(() => new Promise((r) => setTimeout(r, 0)));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Quem recebe as quotas' }));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
