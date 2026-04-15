import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkAreaAccess } from './accessControl';

/**
 * Mock do cliente Supabase. Cada describe configura `mockChain` para cada
 * tabela que o teste precisa retornar.
 *
 * Estrutura testada (replicada de usePageAccess.ts e accessControl.ts):
 *   - page_permissions: lista de páginas por categoria
 *   - user_page_access: acesso explícito user→página
 *   - estrutura_equipe_membros: usuário → equipe
 *   - estrutura_equipes: equipe → área
 *   - estrutura_areas: área → page_categories[]
 */

type Row = Record<string, unknown>;
let tableData: Record<string, Row[]> = {};

vi.mock('@/integrations/supabase/client', () => {
  const buildBuilder = (table: string) => {
    const filters: Array<(row: Row) => boolean> = [];
    let limitVal: number | null = null;

    const builder: any = {
      select: () => builder,
      eq: (col: string, val: unknown) => {
        filters.push((row) => row[col] === val);
        return builder;
      },
      in: (col: string, vals: unknown[]) => {
        filters.push((row) => vals.includes(row[col]));
        return builder;
      },
      limit: (n: number) => {
        limitVal = n;
        return builder;
      },
      then: (resolve: (v: { data: Row[] | null; error: null }) => unknown) => {
        let rows = (tableData[table] ?? []).filter((r) => filters.every((f) => f(r)));
        if (limitVal !== null) rows = rows.slice(0, limitVal);
        return resolve({ data: rows, error: null });
      },
    };
    return builder;
  };

  return {
    supabase: {
      from: (table: string) => buildBuilder(table),
    },
  };
});

beforeEach(() => {
  tableData = {};
});

describe('checkAreaAccess', () => {
  it('admin sempre tem acesso (bypass)', async () => {
    const result = await checkAreaAccess('user-1', 'tax', true);
    expect(result).toBe(true);
  });

  it('retorna false para área inválida', async () => {
    const result = await checkAreaAccess('user-1', 'inexistente', false);
    expect(result).toBe(false);
  });

  it('concede acesso quando usuário tem entrada explícita em user_page_access', async () => {
    tableData = {
      page_permissions: [{ id: 'page-tax-1', category: 'tax' }],
      user_page_access: [{ id: 'a', user_id: 'user-1', page_permission_id: 'page-tax-1' }],
      estrutura_equipe_membros: [],
    };
    const result = await checkAreaAccess('user-1', 'tax', false);
    expect(result).toBe(true);
  });

  it('concede acesso via estrutura quando page_categories da área inclui a categoria', async () => {
    // Bug original do PR #1: sublíder passava por esse caminho enquanto
    // team_member sem estrutura ficava bloqueado. Aqui validamos que o
    // caminho da estrutura funciona para QUALQUER role interna.
    tableData = {
      page_permissions: [], // sem páginas para evitar o caminho 1
      user_page_access: [],
      estrutura_equipe_membros: [{ user_id: 'user-1', equipe_id: 'eq-1' }],
      estrutura_equipes: [{ id: 'eq-1', area_id: 'area-1' }],
      estrutura_areas: [{ id: 'area-1', page_categories: ['tax', 'osg'] }],
    };
    const result = await checkAreaAccess('user-1', 'tax', false);
    expect(result).toBe(true);
  });

  it('nega acesso quando usuário não tem entrada nem vínculo de estrutura', async () => {
    tableData = {
      page_permissions: [{ id: 'page-tax-1', category: 'tax' }],
      user_page_access: [],
      estrutura_equipe_membros: [],
    };
    const result = await checkAreaAccess('user-1', 'tax', false);
    expect(result).toBe(false);
  });

  it('nega acesso quando estrutura_areas.page_categories não inclui a categoria', async () => {
    tableData = {
      page_permissions: [],
      user_page_access: [],
      estrutura_equipe_membros: [{ user_id: 'user-1', equipe_id: 'eq-1' }],
      estrutura_equipes: [{ id: 'eq-1', area_id: 'area-1' }],
      estrutura_areas: [{ id: 'area-1', page_categories: ['osg'] }], // não tem 'tax'
    };
    const result = await checkAreaAccess('user-1', 'tax', false);
    expect(result).toBe(false);
  });
});
