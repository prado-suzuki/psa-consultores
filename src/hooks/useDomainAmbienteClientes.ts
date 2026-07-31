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
 */
export function ambientePorClienteQuery() {
  return {
    queryKey: ambienteClientesQueryKeys.ambientePorCliente,
    // Cadastro: muda pouco e é consultado por várias listas. Cliente novo que
    // ainda não está no mapa não é escondido (ver isDoAmbiente), então o cache
    // errar por poucos minutos nunca some com trabalho da tela.
    staleTime: CADASTRO_STALE_TIME,
    queryFn: async (): Promise<AmbientePorCliente> => {
      const { data, error } = await supabase
        .from('cliente')
        .select('id, ambiente')
        .eq('excluido', false);
      if (error) throw error;

      const porCliente: AmbientePorCliente = {};
      for (const cliente of data || []) {
        if (cliente.ambiente) porCliente[cliente.id] = cliente.ambiente;
      }
      return porCliente;
    },
  };
}
