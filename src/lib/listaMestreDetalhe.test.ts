import { describe, expect, it } from 'vitest';
import { idsAlterados, ordenarPorNome, resolverSelecao, selecaoAposRemover } from '@/lib/listaMestreDetalhe';

const item = (_id: number, extra: Record<string, unknown> = {}) => ({ _id, ...extra });

describe('resolverSelecao', () => {
  it('mantém a seleção quando o item ainda existe', () => {
    expect(resolverSelecao([item(1), item(2), item(3)], 2)).toBe(2);
  });

  // É o que evita o painel de detalhe em branco ao abrir a aba.
  it('cai no primeiro item quando não há seleção', () => {
    expect(resolverSelecao([item(7), item(8)], null)).toBe(7);
  });

  it('cai no primeiro item quando o selecionado sumiu da lista', () => {
    expect(resolverSelecao([item(7), item(8)], 99)).toBe(7);
  });

  it('devolve null só com a lista vazia', () => {
    expect(resolverSelecao([], null)).toBeNull();
    expect(resolverSelecao([], 5)).toBeNull();
  });
});

describe('selecaoAposRemover', () => {
  it('vai para o vizinho de baixo', () => {
    expect(selecaoAposRemover([item(1), item(2), item(3)], 2)).toBe(3);
  });

  it('vai para o de cima quando o removido era o último', () => {
    expect(selecaoAposRemover([item(1), item(2), item(3)], 3)).toBe(2);
  });

  it('remover o primeiro seleciona o que virou primeiro', () => {
    expect(selecaoAposRemover([item(1), item(2)], 1)).toBe(2);
  });

  it('devolve null quando não sobra ninguém', () => {
    expect(selecaoAposRemover([item(1)], 1)).toBeNull();
  });

  it('id inexistente cai no primeiro, sem quebrar', () => {
    expect(selecaoAposRemover([item(1), item(2)], 99)).toBe(1);
  });
});

describe('idsAlterados', () => {
  it('não marca nada quando nada mudou', () => {
    const originais = [item(1, { nome: 'A' }), item(2, { nome: 'B' })];
    expect(idsAlterados([...originais], originais).size).toBe(0);
  });

  it('marca a linha cujo conteúdo mudou', () => {
    const originais = [item(1, { nome: 'A' }), item(2, { nome: 'B' })];
    const atuais = [item(1, { nome: 'A' }), item(2, { nome: 'B alterado' })];
    expect([...idsAlterados(atuais, originais)]).toEqual([2]);
  });

  // Linha recém-criada não tem par no original: conta como alterada, senão
  // entraria no save sem nunca ter sido marcada na lista.
  it('marca a linha nova', () => {
    const originais = [item(1, { nome: 'A' })];
    const atuais = [item(1, { nome: 'A' }), item(9, { nome: 'nova' })];
    expect([...idsAlterados(atuais, originais)]).toEqual([9]);
  });

  it('ordem das chaves não conta como alteração', () => {
    const originais = [{ _id: 1, nome: 'A', cnpj: 'X' }];
    const atuais = [{ _id: 1, cnpj: 'X', nome: 'A' }];
    expect(idsAlterados(atuais, originais).size).toBe(0);
  });

  it('linha removida não aparece: ela sumiu da lista', () => {
    const originais = [item(1), item(2)];
    expect(idsAlterados([item(1)], originais).size).toBe(0);
  });
});

describe('ordenarPorNome', () => {
  type Linha = { _id: number; nome: string };
  const nome = (i: Linha) => i.nome;

  it('ordena pelo nome exibido', () => {
    const itens = [
      { _id: 1, nome: 'Miranda Gestão' },
      { _id: 2, nome: 'Concreto Amoroso' },
      { _id: 3, nome: 'Fribon Transportes Ltda' },
    ];
    expect(ordenarPorNome(itens, nome).map((i) => i._id)).toEqual([2, 3, 1]);
  });

  // Nome todo em maiúsculas é comum no cadastro (veio da Receita) e não pode
  // formar um bloco separado no fim da lista.
  it('não separa maiúsculas de minúsculas', () => {
    const itens = [
      { _id: 1, nome: 'Agropecuaria Miranda' },
      { _id: 2, nome: 'AGROPECUARIA BOMFIM' },
      { _id: 3, nome: 'B B PARTICIPACOES LTDA' },
    ];
    expect(ordenarPorNome(itens, nome).map((i) => i._id)).toEqual([2, 1, 3]);
  });

  it('acento não joga o nome para o fim', () => {
    const itens = [
      { _id: 1, nome: 'Azevedo' },
      { _id: 2, nome: 'Água Boa' },
    ];
    expect(ordenarPorNome(itens, nome).map((i) => i._id)).toEqual([2, 1]);
  });

  // Contribuinte recém-criado ainda não tem nome: no topo ele empurraria a
  // lista inteira a cada item novo.
  it('nome em branco vai para o fim, na ordem em que foi criado', () => {
    const itens = [
      { _id: 1, nome: '' },
      { _id: 2, nome: 'Zeta' },
      { _id: 3, nome: '   ' },
      { _id: 4, nome: 'Alfa' },
    ];
    expect(ordenarPorNome(itens, nome).map((i) => i._id)).toEqual([4, 2, 1, 3]);
  });

  it('não altera a lista recebida', () => {
    const itens = [{ _id: 1, nome: 'Zeta' }, { _id: 2, nome: 'Alfa' }];
    ordenarPorNome(itens, nome);
    expect(itens.map((i) => i._id)).toEqual([1, 2]);
  });
});
