import { describe, expect, it } from 'vitest';

import { rowActivateProps } from '@/hooks/rowActivateProps';

describe('rowActivateProps', () => {
  it('sem classe de fora, devolve só o cursor', () => {
    expect(rowActivateProps(() => {}).className).toBe('cursor-pointer');
  });

  it('a classe de fora entra JUNTO, e não no lugar', () => {
    /*
     * A armadilha que isto tranca: o objeto devolvido já tem `className`, então
     * espalhá-lo depois de um `className` do chamador substituía o do chamador
     * inteiro, sem erro de tipo e sem aviso de lint. Apagou o `group` da linha de
     * exploração rural, deixando os botões de ação invisíveis no hover, e apagou
     * a moldura dos cartões do Acordo de Quotistas.
     */
    const props = rowActivateProps(() => {}, 'group');
    expect(props.className).toContain('cursor-pointer');
    expect(props.className).toContain('group');
  });

  it('continua sendo botão para o teclado', () => {
    const props = rowActivateProps(() => {}, 'group');
    expect(props.role).toBe('button');
    expect(props.tabIndex).toBe(0);
  });
});
