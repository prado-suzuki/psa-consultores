import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ComDica, ComoDicas, DicaDoControle } from './itcmdKit';

/**
 * QUANDO A DICA ABRE — e, principalmente, quando NÃO abre.
 *
 * O Radix abre a dica em qualquer foco, e nesta tela isso a fazia subir sozinha em dois
 * momentos que ninguém pediu: ao abrir o modal (o `Dialog` foca o primeiro elemento) e
 * ao escolher uma opção numa lista suspensa (o `Select` devolve o foco ao gatilho).
 *
 * A regra que substituiu o "qualquer foco" é: ponteiro em cima, ou foco vindo de
 * TABULAÇÃO. Os três testes abaixo são os três caminhos, e o do teclado tem de continuar
 * passando — dica que só o ponteiro abre exclui quem navega por Tab.
 */

const tela = (dica: string) => render(
  <ComoDicas>
    <ComDica dica={dica}><span>o valor</span></ComDica>
    <DicaDoControle dica={`${dica} do campo`}>
      <input aria-label="um campo" />
    </DicaDoControle>
  </ComoDicas>,
);

describe('a dica abre sob demanda', () => {
  it('foco vindo de TABULAÇÃO abre — é como o teclado alcança a explicação', () => {
    tela('Quotas que a pessoa vota');
    fireEvent.keyDown(document, { key: 'Tab' });
    fireEvent.focus(screen.getByText('o valor'));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('foco herdado de um CLIQUE em outro lugar não abre', () => {
    // É o caso do `Select`: o clique é no item da lista, e quando ela fecha o foco
    // volta para o gatilho. A dica subia por cima da escolha recém-feita.
    tela('Quotas que a pessoa vota');
    fireEvent.pointerDown(document.body);
    fireEvent.focus(screen.getByLabelText('um campo'));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('foco herdado de outra tecla — o Enter que abriu o modal — não abre', () => {
    tela('Quotas que a pessoa vota');
    fireEvent.keyDown(document, { key: 'Enter' });
    fireEvent.focus(screen.getByText('o valor'));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
