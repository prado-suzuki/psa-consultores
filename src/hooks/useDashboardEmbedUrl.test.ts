/**
 * Testa o mapeamento puro do retorno da RPC get_dashboard_embed_url.
 * Garante o comportamento FAIL-CLOSED (sem URL quando ok=false) e a montagem
 * correta da URL com o valor resolvido no servidor.
 */
import { describe, it, expect } from 'vitest';
import { mapEmbedRpc } from './useDashboardEmbedUrl';

function decodeParams(url: string): Record<string, string> | null {
  const m = url.match(/[?&]params=([^&]+)/);
  return m ? JSON.parse(decodeURIComponent(m[1])) : null;
}

describe('mapEmbedRpc', () => {
  it('fail-closed: sem acesso → url null', () => {
    expect(mapEmbedRpc({ ok: false, reason: 'no_access' })).toEqual({
      ok: false, reason: 'no_access', url: null,
    });
  });

  it('fail-closed: sem cluster/cliente → url null', () => {
    expect(mapEmbedRpc({ ok: false, reason: 'no_filter_value' }).url).toBeNull();
  });

  it('fail-closed: payload nulo → url null', () => {
    expect(mapEmbedRpc(null).ok).toBe(false);
  });

  it('cluster: injeta o valor (resolvido no servidor) em todas as chaves dsN', () => {
    const r = mapEmbedRpc({
      ok: true, reason: 'ok',
      embed_url: 'https://looker/embed/reporting/RID/page/PID',
      param_names: ['ds0.cluster_id_param', 'ds13.cluster_id_param'],
      value: 'aaa,bbb',
    });
    expect(r.ok).toBe(true);
    expect(decodeParams(r.url!)).toEqual({
      'ds0.cluster_id_param': 'aaa,bbb',
      'ds13.cluster_id_param': 'aaa,bbb',
    });
  });

  it('fail-closed: ok=true sem embed_url → url null, não iframe sem src', () => {
    // O caso que o `strict` achou: `embed_url` é opcional no tipo da RPC, então
    // `ok: true` sem ela produzia `{ ok: true, url: undefined }` e o consumidor
    // montava um iframe sem `src`.
    const r = mapEmbedRpc({ ok: true, reason: 'ok', param_names: ['ds0.x'], value: 'aaa' });
    expect(r).toEqual({ ok: false, reason: 'not_found', url: null });
  });

  it('filter_type=nenhum (value null) → URL base sem params', () => {
    const base = 'https://looker/embed/reporting/RID/page/PID';
    const r = mapEmbedRpc({ ok: true, reason: 'ok', embed_url: base, param_names: [], value: null });
    expect(r.url).toBe(base);
  });
});
