import { describe, expect, it } from 'vitest';
import {
  ID_NATIVO, idParaEmbed, montarOpcoes, selecaoEfetiva,
} from '@/lib/dashboardsSeletor';
import type { AccessibleDashboard } from '@/hooks/useAccessibleDashboards';

const db = (id: string, name: string): AccessibleDashboard => ({
  id, name, filter_type: 'cluster', target_page: 'tax_gerencial', sop_url: null,
});

describe('montarOpcoes', () => {
  it('põe o nativo na frente e preserva a ordem do banco', () => {
    const r = montarOpcoes([db('a', 'Receita'), db('b', 'Margem')], 'Clientes e OS');
    expect(r.map((o) => o.nome)).toEqual(['Clientes e OS', 'Receita', 'Margem']);
    expect(r[0]).toEqual({ id: ID_NATIVO, nome: 'Clientes e OS', nativo: true });
  });

  it('sem nativo, devolve só o que veio do banco', () => {
    expect(montarOpcoes([db('a', 'Receita')])).toEqual([
      { id: 'a', nome: 'Receita', nativo: false },
    ]);
  });

  it('só o nativo, quando o usuário não tem relatório liberado', () => {
    const r = montarOpcoes([], 'Clientes e OS');
    expect(r).toHaveLength(1);
    expect(r[0].nativo).toBe(true);
  });

  it('nada dos dois lados devolve lista vazia', () => {
    expect(montarOpcoes([])).toEqual([]);
    expect(montarOpcoes([], null)).toEqual([]);
  });
});

describe('selecaoEfetiva', () => {
  it('mantém a escolha do usuário quando ela ainda existe', () => {
    const o = montarOpcoes([db('a', 'Receita'), db('b', 'Margem')], 'Clientes e OS');
    expect(selecaoEfetiva(o, 'b')).toBe('b');
  });

  it('cai na primeira quando a escolha sumiu da lista', () => {
    const o = montarOpcoes([db('a', 'Receita')], 'Clientes e OS');
    expect(selecaoEfetiva(o, 'b')).toBe(ID_NATIVO);
  });

  it('sem escolha, começa pela primeira, que é o nativo quando existe', () => {
    expect(selecaoEfetiva(montarOpcoes([db('a', 'Receita')], 'Clientes e OS'), '')).toBe(ID_NATIVO);
    expect(selecaoEfetiva(montarOpcoes([db('a', 'Receita')]), '')).toBe('a');
  });

  it('lista vazia devolve vazio', () => {
    expect(selecaoEfetiva([], 'a')).toBe('');
  });
});

describe('idParaEmbed', () => {
  it('não pede embed para o painel nativo', () => {
    const o = montarOpcoes([db('a', 'Receita')], 'Clientes e OS');
    expect(idParaEmbed(o, ID_NATIVO)).toBeNull();
  });

  it('pede embed para o relatório do banco', () => {
    const o = montarOpcoes([db('a', 'Receita')], 'Clientes e OS');
    expect(idParaEmbed(o, 'a')).toBe('a');
  });

  it('respeita a queda para a primeira opção', () => {
    const o = montarOpcoes([db('a', 'Receita')], 'Clientes e OS');
    // 'zzz' não existe: cai no nativo, que não tem embed
    expect(idParaEmbed(o, 'zzz')).toBeNull();
  });

  it('sem opção nenhuma, não há embed', () => {
    expect(idParaEmbed([], 'a')).toBeNull();
  });
});
