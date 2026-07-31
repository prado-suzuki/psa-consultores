/**
 * Wiring do hook da lista de menção.
 *
 * O que este teste protege é a fatia de segurança: a lista só pode nascer da
 * roda de gente do projeto da thread (membros, responsável, líder, executor e
 * revisor). Se algum dia alguém trocar isso por uma leitura solta de
 * `profiles_safe`, o nome da tarefa passa a vazar no autocomplete para quem não
 * tem acesso a ela — e é aqui que o teste quebra.
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

import {
  mentionCandidatesQueryKey,
  useDomainMentionCandidates,
} from '@/hooks/useDomainMentionCandidates';
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
  for (const method of ['select', 'eq', 'in']) {
    chain[method] = vi.fn((...args: unknown[]) => {
      dbCalls.push({ table, method, args });
      return chain;
    });
  }
  chain.maybeSingle = vi.fn(() => {
    dbCalls.push({ table, method: 'maybeSingle', args: [] });
    return Promise.resolve(dbResults.get(table) ?? { data: null, error: null });
  });
  chain.then = (onFulfilled: (r: DbResult) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(dbResults.get(table) ?? { data: [], error: null }).then(
      onFulfilled,
      onRejected,
    );
  return chain;
}

function callsFor(table: string, method: string) {
  return dbCalls.filter((call) => call.table === table && call.method === method);
}
function queryRegistration() {
  return reactQueryMocks.useQuery.mock.calls.map(([options]) => options)[0] as Record<
    string,
    unknown
  >;
}
function runQueryFn() {
  return (queryRegistration().queryFn as () => Promise<unknown>)();
}

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  dbResults.clear();
  dbResults.set('org_project_members', {
    data: [{ user_id: 'U3' }, { user_id: 'U4' }],
    error: null,
  });
  dbResults.set('org_projects', { data: { responsible_id: 'U2', leader_id: 'U1' }, error: null });
  dbResults.set('org_tasks', { data: { assigned_to: 'U3', reviewer_id: 'U5' }, error: null });
  dbResults.set('profiles_safe', {
    data: [
      { id: 'U1', first_name: 'Bernardo', last_name: 'Kropiwiec' },
      { id: 'U2', first_name: 'Ana', last_name: 'Souza' },
      { id: 'U3', first_name: 'Zeca', last_name: null },
      { id: 'U4', first_name: null, last_name: null },
      { id: 'U5', first_name: 'Ângela', last_name: 'Nóbrega' },
    ],
    error: null,
  });
  vi.mocked(supabase.from).mockImplementation((table: string) => makeSupabaseChain(table) as never);
});

describe('useDomainMentionCandidates', () => {
  it('registra a query key por entidade e projeto resolvido', () => {
    renderHook(() => useDomainMentionCandidates('org_task', 'task-1', 'proj-1'));
    expect(queryRegistration().queryKey).toEqual([
      'org-mention-candidates',
      'org_task',
      'task-1',
      'proj-1',
    ]);
    expect(mentionCandidatesQueryKey('org_task', 'task-1', 'proj-1')).toEqual(
      queryRegistration().queryKey,
    );
  });

  it('na thread do projeto o próprio projeto é a entidade', () => {
    renderHook(() => useDomainMentionCandidates('org_project', 'proj-9'));
    expect(queryRegistration().queryKey).toEqual([
      'org-mention-candidates',
      'org_project',
      'proj-9',
      'proj-9',
    ]);
    expect(queryRegistration().enabled).toBe(true);
  });

  it('não consulta sem projeto — sem projeto não há lista', () => {
    renderHook(() => useDomainMentionCandidates('org_task', 'task-1', null));
    expect(queryRegistration().enabled).toBe(false);
  });

  it('lê membros, responsável/líder do projeto e executor/revisor da tarefa', async () => {
    renderHook(() => useDomainMentionCandidates('org_task', 'task-1', 'proj-1'));
    await runQueryFn();

    expect(callsFor('org_project_members', 'select')[0].args).toEqual(['user_id']);
    expect(callsFor('org_project_members', 'eq')[0].args).toEqual(['project_id', 'proj-1']);
    expect(callsFor('org_projects', 'select')[0].args).toEqual(['responsible_id, leader_id']);
    expect(callsFor('org_projects', 'eq')[0].args).toEqual(['id', 'proj-1']);
    expect(callsFor('org_tasks', 'select')[0].args).toEqual(['assigned_to, reviewer_id']);
    expect(callsFor('org_tasks', 'eq')[0].args).toEqual(['id', 'task-1']);
  });

  it('busca nome só dos ids da roda do projeto, sem repetir, e ordena em pt-BR', async () => {
    renderHook(() => useDomainMentionCandidates('org_task', 'task-1', 'proj-1'));
    const candidatos = await runQueryFn();

    // U3 é membro e executor: entra uma vez.
    expect(callsFor('profiles_safe', 'in')[0].args).toEqual(['id', ['U3', 'U4', 'U2', 'U1', 'U5']]);
    // U4 não tem nome — não há o que exibir no autocomplete.
    expect(candidatos).toEqual([
      { id: 'U2', name: 'Ana Souza' },
      { id: 'U5', name: 'Ângela Nóbrega' },
      { id: 'U1', name: 'Bernardo Kropiwiec' },
      { id: 'U3', name: 'Zeca' },
    ]);
  });

  it('na thread do projeto não consulta a tarefa', async () => {
    renderHook(() => useDomainMentionCandidates('org_project', 'proj-9'));
    await runQueryFn();

    expect(callsFor('org_tasks', 'select')).toHaveLength(0);
    expect(callsFor('org_project_members', 'eq')[0].args).toEqual(['project_id', 'proj-9']);
  });

  it('não busca nome nenhum quando o projeto está sem gente', async () => {
    dbResults.set('org_project_members', { data: [], error: null });
    dbResults.set('org_projects', { data: null, error: null });
    dbResults.set('org_tasks', { data: null, error: null });

    renderHook(() => useDomainMentionCandidates('org_task', 'task-1', 'proj-1'));
    expect(await runQueryFn()).toEqual([]);
    expect(callsFor('profiles_safe', 'select')).toHaveLength(0);
  });

  it('propaga erro de qualquer uma das leituras', async () => {
    dbResults.set('org_project_members', { data: null, error: new Error('boom') });

    renderHook(() => useDomainMentionCandidates('org_task', 'task-1', 'proj-1'));
    await expect(runQueryFn()).rejects.toThrow('boom');
  });
});
