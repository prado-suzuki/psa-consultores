/**
 * A barra é a mesma em toda parte, menos pelos dois botões de código: a
 * descrição de tarefa do projeto passa `withCode={false}` porque ali código é
 * ruído. As extensões seguem carregadas nos dois casos, então nada some do
 * documento; o que muda é só a oferta na barra.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TarefaRichTextEditor } from '@/components/equipe/TarefaRichTextEditor';

const BASICOS = ['Negrito', 'Itálico', 'Sublinhado', 'Lista com marcadores', 'Lista numerada'];

describe('TarefaRichTextEditor — barra de formatação', () => {
  it('oferece código por padrão', () => {
    render(<TarefaRichTextEditor value="" onChange={vi.fn()} ariaLabel="Descrição" />);

    for (const nome of BASICOS) {
      expect(screen.getByRole('button', { name: new RegExp(`^${nome}`) })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: /^Código na linha/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Bloco de código/ })).toBeInTheDocument();
  });

  it('com withCode={false} some com os dois botões de código e mantém o resto', () => {
    render(
      <TarefaRichTextEditor value="" onChange={vi.fn()} ariaLabel="Descrição" withCode={false} />,
    );

    for (const nome of BASICOS) {
      expect(screen.getByRole('button', { name: new RegExp(`^${nome}`) })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: /^Código na linha/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Bloco de código/ })).not.toBeInTheDocument();
  });
});
