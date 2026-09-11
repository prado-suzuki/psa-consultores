import { describe, it, expect } from 'vitest';
import { computeFieldDiff, computeEntityListDiff } from './diffUtils';

describe('computeFieldDiff', () => {
  it('retorna diff vazio quando nada mudou', () => {
    const oldObj = { name: 'PSA', cnpj: '111' };
    const newObj = { name: 'PSA', cnpj: '111' };
    expect(computeFieldDiff(oldObj, newObj, ['name', 'cnpj'])).toEqual({});
  });

  it('captura mudança de string', () => {
    const result = computeFieldDiff({ name: 'old' }, { name: 'new' }, ['name']);
    expect(result).toEqual({ name: { old: 'old', new: 'new' } });
  });

  it('trata null e string vazia como equivalentes (sem diff)', () => {
    const result = computeFieldDiff({ desc: null }, { desc: '' }, ['desc']);
    expect(result).toEqual({});
  });

  it('trata oldObj null como criação: registra valores não-vazios', () => {
    const result = computeFieldDiff(null, { name: 'PSA', desc: '' }, ['name', 'desc']);
    // desc é '' que normaliza para '' = old null normalizado para '' → sem diff.
    // name: '' vs 'PSA' → diff.
    expect(result).toEqual({ name: { old: null, new: 'PSA' } });
  });

  it('compara arrays ignorando ordem', () => {
    const a = computeFieldDiff({ tags: ['b', 'a'] }, { tags: ['a', 'b'] }, ['tags']);
    expect(a).toEqual({});
  });

  it('detecta mudança de array por conteúdo', () => {
    const a = computeFieldDiff({ tags: ['a'] }, { tags: ['a', 'b'] }, ['tags']);
    expect(a).toHaveProperty('tags');
  });

  it('ignora chaves internas (_id, _dbId, _tempId)', () => {
    const result = computeFieldDiff(
      { _id: '1', _dbId: '2', name: 'old' },
      { _id: '99', _dbId: '88', name: 'old' },
      ['_id', '_dbId', 'name'],
    );
    expect(result).toEqual({});
  });

  it('compara objetos por JSON.stringify', () => {
    const r1 = computeFieldDiff({ meta: { x: 1 } }, { meta: { x: 1 } }, ['meta']);
    expect(r1).toEqual({});
    const r2 = computeFieldDiff({ meta: { x: 1 } }, { meta: { x: 2 } }, ['meta']);
    expect(r2).toHaveProperty('meta');
  });
});

describe('computeEntityListDiff', () => {
  it('retorna apenas entidades modificadas', () => {
    const oldList = [
      { id: '1', name: 'a' },
      { id: '2', name: 'b' },
    ];
    const newList = [
      { id: '1', name: 'a' }, // unchanged
      { id: '2', name: 'B' }, // changed
    ];
    const result = computeEntityListDiff(oldList, newList, 'id', ['name']);
    expect(result).toEqual([{ entityId: '2', diff: { name: { old: 'b', new: 'B' } } }]);
  });

  it('ignora itens novos (sem DB id no oldList)', () => {
    const result = computeEntityListDiff(
      [],
      [{ id: 'novo', name: 'X' }],
      'id',
      ['name'],
    );
    expect(result).toEqual([]);
  });

  it('ignora item sem id no novo', () => {
    const result = computeEntityListDiff(
      [{ id: '1', name: 'a' }],
      [{ id: undefined as unknown as string, name: 'b' }],
      'id',
      ['name'],
    );
    expect(result).toEqual([]);
  });
});

/**
 * A exclusão é o espelho da criação, e o jeito de escrevê-la tem pegadinha.
 *
 * `computeFieldDiff` aceita `null` no lado ANTIGO (criação) mas NÃO no novo: lá
 * ele faz `newObj[field]` direto. Com `strictNullChecks: false` no tsconfig, o
 * `null` passa pelo typecheck e estoura só em execução — foi assim que a
 * remoção de "não se aplica" derrubou a mutação DEPOIS de já ter apagado a
 * linha (10/09/2026). O lado novo de uma exclusão se escreve `{}`.
 */
describe('computeFieldDiff — a forma de escrever uma exclusão', () => {
  const linha = { id: 'x1', solicitacao_item_id: 'item-1', cliente_id: 'c1' };

  it('exclusão com `{}` no lado novo devolve old preenchido e new nulo', () => {
    const diff = computeFieldDiff(linha, {}, ['solicitacao_item_id', 'cliente_id']);
    expect(diff).toEqual({
      solicitacao_item_id: { old: 'item-1', new: null },
      cliente_id: { old: 'c1', new: null },
    });
  });

  it('é o espelho exato da criação', () => {
    const criacao = computeFieldDiff(null, linha, ['solicitacao_item_id']);
    expect(criacao).toEqual({ solicitacao_item_id: { old: null, new: 'item-1' } });
  });

  /** A regressão em si: `null` no lado novo não é caminho válido. */
  it('`null` no lado novo estoura, e por isso ninguém deve escrever assim', () => {
    expect(() => computeFieldDiff(
      linha, null as unknown as Record<string, unknown>, ['solicitacao_item_id'],
    )).toThrow();
  });
});
