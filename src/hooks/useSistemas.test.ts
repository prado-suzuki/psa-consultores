// Testa a camada de escrita/leitura de Sistema — onde viveram os bugs 3.4/3.5:
//  - create/update NÃO enviam campos sintéticos (clustersRateio/rateios) como coluna;
//  - create/update gravam cluster_id;
//  - o rateio é persistido em sistema_clusters (não em sistemas_processo);
//  - a lista hidrata clustersRateio pelo NOME do cluster (como o roiCalculator espera).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));

import { mockSupabaseCapture } from '@/test/supabaseCapture';
import { makeHookWrapper } from '@/test/queryWrapper';
import { useCreateSistema, useUpdateSistema, useSistemas } from './useSistemas';

const INPUT_CREATE = {
  nome: 'PSA PROJECTS', descricao: '', origem: 'Interno',
  custo_licenca_mensal: 0, custo_variavel_por_uso: 0,
  cluster_id: 'C-OSG', rateios: [{ clusterId: 'C-OSG', rateio: 50 }],
} as never;

describe('useSistemas — camada de escrita', () => {
  beforeEach(() => vi.clearAllMocks());

  it('create: grava cluster_id e NÃO manda clustersRateio/rateios/responsaveisHoras como coluna', async () => {
    const cap = mockSupabaseCapture({
      sistemas_processo: [{ id: 'S1', nome: 'PSA PROJECTS', cluster_id: 'C-OSG' }],
      sistema_clusters: [],
    });
    const { result } = renderHook(() => useCreateSistema(), { wrapper: makeHookWrapper() });
    await act(async () => { await result.current.mutateAsync(INPUT_CREATE); });

    const payload = cap.payloads('sistemas_processo', 'insert')[0] as Record<string, unknown>;
    expect(payload).toMatchObject({ nome: 'PSA PROJECTS', cluster_id: 'C-OSG' });
    expect(payload).not.toHaveProperty('clustersRateio');
    expect(payload).not.toHaveProperty('rateios');
    expect(payload).not.toHaveProperty('responsaveisHoras');
    // rateio foi para a tabela dedicada, não para sistemas_processo
    expect(cap.called('sistema_clusters', 'insert')).toBe(true);
  });

  it('create SEM rateios: nasce 100% no seu cluster (participação automática)', async () => {
    const cap = mockSupabaseCapture({
      sistemas_processo: [{ id: 'S9', nome: 'Novo Sis', cluster_id: 'C-OSG' }],
      sistema_clusters: [],
    });
    const { result } = renderHook(() => useCreateSistema(), { wrapper: makeHookWrapper() });
    await act(async () => {
      await result.current.mutateAsync({
        nome: 'Novo Sis', descricao: '', origem: 'Interno',
        custo_licenca_mensal: 0, custo_variavel_por_uso: 0, cluster_id: 'C-OSG',
      } as never);
    });
    expect(cap.payloads('sistema_clusters', 'insert')).toEqual([
      [{ sistema_id: 'S9', cluster_id: 'C-OSG', rateio: 100 }],
    ]);
  });

  it('update: grava cluster_id, sem campo sintético; rateio vai para sistema_clusters', async () => {
    const cap = mockSupabaseCapture({
      sistemas_processo: [{ id: 'S1', nome: 'PSA PROJECTS', cluster_id: 'C-OSG' }],
      sistema_clusters: [],
    });
    const { result } = renderHook(() => useUpdateSistema(), { wrapper: makeHookWrapper() });
    await act(async () => {
      await result.current.mutateAsync({
        id: 'S1', old: {} as never,
        patch: { nome: 'PSA PROJECTS', cluster_id: 'C-OSG', rateios: [{ clusterId: 'C-PSA', rateio: 60 }] } as never,
      });
    });
    const payload = cap.payloads('sistemas_processo', 'update')[0] as Record<string, unknown>;
    expect(payload).toMatchObject({ cluster_id: 'C-OSG' });
    expect(payload).not.toHaveProperty('rateios');
    expect(payload).not.toHaveProperty('clustersRateio');
    expect(cap.called('sistema_clusters', 'insert')).toBe(true);
  });

  it('lista: hidrata clustersRateio pelo NOME do cluster (via embed)', async () => {
    mockSupabaseCapture({
      sistemas_processo: [{
        id: 'S1', nome: 'PSA PROJECTS', cluster_id: null,
        sistema_clusters: [{ cluster_id: 'C-OSG', rateio: 50, estrutura_clusters: { name: 'PSA OSG' } }],
      }],
    });
    const { result } = renderHook(() => useSistemas(), { wrapper: makeHookWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].clustersRateio).toEqual([{ cluster: 'PSA OSG', rateio: 50 }]);
  });
});
