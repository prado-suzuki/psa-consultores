/**
 * O teto de altura mora nas primitivas, não em cada tela, e é isso que este
 * teste trava. São três — `ui/dialog`, a variante `OsgDialog` e o
 * `ui/alert-dialog` das caixas de confirmação — e o shadcn de origem não tem
 * teto em nenhuma. Como o modal é centralizado por translate, conteúdo maior que
 * a janela cresce para os dois lados e leva o título e o X para fora da borda de
 * cima, onde não há como alcançá-los nem para fechar.
 *
 * O terceiro caso é o que sustenta o plano inteiro: o `cn()` é `tailwind-merge`,
 * então a classe da tela apaga a da primitiva. É por isso que os modais de
 * altura própria e os que precisam de popover escapando não foram tocados. Se um
 * upgrade da lib mudar esse agrupamento, este teste cai antes da tela.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog as OsgDialog,
  DialogContent as OsgDialogContent,
  DialogTitle as OsgDialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

describe('teto de altura das primitivas de modal', () => {
  it('ui/dialog dá teto e rolagem sem a tela pedir', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Padrão</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByRole('dialog')).toHaveClass('max-h-[90vh]', 'overflow-y-auto');
  });

  it('OsgDialog dá o mesmo teto, e mantém o clip-path do scrollbar sobre o raio', () => {
    render(
      <OsgDialog open>
        <OsgDialogContent>
          <OsgDialogTitle>Padrão OSG</OsgDialogTitle>
        </OsgDialogContent>
      </OsgDialog>,
    );

    const modal = screen.getByRole('dialog');
    expect(modal).toHaveClass('max-h-[90vh]', 'overflow-y-auto');
    expect(modal).toHaveClass('sm:[clip-path:inset(0_round_0.75rem)]');
  });

  it('as caixas de confirmação ganham o mesmo teto', () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogTitle>Concluir com subtarefas abertas?</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>,
    );

    // A lista de subtarefas abertas cresce com o dado, e o botão de confirmar
    // vem depois dela: sem teto, é o Continuar que sai pela borda de cima.
    expect(screen.getByRole('alertdialog')).toHaveClass('max-h-[90vh]', 'overflow-y-auto');
  });

  it('a classe da tela apaga a da primitiva, nas duas', () => {
    const proprio = 'max-h-[94vh] overflow-visible';

    const { unmount } = render(
      <Dialog open>
        <DialogContent className={proprio}>
          <DialogTitle>Altura própria</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    const padrao = screen.getByRole('dialog');
    expect(padrao).toHaveClass('max-h-[94vh]', 'overflow-visible');
    expect(padrao).not.toHaveClass('max-h-[90vh]');
    expect(padrao).not.toHaveClass('overflow-y-auto');
    unmount();

    render(
      <OsgDialog open>
        <OsgDialogContent className={proprio}>
          <OsgDialogTitle>Altura própria</OsgDialogTitle>
        </OsgDialogContent>
      </OsgDialog>,
    );

    const osg = screen.getByRole('dialog');
    expect(osg).toHaveClass('max-h-[94vh]', 'overflow-visible');
    expect(osg).not.toHaveClass('max-h-[90vh]');
    expect(osg).not.toHaveClass('overflow-y-auto');
  });
});
