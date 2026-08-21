/**
 * Tarefa aberta por chamado delegado: o trigger `delegar_chamado_gera_tarefa()`
 * copia `tickets.description` para `org_tasks.description` tal e qual, com o
 * marcador de rich text de chamado. O editor da tarefa tem que abrir esse
 * documento formatado, e não despejar o JSON como texto.
 */
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { serializeTicketRichText } from '@/components/chamados/ticketRichTextFormat';
import { TarefaRichTextEditor } from '@/components/equipe/TarefaRichTextEditor';

const DO_CHAMADO = serializeTicketRichText({
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Preciso do ' },
        { type: 'text', text: 'balancete', marks: [{ type: 'bold' }] },
      ],
    },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'março' }] }],
        },
      ],
    },
  ],
});

describe('TarefaRichTextEditor com descrição vinda de chamado', () => {
  it('abre o documento do chamado formatado, sem mostrar marcador nem JSON', async () => {
    const { container } = render(
      <TarefaRichTextEditor value={DO_CHAMADO} onChange={vi.fn()} ariaLabel="Descrição" />,
    );

    const editor = await waitFor(() => {
      const found = container.querySelector('.ProseMirror');
      expect(found).not.toBeNull();
      return found as HTMLElement;
    });

    await waitFor(() => expect(editor.textContent).toContain('balancete'));
    expect(editor.querySelector('strong')?.textContent).toBe('balancete');
    expect(editor.querySelector('ul li')?.textContent).toBe('março');
    expect(editor.textContent).not.toContain('ticket-rich-text');
    expect(editor.textContent).not.toContain('"type"');
  });
});
