/**
 * Wiring do hook dos candidatos a responsável da lista.
 *
 * O que este teste protege é o recorte: os candidatos nascem da gente do
 * projeto (membros + responsável + líder), nunca de uma leitura solta de
 * `profiles_safe`. Trocar isso devolve o quadro inteiro da empresa ao seletor
 * da linha e deixa reatribuir tarefa para quem não consegue abri-la.
 */
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
}));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

import { useOrgProjectAssignees } from '@/hooks/useOrgProjectAssignees';
import { supabase } from '@/integrations/supabase/client';

interface DbResult {
  data: unknown;
  error: unknown;
}
interface DbCall {
  table: string;
  method: string;
  args: unknown[];
}

const dbCalls: DbCall[] = [];
const dbResults = new Map<string, DbResult>();

function makeSupabaseChain(table: string) {
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'in']) {
    chain[method] = vi.fn((...args: unknown[]) => {
      dbCalls.push({ table, method, args });
      return chain;
    });
  }
  chain.then = (onFulfilled: (r: DbResult) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(dbResults.get(table) ?? { data: [], error: null }).then(onFulfilled, onRejected);
  return chain;
}

function callsFor(table: string, method: string) {
  return dbCalls.filter(call => call.table === table && call.method === method);
}
function queryRegistration() {
  return reactQueryMocks.useQuery.mock.calls.map(([options]) => options)[0] as Record<string, unknown>;
}
function runQueryFn() {
  return (queryRegistration().queryFn as () => Promise<Record<string, { id: string; name: string }[]>>)();
}

const projetos = [
  { id: 'p1', responsible_id: 'U2', leader_id: 'U1' },
  { id: 'p2', responsible_id: null, leader_id: null },
];

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  dbResults.clear();
  dbResults.set('org_project_members', {
    data: [
      { project_id: 'p1', user_id: 'U3' },
      { project_id: 'p2', user_id: 'U4' },
    ],
    error: null,
  });
  dbResults.set('profiles_safe', {
    data: [
      { id: 'U1', first_name: 'Bernardo', last_name: 'Kropiwiec' },
      { id: 'U2', first_name: 'Ana', last_name: 'Souza' },
      { id: 'U3', first_name: 'Zeca', last_name: null },
      { id: 'U4', first_name: null, last_name: null },
    ],
    error: null,
  });
  vi.mocked(supabase.from).mockImplementation((table: string) => makeSupabaseChain(table) as never);
});

describe('useOrgProjectAssignees', () => {
  it('agrupa por projeto: membros, responsável e líder, em ordem alfabética', async () => {
    renderHook(() => useOrgProjectAssignees(projetos));
    const resultado = await runQueryFn();

    expect(resultado.p1).toEqual([
      { id: 'U2', name: 'Ana Souza' },
      { id: 'U1', name: 'Bernardo Kropiwiec' },
      { id: 'U3', name: 'Zeca' },
    ]);
    // Perfil sem nome nenhum sai da lista: item de select em branco não escolhe.
    expect(resultado.p2).toEqual([]);
  });

  it('lê só os projetos visíveis e só os perfis já recortados', async () => {
    renderHook(() => useOrgProjectAssignees(projetos));
    await runQueryFn();

    expect(callsFor('org_project_members', 'in')[0].args).toEqual(['project_id', ['p1', 'p2']]);
    const perfisIn = callsFor('profiles_safe', 'in')[0].args as [string, string[]];
    expect(perfisIn[0]).toBe('id');
    expect([...perfisIn[1]].sort()).toEqual(['U1', 'U2', 'U3', 'U4']);
    // Nunca a view inteira: sem o `.in`, o seletor voltaria a ser o quadro todo.
    expect(callsFor('profiles_safe', 'in')).toHaveLength(1);
  });

  it('sem projeto na tela, não consulta nada', () => {
    renderHook(() => useOrgProjectAssignees([]));
    expect(queryRegistration().enabled).toBe(false);
  });

  it('a query key acompanha os projetos e a chefia deles', () => {
    renderHook(() => useOrgProjectAssignees(projetos));
    expect(queryRegistration().queryKey).toEqual([
      'org-project-assignees',
      ['p1', 'p2'],
      ['U1', 'U2'],
    ]);
  });
});
