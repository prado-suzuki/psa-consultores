/**
 * O editor é controlado: quem manda no texto é o `value`. Ao montar, o TipTap
 * dispara um `onUpdate` que não mexeu no documento, e propagar esse evento
 * emitia o conteúdo vazio do editor recém-criado por cima do formulário,
 * apagando a descrição que tinha acabado de chegar do banco (a tarefa reabria
 * em branco). Aqui a montagem não pode emitir nada.
 */
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TarefaRichTextEditor } from '@/components/equipe/TarefaRichTextEditor';

describe('TarefaRichTextEditor — emissões', () => {
  it('não chama onChange ao montar com o campo vazio', async () => {
    const onChange = vi.fn();
    const { container } = render(
      <TarefaRichTextEditor value="" onChange={onChange} ariaLabel="Descrição" />,
    );

    await waitFor(() => expect(container.querySelector('.ProseMirror')).not.toBeNull());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('não chama onChange ao receber o texto que veio do banco', async () => {
    const onChange = vi.fn();
    const { container, rerender } = render(
      <TarefaRichTextEditor value="" onChange={onChange} ariaLabel="Descrição" />,
    );
    await waitFor(() => expect(container.querySelector('.ProseMirror')).not.toBeNull());

    // é o que o modal faz quando a descrição chega: troca o `value`
    rerender(
      <TarefaRichTextEditor
        value="<p>plano da tarefa</p>"
        onChange={onChange}
        ariaLabel="Descrição"
      />,
    );

    await waitFor(() =>
      expect(container.querySelector('.ProseMirror')?.textContent).toContain('plano da tarefa'),
    );
    expect(onChange).not.toHaveBeenCalled();
  });
});
