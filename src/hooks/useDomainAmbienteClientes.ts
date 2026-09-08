import { supabase } from '@/integrations/supabase/client';
import type { AmbientePorCliente } from '@/lib/ambienteScope';

// Equivale a STALE_TIMES.MEDIUM. Não importamos de '@/lib/queryClient' porque
// esse módulo instancia o QueryClient e quebraria os testes que mockam
// @tanstack/react-query inteiro.
const CADASTRO_STALE_TIME = 5 * 60 * 1000;

export const ambienteClientesQueryKeys = {
  ambientePorCliente: ['ambiente-por-cliente'] as const,
};

/**
 * Régua de ambiente das listas cujo registro não tem a coluna `ambiente`
 * (org_projects, org_tasks, ordem_servico): id do cliente → ambiente dele.
 *
 * É proposital NÃO filtrar por `currentAmbiente` aqui — quem consome precisa
 * distinguir "cliente do outro ambiente" de "cliente que não existe", e as duas
 * colunas deixam a consulta leve o bastante para valer uma só, cacheada e
 * compartilhada. Use com `queryClient.fetchQuery` dentro de outras queries para
 * não repetir a ida ao banco a cada mudança de filtro.
 *
 * A RÉGUA VEM DE RPC, E NÃO DE `select` NA TABELA. Lida direto, `cliente` passa
 * pela RLS `cliente_select_scoped`, que recorta POR CLUSTER — então a régua
 * chegava incompleta, e "ausente da régua" (que `isDoAmbiente` deixa passar de
 * propósito, para não sumir com trabalho real) virava o caso NORMAL de todo
 * cliente de outro cluster. Efeito medido em produção em 08/09/2026: projeto de
 * `ambiente = dev`, com cliente do cluster OSG, aparecendo na lista de PRODUÇÃO
 * de quem é do cluster TAX — e com o nome do cliente em branco, pela mesma
 * ausência. `ambiente_por_cliente()` é SECURITY DEFINER e devolve só o par
 * (id, ambiente): nenhum nome, nenhum dado de cadastro.
 */
export function ambientePorClienteQuery() {
  return {
    queryKey: ambienteClientesQueryKeys.ambientePorCliente,
    // Cadastro: muda pouco e é consultado por várias listas. Cliente novo que
    // ainda não está no mapa não é escondido (ver isDoAmbiente), então o cache
    // errar por poucos minutos nunca some com trabalho da tela.
    staleTime: CADASTRO_STALE_TIME,
    queryFn: async (): Promise<AmbientePorCliente> => {
      // `ambiente_por_cliente` ainda não está no schema tipado gerado — mesma
      // forma de chamada já usada em useDashboardProjectIds.
      const { data, error } = await (supabase.rpc as unknown as (
        fn: string,
      ) => Promise<{ data: unknown; error: unknown }>)('ambiente_por_cliente');
      if (error) throw error as Error;

      const porCliente: AmbientePorCliente = {};
      for (const linha of (data ?? []) as Array<{ cliente_id: string; ambiente: string | null }>) {
        if (linha.ambiente) porCliente[linha.cliente_id] = linha.ambiente;
      }
      return porCliente;
    },
  };
}
