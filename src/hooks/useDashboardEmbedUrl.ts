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
  // `ok: true` sem `embed_url` é contrato quebrado da RPC, e o ramo existe
  // porque `embed_url` é opcional no tipo dela. Sem isto, `url` saía
  // `undefined` com `ok: true` — o consumidor renderizava iframe sem `src`, ou
  // seja tela quebrada em vez de mensagem. Fail-closed pelo mesmo motivo do
  // ramo acima, e `url: string | null` volta a ser verdade.
  if (!r.embed_url) return { ok: false, reason: 'not_found', url: null };
  const url = buildLookerEmbedUrl(r.embed_url, r.param_names, r.value ?? undefined);
  return { ok: true, reason: r.reason, url };
}

/**
 * O que a tela diz quando o relatório não abre.
 *
 * DUAS COISAS FORAM CORRIGIDAS AQUI, e a segunda é a que importa.
 *
 * 1. Vocabulário. O resto das telas chama isto de RELATÓRIO — o seletor, o
 *    título da rota do Board, o botão "Manual". "Dashboard" só aparecia no
 *    momento do erro, que é o pior momento para mudar de nome.
 *
 * 2. `no_filter_value` dizia só "Nenhum cluster/cliente vinculado ao seu
 *    usuário — dashboard ocultado por segurança", e isso tem dois problemas. A
 *    RPC devolve esse MESMO motivo em duas situações: os clusters da pessoa não
 *    cruzam com o escopo do relatório, OU o escopo do relatório está vazio
 *    (nenhum cluster liberado e `all_clusters` desligado). Na segunda ninguém
 *    abre, admin incluído, e a mensagem mandava investigar o cadastro da PESSOA
 *    quando o problema estava no do RELATÓRIO. E mesmo na primeira, que é a que
 *    acontece hoje — há líder e sublíder sem cluster nenhum vinculado, e os
 *    relatórios do Board são por cluster —, ela não dizia onde consertar.
 *
 *    Enquanto a RPC não separar os dois motivos (mudança de banco, passo
 *    humano), a mensagem nomeia os dois endereços, na ordem em que valem a pena
 *    conferir.
 */
export const EMBED_REASON_LABEL: Record<string, string> = {
  no_access: 'Este relatório não está liberado para o seu usuário.',
  no_filter_value:
    'Este relatório está liberado para você, mas nenhum cluster seu se encaixa no que ele mostra. Confira o vínculo de cluster do usuário em Acessos → Usuários; se estiver certo, o que precisa de revisão é o cadastro do relatório, em Acessos → Dashboards.',
  not_found: 'Este relatório não existe mais, ou foi desativado.',
  unauthenticated: 'Sua sessão expirou. Entre de novo para ver o relatório.',
  bad_filter_type: 'Configuração de filtro inválida no cadastro do dashboard.',
};

export function useDashboardEmbedUrl(dashboardId: string | null) {
  return useQuery({
    queryKey: ['dashboard-embed-url', dashboardId],
    enabled: !!dashboardId,
    queryFn: async (): Promise<EmbedResolution> => {
      // `enabled` já garante isto, mas o guarda faz o tipo dizer a verdade — e
      // fail-closed é a resposta certa aqui de qualquer jeito.
      if (!dashboardId) return { ok: false, reason: 'not_found', url: null };
      const { data, error } = await supabase.rpc('get_dashboard_embed_url', {
        _dashboard_id: dashboardId,
      });
      if (error) throw error;
      // A RPC é declarada `Returns: Json` no schema, então a FORMA do retorno
      // não existe para o compilador — só o `json`. Esta asserção é o único
      // lugar onde ela pode ser afirmada, e `mapEmbedRpc` é escrita para não
      // confiar nela: trata nulo, `ok` ausente e `embed_url` ausente.
      return mapEmbedRpc(data as unknown as EmbedRpcResult);
    },
  });
}
