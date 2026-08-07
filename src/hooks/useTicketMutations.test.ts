import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
  useMutation: vi.fn((options: unknown) => options),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

const rlsMocks = vi.hoisted(() => ({
  assertCanPerform: vi.fn<() => Promise<void>>(async () => {}),
  canPerform: vi.fn(),
}));

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
  functions: { invoke: vi.fn() },
  rpc: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/hooks/useRlsPrecheck', () => rlsMocks);
vi.mock('@/hooks/useAuditLog', () => ({ useAuditLog: () => ({ logAction: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: supabaseMocks }));

import { useSendTicketMessage } from '@/hooks/useTicketMutations';
import type { TicketMessageOutcome } from '@/lib/ticketMessageOutcome';

interface DbResult {
  data?: unknown;
  error?: unknown;
}

interface SendParams {
  ticketId: string;
  userId: string;
  message: string;
  isAdmin: boolean;
  actorName?: string;
}

let insertResult: DbResult;
let updateResult: DbResult;
let invokeResult: DbResult | (() => Promise<never>);
let insertPayload: Record<string, unknown> | null;
let updatePayload: Record<string, unknown> | null;
let invokeCount: number;

function mockFrom(table: string) {
  if (table === 'ticket_messages') {
    return {
      insert: (payload: Record<string, unknown>) => {
        insertPayload = payload;
        return Promise.resolve(insertResult);
      },
    };
  }
  if (table === 'tickets') {
    return {
      update: (payload: Record<string, unknown>) => {
        updatePayload = payload;
        return {
          eq: () => ({
            select: () => Promise.resolve(updateResult),
          }),
        };
      },
    };
  }
  throw new Error(`tabela inesperada no teste: ${table}`);
}

function enviar(params?: Partial<SendParams>): Promise<TicketMessageOutcome> {
  // `useMutation` está mockado devolvendo as próprias options, então
  // `result.current` é o registro da mutation.
  const { result } = renderHook(() => useSendTicketMessage());
  const mutation = result.current as unknown as {
    mutationFn: (p: SendParams) => Promise<TicketMessageOutcome>;
  };
  return mutation.mutationFn({
    ticketId: 'tkt-1',
    userId: 'usr-1',
    message: '  Bom dia, seguem os documentos.  ',
    isAdmin: false,
    ...params,
  });
}

beforeEach(() => {
  insertResult = { error: null };
  updateResult = { data: [{ id: 'tkt-1' }], error: null };
  invokeResult = { error: null };
  insertPayload = null;
  updatePayload = null;
  invokeCount = 0;

  supabaseMocks.from.mockImplementation(mockFrom);
  supabaseMocks.functions.invoke.mockImplementation(() => {
    invokeCount += 1;
    return typeof invokeResult === 'function' ? invokeResult() : Promise.resolve(invokeResult);
  });
  rlsMocks.assertCanPerform.mockClear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useSendTicketMessage — caminho completo', () => {
  it('grava, atualiza status e notifica', async () => {
    const outcome = await enviar();

    expect(outcome).toMatchObject({
      ticketId: 'tkt-1',
      persisted: true,
      duplicate: false,
      activityStatusUpdated: true,
      notified: true,
      warnings: [],
    });
    expect(insertPayload).toMatchObject({
      ticket_id: 'tkt-1',
      user_id: 'usr-1',
      message: 'Bom dia, seguem os documentos.',
      is_admin: false,
    });
    expect(updatePayload).toMatchObject({ activity_status: 'aguardando_resposta' });
    expect(invokeCount).toBe(1);
  });

  it('resposta da equipe marca o chamado como respondido', async () => {
    await enviar({ isAdmin: true });
    expect(updatePayload).toMatchObject({ activity_status: 'respondido' });
    expect(updatePayload?.updated_at).toBeUndefined();
  });
});

describe('useSendTicketMessage — nunca reporta falha para mensagem gravada', () => {
  // Este bloco tranca o incidente de 08/07-06/08/2026: efeito colateral que
  // falha não pode virar erro de envio, senão o usuário reenvia e duplica.

  it('UPDATE barrado por RLS (0 linhas, sem erro) não derruba o envio', async () => {
    updateResult = { data: [], error: null };

    const outcome = await enviar();

    expect(outcome.persisted).toBe(true);
    expect(outcome.activityStatusUpdated).toBe(false);
    expect(outcome.warnings).toEqual(['status_nao_atualizado']);
    expect(outcome.notified).toBe(true);
  });

  it('erro explícito no UPDATE também vira aviso, não exceção', async () => {
    updateResult = { data: null, error: { message: 'permission denied' } };

    const outcome = await enviar();

    expect(outcome.persisted).toBe(true);
    expect(outcome.warnings).toContain('status_nao_atualizado');
  });

  it('falha de notificação vira aviso, não exceção', async () => {
    invokeResult = { error: { message: 'edge function 500' } };

    const outcome = await enviar();

    expect(outcome.persisted).toBe(true);
    expect(outcome.notified).toBe(false);
    expect(outcome.warnings).toEqual(['notificacao_nao_enviada']);
  });

  it('exceção lançada pela notificação também é contida', async () => {
    invokeResult = () => Promise.reject(new Error('network'));

    const outcome = await enviar();

    expect(outcome.persisted).toBe(true);
    expect(outcome.warnings).toEqual(['notificacao_nao_enviada']);
  });

  it('acumula as duas pendências', async () => {
    updateResult = { data: [], error: null };
    invokeResult = { error: { message: 'boom' } };

    const outcome = await enviar();

    expect(outcome.persisted).toBe(true);
    expect(outcome.warnings).toEqual(['status_nao_atualizado', 'notificacao_nao_enviada']);
  });
});

describe('useSendTicketMessage — reenvio idêntico', () => {
  it('bloqueio do trigger vira duplicate, sem exceção e sem renotificar', async () => {
    insertResult = {
      error: {
        code: '23505',
        message: 'Mensagem idêntica já registrada neste chamado nos últimos 5 minutos',
      },
    };

    const outcome = await enviar();

    expect(outcome.duplicate).toBe(true);
    expect(outcome.persisted).toBe(true);
    expect(invokeCount).toBe(0);
  });

  it('ainda tenta reacertar o status do chamado', async () => {
    insertResult = { error: { code: '23505', message: 'idêntica já registrada' } };

    await enviar();

    expect(updatePayload).toMatchObject({ activity_status: 'aguardando_resposta' });
  });
});

describe('useSendTicketMessage — falha real', () => {
  it('INSERT barrado por RLS lança, porque nada foi gravado', async () => {
    insertResult = {
      error: { code: '42501', message: 'new row violates row-level security policy' },
    };

    await expect(enviar()).rejects.toMatchObject({ code: '42501' });
    expect(invokeCount).toBe(0);
  });
});

describe('useSendTicketMessage — regressão de arquitetura', () => {
  it('não faz precheck de RLS depois de gravar a mensagem', async () => {
    // O precheck pós-insert é a causa raiz do incidente: ele só pode inventar
    // erro para algo já persistido. Se alguém reintroduzir, este teste quebra.
    await enviar();
    expect(rlsMocks.assertCanPerform).not.toHaveBeenCalled();
  });

  it('o UPDATE pede as linhas afetadas (senão a falha é silenciosa)', async () => {
    const selectSpy = vi.fn(() => Promise.resolve(updateResult));
    supabaseMocks.from.mockImplementation((table: string) => {
      if (table === 'tickets') {
        return { update: () => ({ eq: () => ({ select: selectSpy }) }) };
      }
      return mockFrom(table);
    });

    await enviar();

    expect(selectSpy).toHaveBeenCalled();
  });
});
