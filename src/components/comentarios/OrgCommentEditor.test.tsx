/**
 * Montagem do editor de verdade (ProseMirror, sem stub).
 *
 * Não tenta digitar — jsdom não reproduz o contenteditable de forma confiável, e
 * o gatilho `@` fica coberto por `MencaoUsuario.test.ts` + `filtrarCandidatos`.
 * O que este teste protege é o que costuma quebrar em silêncio: o conjunto de
 * extensões (conflito de nome/schema), a abertura de cada forma de corpo e a
 * emissão no formato de gravação.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { OrgCommentEditor } from '@/components/comentarios/OrgCommentEditor';
import { serializarDoc, textoPlanoDoCorpo, NO_DE_MENCAO } from '@/lib/orgCommentRichText';

beforeAll(() => {
  // jsdom não tem `elementFromPoint`, que o Placeholder do TipTap usa para achar
  // o trecho visível do documento. Sem esse stub o editor nem monta aqui — no
  // navegador o método existe.
  document.elementFromPoint = () => null;
});

const CANDIDATOS = [
  { id: 'U1', name: 'Bernardo Silva' },
  { id: 'U2', name: 'Ana Souza' },
];

describe('OrgCommentEditor', () => {
  it('monta com as extensões e mostra a barra de formatação', () => {
    render(
      <OrgCommentEditor
        value=""
        onChange={vi.fn()}
        candidates={CANDIDATOS}
        placeholder="Escreva"
      />,
    );

    for (const nome of [
      'Negrito',
      'Itálico',
      'Sublinhado',
      'Lista com marcadores',
      'Lista numerada',
      'Mencionar pessoa',
    ]) {
      expect(screen.getByRole('button', { name: nome })).toBeInTheDocument();
    }
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('abre o documento rico com a menção já como chip', async () => {
    const doc = serializarDoc({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Confira com ' },
            { type: NO_DE_MENCAO, attrs: { id: 'U2', label: 'Ana Souza' } },
          ],
        },
      ],
    });

    const { container } = render(
      <OrgCommentEditor value={doc} onChange={vi.fn()} candidates={CANDIDATOS} />,
    );

    await waitFor(() =>
      expect(container.querySelector('[data-mencao="U2"]')).toHaveTextContent('@Ana Souza'),
    );
    // O uuid não aparece como texto em nenhum momento.
    expect(screen.getByRole('textbox').textContent).toBe('Confira com @Ana Souza');
  });

  it('abre comentário legado em texto plano, convertendo o token em chip', async () => {
    const { container } = render(
      <OrgCommentEditor
        value="Veja com @[Bernardo Silva](U1) hoje"
        onChange={vi.fn()}
        candidates={CANDIDATOS}
      />,
    );

    await waitFor(() =>
      expect(container.querySelector('[data-mencao="U1"]')).toHaveTextContent('@Bernardo Silva'),
    );
    expect(screen.getByRole('textbox').textContent).toBe('Veja com @Bernardo Silva hoje');
  });

  it('emite o corpo no formato de gravação quando o documento muda', async () => {
    const onChange = vi.fn();
    render(<OrgCommentEditor value="" onChange={onChange} candidates={CANDIDATOS} />);

    // A mudança vem por comando do editor, não por digitação — é o suficiente
    // para provar o contrato de saída.
    screen.getByRole('button', { name: 'Mencionar pessoa' }).click();

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const emitido = onChange.mock.calls.at(-1)?.[0] as string;
    expect(textoPlanoDoCorpo(emitido)).toBe('@');
  });
});
