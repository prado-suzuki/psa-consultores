import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { mapEmbedRpc, type EmbedResolution, type EmbedRpcResult } from '@/hooks/useDashboardEmbedUrl';

/**
 * Preview admin (lider+): resolve a URL de um dashboard para um ALVO escolhido
 * (usuário / cluster / cliente), via RPC `preview_dashboard_embed_url`.
 * Reusa o mesmo mapeamento fail-closed do runtime (mapEmbedRpc).
 */
export type PreviewMode = 'user' | 'cluster' | 'cliente' | 'nenhum';

export interface PreviewParams {
  dashboardId: string | null;
  filterType: 'cluster' | 'cliente' | 'nenhum';
  mode: PreviewMode;
  clusterIds?: string[];
  userId?: string | null;
  clienteId?: string | null;
}

function isReady(p: PreviewParams): boolean {
  if (!p.dashboardId) return false;
  if (p.filterType === 'nenhum') return true;
  if (p.mode === 'user') return !!p.userId;
  if (p.mode === 'cluster') return (p.clusterIds?.length ?? 0) > 0;
  if (p.mode === 'cliente') return !!p.clienteId;
  return false;
}

export function usePreviewDashboardEmbedUrl(p: PreviewParams) {
  return useQuery({
    queryKey: [
      'preview-embed', p.dashboardId, p.filterType, p.mode,
      p.userId ?? '', p.clienteId ?? '', (p.clusterIds ?? []).join(','),
    ],
    enabled: isReady(p),
    queryFn: async (): Promise<EmbedResolution & { value: string | null }> => {
      // `enabled`/`isReady` já garantem o id; o guarda faz o tipo dizer isso.
      if (!p.dashboardId) return { ok: false, reason: 'not_found', url: null, value: null };
      const { data, error } = await supabase.rpc('preview_dashboard_embed_url', {
        _dashboard_id: p.dashboardId,
        _mode: p.filterType === 'nenhum' ? 'nenhum' : p.mode,
        _cluster_ids: p.clusterIds ?? [],
        _user_id: p.userId ?? undefined,
        _cliente_id: p.clienteId ?? undefined,
      });
      if (error) throw error;
      // Mesma situação do runtime: a RPC é `Returns: Json`, então a forma só
      // pode ser afirmada aqui, e `mapEmbedRpc` não confia nela.
      const r = (data || {}) as unknown as EmbedRpcResult;
      return { ...mapEmbedRpc(r), value: r.value ?? null };
    },
  });
}
