/**
 * O modal é centralizado por translate: sem teto de altura, uma daily de dia
 * cheio empurra o título e o X para fora da borda de cima da janela, onde não
 * há como alcançá-los nem para fechar. Os dois tetos aqui — o do modal e o de
 * cada editor — são o que mantém o cabeçalho e o rodapé sempre visíveis.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DailyEditDialog } from '@/components/equipe/daily/DailyEditDialog';
import type { DailyEditDraft } from '@/lib/equipeDaily';

const RASCUNHO: DailyEditDraft = {
  did_yesterday: '',
  will_do_today: '',
  blockers: '',
};

function abrir() {
  return render(
    <DailyEditDialog
      open
      form={RASCUNHO}
      submitting={false}
      onFormChange={vi.fn()}
      onClose={vi.fn()}
      onSubmit={vi.fn()}
      tasks={[]}
      sprintId="sprint-1"
    />,
  );
}

describe('DailyEditDialog — altura', () => {
  it('limita a altura do modal e rola só o corpo, deixando o cabeçalho fixo', () => {
    abrir();

    const modal = screen.getByRole('dialog');
    expect(modal).toHaveClass('max-h-[90vh]', 'flex', 'flex-col');

    const corpo = screen.getByText('O que fiz ontem?').parentElement?.parentElement;
    expect(corpo).toHaveClass('overflow-y-auto', 'flex-1', 'min-h-0');

    // O título e os botões ficam fora do que rola.
    expect(corpo).not.toContainElement(screen.getByRole('heading', { name: 'Editar Daily' }));
    expect(corpo).not.toContainElement(screen.getByRole('button', { name: 'Salvar Alterações' }));
  });

  it('dá teto de rolagem aos dois editores, para o texto longo não alongar o modal', () => {
    abrir();

    for (const campo of ['O que fiz ontem?', 'O que vou fazer hoje?']) {
      const area = screen.getByLabelText(campo).closest('div.overflow-y-auto');
      expect(area).toHaveClass('max-h-[220px]');
    }
  });
});
