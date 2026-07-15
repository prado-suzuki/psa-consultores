// Testa o sync do rateio por cluster (sistema_clusters) — a função que a edição
// de sistema usa. Cobre o padrão diff (insert/update/delete) e a regra
// "PARTICIPAÇÃO explícita": grava toda entrada com % > 0 (INCLUSIVE 100);
// % 0/ausente = não participa (não vira linha).

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));

import { mockSupabaseCapture } from '@/test/supabaseCapture';
import { syncSistemaClusters } from './sistemaClustersSync';

describe('syncSistemaClusters', () => {
  beforeEach(() => vi.clearAllMocks());

  it('insere participações com % > 0 (INCLUSIVE 100%)', async () => {
    const cap = mockSupabaseCapture({ sistema_clusters: [] });
    await syncSistemaClusters('S1', [
      { clusterId: 'C-OSG', rateio: 50 },
      { clusterId: 'C-PSA', rateio: 100 }, // agora GRAVA (participa 100%)
    ]);
    expect(cap.payloads('sistema_clusters', 'insert')).toEqual([
      [
        { sistema_id: 'S1', cluster_id: 'C-OSG', rateio: 50 },
        { sistema_id: 'S1', cluster_id: 'C-PSA', rateio: 100 },
      ],
    ]);
  });

  it('mantém a linha de 100% (não remove mais o default)', async () => {
    const cap = mockSupabaseCapture({
      sistema_clusters: [{ id: 'r1', cluster_id: 'C-OSG', rateio: 100 }],
    });
    await syncSistemaClusters('S1', [{ clusterId: 'C-OSG', rateio: 100 }]);
    expect(cap.called('sistema_clusters', 'delete')).toBe(false);
    expect(cap.called('sistema_clusters', 'insert')).toBe(false);
    expect(cap.called('sistema_clusters', 'update')).toBe(false);
  });

  it('remove a participação que foi a 0/ausente (deixou de ser membro)', async () => {
    const cap = mockSupabaseCapture({
      sistema_clusters: [{ id: 'r1', cluster_id: 'C-OSG', rateio: 50 }],
    });
    await syncSistemaClusters('S1', [{ clusterId: 'C-OSG', rateio: 0 }]);
    expect(cap.called('sistema_clusters', 'delete')).toBe(true);
    expect(cap.called('sistema_clusters', 'insert')).toBe(false);
  });

  it('atualiza o rateio quando muda o valor', async () => {
    const cap = mockSupabaseCapture({
      sistema_clusters: [{ id: 'r1', cluster_id: 'C-OSG', rateio: 50 }],
    });
    await syncSistemaClusters('S1', [{ clusterId: 'C-OSG', rateio: 70 }]);
    expect(cap.payloads('sistema_clusters', 'update')).toEqual([{ rateio: 70 }]);
    expect(cap.called('sistema_clusters', 'insert')).toBe(false);
  });

  it('não escreve nada quando não há participação (tudo 0) nem linha existente', async () => {
    const cap = mockSupabaseCapture({ sistema_clusters: [] });
    await syncSistemaClusters('S1', [{ clusterId: 'C-OSG', rateio: 0 }]);
    expect(cap.called('sistema_clusters', 'insert')).toBe(false);
    expect(cap.called('sistema_clusters', 'update')).toBe(false);
    expect(cap.called('sistema_clusters', 'delete')).toBe(false);
  });
});
