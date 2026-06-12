import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TextoFormatado } from './TextoFormatado';
import type { SegmentoRender } from '@/lib/templates/render';

const segmentos: SegmentoRender[] = [
  { tipo: 'texto', texto: 'Sócio *' },
  { tipo: 'valor', texto: 'Ana', caminho: 'socio.nome', origem: { tipo: 'pessoa', id: 'p1' } },
  { tipo: 'texto', texto: '*, qualificada.' },
];

describe('TextoFormatado — modo segmentado (valores clicáveis)', () => {
  it('valor com origem vira botão; clique chama onClickOrigem sem propagar ao contêiner', () => {
    const onClickOrigem = vi.fn();
    const onClickFora = vi.fn();
    render(
      <div onClick={onClickFora}>
        <TextoFormatado segmentos={segmentos} onClickOrigem={onClickOrigem} />
      </div>,
    );

    const alvo = screen.getByRole('button');
    // O nome herda o negrito da marca que atravessa texto e valor.
    expect(alvo).toHaveTextContent('Ana');
    expect(alvo.querySelector('strong')).not.toBeNull();

    fireEvent.click(alvo);
    expect(onClickOrigem).toHaveBeenCalledWith({ tipo: 'pessoa', id: 'p1' });
    // O clique no valor é um gesto próprio: não pode abrir o popover do bloco.
    expect(onClickFora).not.toHaveBeenCalled();
  });

  it('origemClicavel=false tira o clique (ex.: sócio legado sem cadastro)', () => {
    render(
      <TextoFormatado
        segmentos={segmentos}
        onClickOrigem={vi.fn()}
        origemClicavel={() => false}
      />,
    );
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Ana')).toBeInTheDocument();
  });

  it('sem onClickOrigem renderiza texto puro (sem botões)', () => {
    render(<TextoFormatado segmentos={segmentos} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('modo string continua intacto (Montagem)', () => {
    render(
      <div data-testid="alvo">
        <TextoFormatado texto={'a *b* c'} />
      </div>,
    );
    const alvo = screen.getByTestId('alvo');
    expect(alvo.textContent).toBe('a b c');
    expect(alvo.querySelector('strong')?.textContent).toBe('b');
  });
});
