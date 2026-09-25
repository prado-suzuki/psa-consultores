import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMocks = vi.hoisted(() => ({ from: vi.fn() }));
const logMock = vi.hoisted(() => ({ logAction: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: dbMocks.from } }));
vi.mock('@/hooks/useAuditLog', () => ({ useAuditLog: () => logMock }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));

import { QueryClient } from '@tanstack/react-query';

import { mockSupabaseChain } from '@/test/supabaseMock';
import { makeHookWrapper } from '@/test/queryWrapper';
import {
  CAMPOS_AUDITADOS,
  type PerfilEnriquecimento,
  type ValoresDoPerfil,
} from '@/lib/enriquecimentoPerfis';
import {
  ENRIQUECIMENTO_PERFIS_QUERY_KEY,
  useAlternarEnriquecimentoPerfil,
  useCriarEnriquecimentoPerfil,
  useEditarEnriquecimentoPerfil,
  useEnriquecimentoPerfis,
} from '@/hooks/useDomainEnriquecimentoPerfis';

/** A linha que o `.single()` devolve depois de insert/update. */
const LINHA_SALVA: PerfilEnriquecimento = {
  id: 'p-novo',
  nome: 'novo-perfil',
  rotulo: 'Novo perfil',
  instrucoes: 'Instruções do perfil.',
  modelo: 'google/gemini-3-flash-preview',
  temperatura: 0.2,
  contrato_saida: { tipo: 'texto' },
  ativo: true,
  updated_at: '2026-09-25T12:00:00Z',
};

/**
 * Espia `supabase.from` capturando payloads de insert/update por tabela e
 * devolvendo `resposta` em qualquer await da cadeia.
 */
function espiar(
  resposta: { data: unknown; error: { message: string } | null } = { data: LINHA_SALVA, error: null },
) {
  const inserts: Record<string, Record<string, unknown>[]> = {};
  const updates: Record<string, Record<string, unknown>[]> = {};

  dbMocks.from.mockImplementation((tabela: string) => {
    const chain = mockSupabaseChain(resposta);
    chain.insert = vi.fn((payload: Record<string, unknown>) => {
      (inserts[tabela] ??= []).push(payload);
      return chain;
    });
    chain.update = vi.fn((payload: Record<string, unknown>) => {
      (updates[tabela] ??= []).push(payload);
      return chain;
    });
    return chain;
  });

  return { inserts, updates };
}

const valoresTexto = (): ValoresDoPerfil => ({
  nome: 'novo-perfil',
  rotulo: 'Novo perfil',
  instrucoes: 'Instruções do perfil.',
  modelo: 'google/gemini-3-flash-preview',
  temperatura: 0.2,
  contrato_saida: { tipo: 'texto' },
  ativo: true,
});

const valoresEstruturado = (): ValoresDoPerfil => ({
  ...valoresTexto(),
  nome: 'comentario-para-tarefa',
  contrato_saida: {
    tipo: 'estruturada',
    campos: {
      titulo: { descricao: 'Título curto da tarefa.' },
      descricao: { descricao: 'Descrição completa da tarefa.' },
    },
  },
});

const montar = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidar = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = makeHookWrapper(queryClient);
  return { queryClient, invalidar, wrapper };
};

beforeEach(() => {
  vi.clearAllMocks();
  logMock.logAction.mockResolvedValue(undefined);
});

