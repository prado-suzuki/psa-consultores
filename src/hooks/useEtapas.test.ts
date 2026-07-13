// Testa a escrita de Etapa (process_stages): o update NÃO manda campos sintéticos
// (docsEntrada/executadoPor/sistemas/ficou/volumeMensal) como coluna — eles vão
// para as junções via sync — e o create nasce como AS-IS.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));

import { mockSupabaseCapture } from '@/test/supabaseCapture';
import { makeHookWrapper } from '@/test/queryWrapper';
import { useUpdateEtapa, useCreateEtapa } from './useEtapas';

describe('useEtapas — escrita em process_stages', () => {
  beforeEach(() => vi.clearAllMocks());

  it('update: payload da coluna NÃO leva campo sintético; vínculos vão pras junções', async () => {
    const cap = mockSupabaseCapture({
      process_stages: [{ id: 'E1', name: 'Nome Novo', scenario: 'AS-IS' }],
      etapa_documentos: [], etapa_responsaveis: [], etapa_sistemas: [],
    });
    const { result } = renderHook(() => useUpdateEtapa(), { wrapper: makeHookWrapper() });
    await act(async () => {
      await result.current.mutateAsync({
        id: 'E1',
        old: {} as never,
        patch: {
          name: 'Nome Novo',
          docsEntrada: [{ documentoId: 'D1', nome: 'Doc', volume: 1 }],
          executadoPor: [{ responsavelId: 'R1', nome: 'F', horas: 2 }],
          sistemas: ['S1'],
          ficou: {} as never,
          volumeMensal: 0,
        } as never,
      });
    });
    const payload = cap.payloads('process_stages', 'update')[0] as Record<string, unknown>;
    expect(payload).toMatchObject({ name: 'Nome Novo' });
    for (const s of ['docsEntrada', 'executadoPor', 'sistemas', 'ficou', 'volumeMensal']) {
      expect(payload).not.toHaveProperty(s);
    }
    // vínculos foram para as junções
    expect(cap.called('etapa_documentos', 'insert')).toBe(true);
    expect(cap.called('etapa_responsaveis', 'insert')).toBe(true);
    expect(cap.called('etapa_sistemas', 'insert')).toBe(true);
  });

  it('create: nasce como AS-IS e sem campo sintético na coluna', async () => {
    const cap = mockSupabaseCapture({
      process_stages: [{ id: 'E9', name: 'Nova', scenario: 'AS-IS' }],
      etapa_documentos: [], etapa_responsaveis: [], etapa_sistemas: [],
    });
    const { result } = renderHook(() => useCreateEtapa(), { wrapper: makeHookWrapper() });
    await act(async () => {
      await result.current.mutateAsync({
        process_id: 'P1', name: 'Nova',
        docsEntrada: [], docsSaida: [], executadoPor: [], sistemas: [],
      } as never);
    });
    const payload = cap.payloads('process_stages', 'insert')[0] as Record<string, unknown>;
    expect(payload).toMatchObject({ name: 'Nova', process_id: 'P1', scenario: 'AS-IS' });
    expect(payload).not.toHaveProperty('docsEntrada');
  });
});
