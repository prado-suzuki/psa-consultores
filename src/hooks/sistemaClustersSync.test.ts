// Testa o sync do rateio por cluster (sistema_clusters) — a função que a edição
// de sistema usa. Cobre o padrão diff (insert/update/delete) e a regra "só grava
// rateio != 100" (100 = default; ausência = 100 no ROI).

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));

import { mockSupabaseCapture } from '@/test/supabaseCapture';
import { syncSistemaClusters } from './sistemaClustersSync';

describe('syncSistemaClusters', () => {
  beforeEach(() => vi.clearAllMocks());

  it('insere só rateio != 100 (100 = default, não grava linha)', async () => {
    const cap = mockSupabaseCapture({ sistema_clusters: [] });
    await syncSistemaClusters('S1', [
      { clusterId: 'C-OSG', rateio: 50 },
      { clusterId: 'C-PSA', rateio: 100 }, // default → ignora
    ]);
    expect(cap.payloads('sistema_clusters', 'insert')).toEqual([
      [{ sistema_id: 'S1', cluster_id: 'C-OSG', rateio: 50 }],
    ]);
  });

  it('remove linha que voltou ao default (100/ausente)', async () => {
    const cap = mockSupabaseCapture({
      sistema_clusters: [{ id: 'r1', cluster_id: 'C-OSG', rateio: 50 }],
    });
    await syncSistemaClusters('S1', [{ clusterId: 'C-OSG', rateio: 100 }]);
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

  it('não escreve nada quando não há rateio != 100 nem linha existente', async () => {
    const cap = mockSupabaseCapture({ sistema_clusters: [] });
    await syncSistemaClusters('S1', [{ clusterId: 'C-OSG', rateio: 100 }]);
    expect(cap.called('sistema_clusters', 'insert')).toBe(false);
    expect(cap.called('sistema_clusters', 'update')).toBe(false);
    expect(cap.called('sistema_clusters', 'delete')).toBe(false);
  });
});
