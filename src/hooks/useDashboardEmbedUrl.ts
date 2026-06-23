import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { buildLookerEmbedUrl } from '@/lib/lookerEmbed';

/**
 * Resolve a URL do iframe de um dashboard para o usuário logado.
 *
 * O VALOR do filtro (cluster/cliente) é resolvido server-side pela RPC
 * `get_dashboard_embed_url` a partir de `auth.uid()` — o cliente nunca envia o id.
 * Fail-closed: se a RPC devolver `ok=false` (sem acesso / sem cluster / sem cliente),
 * `url` vem `null` e o consumidor NÃO deve renderizar o iframe.
 *
 * A montagem final da query string acontece aqui (buildLookerEmbedUrl), aplicando
 * o mesmo `value` em todas as chaves `dsN` (fan-out multi-fonte).
 */
export interface EmbedResolution {
  ok: boolean;
  reason: string;
  url: string | null;
}

export interface EmbedRpcResult {
  ok: boolean;
  reason: string;
  embed_url?: string;
  param_names?: string[];
  value?: string | null;
}

/**
 * Mapeia o retorno da RPC `get_dashboard_embed_url` para a resolução final.
 * Puro (testável sem rede): fail-closed quando `ok=false`; senão monta a URL.
 */
export function mapEmbedRpc(data: EmbedRpcResult | null | undefined): EmbedResolution {
  const r = (data || { ok: false, reason: 'not_found' }) as EmbedRpcResult;
  if (!r.ok) return { ok: false, reason: r.reason, url: null };
  const url = buildLookerEmbedUrl(r.embed_url, r.param_names, r.value ?? undefined);
  return { ok: true, reason: r.reason, url };
}

export const EMBED_REASON_LABEL: Record<string, string> = {
  no_access: 'Você não tem acesso a este dashboard.',
  no_filter_value: 'Nenhum cluster/cliente vinculado ao seu usuário — dashboard ocultado por segurança.',
  not_found: 'Dashboard não encontrado ou inativo.',
  unauthenticated: 'Sessão expirada. Faça login novamente.',
  bad_filter_type: 'Configuração de filtro inválida no cadastro do dashboard.',
};

export function useDashboardEmbedUrl(dashboardId: string | null) {
  return useQuery({
    queryKey: ['dashboard-embed-url', dashboardId],
    enabled: !!dashboardId,
    queryFn: async (): Promise<EmbedResolution> => {
      const { data, error } = await (supabase.rpc as any)('get_dashboard_embed_url', {
        _dashboard_id: dashboardId,
      });
      if (error) throw error;
      return mapEmbedRpc(data as EmbedRpcResult);
    },
  });
}
