// Testa a escrita de Melhoria — bugs: create sem process_id (400), perda de
// vínculos no save, campos sintéticos como coluna.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));

import { mockSupabaseCapture } from '@/test/supabaseCapture';
import { makeHookWrapper } from '@/test/queryWrapper';
import { useCreateMelhoria } from './useMelhorias';

describe('useCreateMelhoria', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deriva process_id do 1º processo e NÃO manda campos sintéticos como coluna', async () => {
    const cap = mockSupabaseCapture({ process_improvements: [{ id: 'M1', improvement_description: 'X', cluster_id: 'C' }] });
    const { result } = renderHook(() => useCreateMelhoria(), { wrapper: makeHookWrapper() });
    await act(async () => {
      await result.current.mutateAsync({
        improvement_description: 'X', improvement_status: 'Não iniciado', cluster_id: 'C',
        processos: ['P1'], sistemas: ['S1'], acoesTd: ['acao'],
        executadoPor: [{ responsavelId: 'R1', nome: 'Fulano', horas: 2 }],
      } as never);
    });
    const payload = cap.payloads('process_improvements', 'insert')[0] as Record<string, unknown>;
    expect(payload).toMatchObject({ improvement_description: 'X', cluster_id: 'C', process_id: 'P1' });
    for (const sintetico of ['processos', 'sistemas', 'executadoPor', 'treinamentoPor', 'acoesTd', 'clusterName']) {
      expect(payload).not.toHaveProperty(sintetico);
    }
  });

  it('persiste TODAS as junções (processos, sistemas, responsáveis, ações)', async () => {
    const cap = mockSupabaseCapture({ process_improvements: [{ id: 'M1', improvement_description: 'X', cluster_id: 'C' }] });
    const { result } = renderHook(() => useCreateMelhoria(), { wrapper: makeHookWrapper() });
    await act(async () => {
      await result.current.mutateAsync({
        improvement_description: 'X', improvement_status: 'Não iniciado', cluster_id: 'C',
        processos: ['P1'], sistemas: ['S1'], acoesTd: ['acao'],
        executadoPor: [{ responsavelId: 'R1', nome: 'Fulano', horas: 2 }],
      } as never);
    });
    expect(cap.called('melhoria_processos', 'insert')).toBe(true);
    expect(cap.called('melhoria_sistemas', 'insert')).toBe(true);
    expect(cap.called('melhoria_acoes_td', 'insert')).toBe(true);
    const resp = cap.payloads('melhoria_responsaveis', 'insert')[0] as Array<Record<string, unknown>>;
    expect(resp).toContainEqual({ melhoria_id: 'M1', responsavel_id: 'R1', papel: 'executor', horas: 2 });
  });

  it('bloqueia criar melhoria sem processo (evita 400 do process_id NOT NULL)', async () => {
    mockSupabaseCapture({ process_improvements: [] });
    const { result } = renderHook(() => useCreateMelhoria(), { wrapper: makeHookWrapper() });
    await expect(
      act(async () => {
        await result.current.mutateAsync({
          improvement_description: 'X', improvement_status: 'Não iniciado', cluster_id: 'C', processos: [],
        } as never);
      }),
    ).rejects.toThrow(/processo/i);
  });
});
