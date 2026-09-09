import { describe, expect, it } from 'vitest';

import {
  filhasQueEstouram,
  mensagemPrazoDaFilha,
  mensagemPrazoDaMae,
  prazoDaFilhaEstoura,
} from '@/lib/orgTaskPrazo';

describe('prazoDaFilhaEstoura', () => {
  it('acusa a filha que vence depois da mãe', () => {
    expect(prazoDaFilhaEstoura('2026-10-12', '2026-09-30')).toBe(true);
  });

  it('deixa passar o mesmo dia — o limite é "depois", não "antes"', () => {
    expect(prazoDaFilhaEstoura('2026-09-30', '2026-09-30')).toBe(false);
  });

  it('compara mês e ano, não só o número do dia', () => {
    expect(prazoDaFilhaEstoura('2027-01-02', '2026-12-31')).toBe(true);
    expect(prazoDaFilhaEstoura('2026-09-05', '2026-10-01')).toBe(false);
  });

  it('sem uma das datas não há regra: tarefa sem prazo não estoura nada', () => {
    expect(prazoDaFilhaEstoura(null, '2026-09-30')).toBe(false);
    expect(prazoDaFilhaEstoura('2026-10-12', null)).toBe(false);
  });
});

describe('filhasQueEstouram', () => {
  const filhas = [
    { due_date: '2026-09-14' },
    { due_date: '2026-10-05' },
    { due_date: '2026-10-12' },
    { due_date: null },
  ];

  it('conta as que ficam de fora e devolve a última delas', () => {
    expect(filhasQueEstouram(filhas, '2026-09-30')).toEqual({ quantidade: 2, ultima: '2026-10-12' });
  });

  it('devolve nulo quando todas cabem — é o caso comum', () => {
    expect(filhasQueEstouram(filhas, '2026-12-31')).toBeNull();
  });

  it('ignora filha sem prazo', () => {
    expect(filhasQueEstouram([{ due_date: null }], '2026-01-01')).toBeNull();
  });
});

describe('as duas mensagens', () => {
  it('a da filha nomeia o prazo da mãe, em português', () => {
    expect(mensagemPrazoDaFilha('2026-09-30')).toBe(
      'Esta subtarefa não pode vencer depois de 30/09/2026, que é o prazo da tarefa-principal.',
    );
  });

  it('a da mãe diz quantas estouram e até quando', () => {
    expect(mensagemPrazoDaMae({ quantidade: 3, ultima: '2026-10-12' })).toBe(
      '3 subtarefas vencem depois desta data (a última em 12/10/2026). Ajuste o prazo delas antes.',
    );
  });

  it('uma só não vira "1 subtarefas"', () => {
    expect(mensagemPrazoDaMae({ quantidade: 1, ultima: '2026-10-12' })).toBe(
      '1 subtarefa vence depois desta data (em 12/10/2026). Ajuste o prazo dela antes.',
    );
  });
});