describe('useEnriquecimentoPerfis (consulta)', () => {
  it('lê a tabela ordenada por rótulo', async () => {
    const lista = [
      { ...LINHA_SALVA, id: 'p-a', rotulo: 'A primeiro' },
      { ...LINHA_SALVA, id: 'p-b', rotulo: 'B depois' },
    ];
    espiar({ data: lista, error: null });
    const { wrapper } = montar();

    const { result } = renderHook(() => useEnriquecimentoPerfis(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(dbMocks.from).toHaveBeenCalledWith('enriquecimento_perfil');
    expect(result.current.data).toEqual(lista);
    // A ordenação é do banco, pela chamada — a tela não reordena por conta própria.
    const chain = dbMocks.from.mock.results[0].value;
    expect(chain.order).toHaveBeenCalledWith('rotulo', { ascending: true });
  });

  it('propaga o erro do banco para a tela tratar', async () => {
    espiar({ data: null, error: { message: 'tabela sumiu' } });
    const { wrapper } = montar();

    const { result } = renderHook(() => useEnriquecimentoPerfis(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual({ message: 'tabela sumiu' });
  });
});

describe('useCriarEnriquecimentoPerfil', () => {
  it('insere o perfil de texto com autor e audita o conteúdo inteiro', async () => {
    const { inserts } = espiar();
    const { wrapper } = montar();
    const { result } = renderHook(() => useCriarEnriquecimentoPerfil(), { wrapper });

    await result.current.mutateAsync(valoresTexto());

    expect(inserts['enriquecimento_perfil']).toEqual([
      {
        ...valoresTexto(),
        created_by: 'u1',
        updated_by: 'u1',
      },
    ]);

    expect(logMock.logAction).toHaveBeenCalledTimes(1);
    const log = logMock.logAction.mock.calls[0][0];
    expect(log).toMatchObject({
      area: 'dev',
      entity_type: 'enriquecimento_perfil',
      entity_id: 'p-novo',
      entity_name: 'Novo perfil',
      action: 'created',
    });
    // Criação audita campo a campo: o diff contra nulo traz os sete campos.
    expect(Object.keys(log.changed_fields)).toEqual(CAMPOS_AUDITADOS);
    expect(log.changed_fields.rotulo).toEqual({ old: null, new: 'Novo perfil' });
    expect(log.changed_fields.contrato_saida).toEqual({ old: null, new: { tipo: 'texto' } });
  });

  it('insere o perfil estruturado com o contrato de campos montado', async () => {
    const { inserts } = espiar();
    const { wrapper } = montar();
    const { result } = renderHook(() => useCriarEnriquecimentoPerfil(), { wrapper });

    await result.current.mutateAsync(valoresEstruturado());

    expect(inserts['enriquecimento_perfil']![0].contrato_saida).toEqual({
      tipo: 'estruturada',
      campos: {
        titulo: { descricao: 'Título curto da tarefa.' },
        descricao: { descricao: 'Descrição completa da tarefa.' },
      },
    });
  });

  it('invalida a consulta da listagem depois do banco responder', async () => {
    espiar();
    const { wrapper, invalidar } = montar();
    const { result } = renderHook(() => useCriarEnriquecimentoPerfil(), { wrapper });

    await result.current.mutateAsync(valoresTexto());

    expect(invalidar).toHaveBeenCalledWith({ queryKey: ENRIQUECIMENTO_PERFIS_QUERY_KEY });
  });

  it('com o banco recusando, não grava log nem invalida nada', async () => {
    espiar({ data: null, error: { message: 'check de nome falhou' } });
    const { wrapper, invalidar } = montar();
    const { result } = renderHook(() => useCriarEnriquecimentoPerfil(), { wrapper });

    await expect(result.current.mutateAsync(valoresTexto())).rejects.toMatchObject({
      message: 'check de nome falhou',
    });
    expect(logMock.logAction).not.toHaveBeenCalled();
    expect(invalidar).not.toHaveBeenCalled();
  });
});

describe('useEditarEnriquecimentoPerfil', () => {
  const ORIGINAL: PerfilEnriquecimento = {
    ...LINHA_SALVA,
    rotulo: 'Rótulo antigo',
    temperatura: 0.2,
    ativo: true,
  };
  const EDITADO: ValoresDoPerfil = {
    ...valoresTexto(),
    rotulo: 'Rótulo novo',
    temperatura: 0.3,
  };

  it('grava as mudanças sem o nome — a chave de integração não se edita', async () => {
    const { updates } = espiar();
    const { wrapper } = montar();
    const { result } = renderHook(() => useEditarEnriquecimentoPerfil(), { wrapper });

    await result.current.mutateAsync({ original: ORIGINAL, valores: EDITADO });

    const patch = updates['enriquecimento_perfil']![0] as Record<string, unknown>;
    expect(patch).toEqual({
      rotulo: 'Rótulo novo',
      instrucoes: 'Instruções do perfil.',
      modelo: 'google/gemini-3-flash-preview',
      temperatura: 0.3,
      contrato_saida: { tipo: 'texto' },
      ativo: true,
      updated_by: 'u1',
    });
    expect(patch).not.toHaveProperty('nome');
  });

  it('filtra a linha pelo id do registro editado', async () => {
    espiar();
    const { wrapper } = montar();
    const { result } = renderHook(() => useEditarEnriquecimentoPerfil(), { wrapper });

    await result.current.mutateAsync({ original: ORIGINAL, valores: EDITADO });

    const chain = dbMocks.from.mock.results[0].value;
    expect(chain.eq).toHaveBeenCalledWith('id', 'p-novo');
  });

  it('audita só o que mudou, campo a campo, com o antes e o depois', async () => {
    espiar();
    const { wrapper } = montar();
    const { result } = renderHook(() => useEditarEnriquecimentoPerfil(), { wrapper });

    await result.current.mutateAsync({ original: ORIGINAL, valores: EDITADO });

    expect(logMock.logAction).toHaveBeenCalledTimes(1);
    const log = logMock.logAction.mock.calls[0][0];
    expect(log).toMatchObject({
      area: 'dev',
      entity_type: 'enriquecimento_perfil',
      entity_id: 'p-novo',
      action: 'updated',
    });
    expect(Object.keys(log.changed_fields)).toEqual(['rotulo', 'temperatura']);
    expect(log.changed_fields.rotulo).toEqual({ old: 'Rótulo antigo', new: 'Rótulo novo' });
    expect(log.changed_fields.temperatura).toEqual({ old: 0.2, new: 0.3 });
  });
});

describe('useAlternarEnriquecimentoPerfil', () => {
  it('desativa gravando ativo=false e updated_by, e audita o diff do ativo', async () => {
    const { updates } = espiar();
    const { wrapper } = montar();
    const { result } = renderHook(() => useAlternarEnriquecimentoPerfil(), { wrapper });

    await result.current.mutateAsync({ perfil: LINHA_SALVA, ativo: false });

    expect(updates['enriquecimento_perfil']).toEqual([{ ativo: false, updated_by: 'u1' }]);
    const log = logMock.logAction.mock.calls[0][0];
    expect(log.action).toBe('updated');
    expect(log.changed_fields).toEqual({ ativo: { old: true, new: false } });
  });

  it('ativa com ativo=true e o diff cobre a reativação', async () => {
    const { updates } = espiar();
    const desligado: PerfilEnriquecimento = { ...LINHA_SALVA, ativo: false };
    const { wrapper } = montar();
    const { result } = renderHook(() => useAlternarEnriquecimentoPerfil(), { wrapper });

    await result.current.mutateAsync({ perfil: desligado, ativo: true });

    expect(updates['enriquecimento_perfil']).toEqual([{ ativo: true, updated_by: 'u1' }]);
    expect(logMock.logAction.mock.calls[0][0].changed_fields).toEqual({
      ativo: { old: false, new: true },
    });
  });

  it('invalida a listagem depois de alternar', async () => {
    espiar();
    const { wrapper, invalidar } = montar();
    const { result } = renderHook(() => useAlternarEnriquecimentoPerfil(), { wrapper });

    await result.current.mutateAsync({ perfil: LINHA_SALVA, ativo: true });

    expect(invalidar).toHaveBeenCalledWith({ queryKey: ENRIQUECIMENTO_PERFIS_QUERY_KEY });
  });
});
