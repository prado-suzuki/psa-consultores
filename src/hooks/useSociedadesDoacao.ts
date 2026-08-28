import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LinhaDoQuadro {
  empresa_pessoa_id: string;
  socio_pessoa_id: string;
  quotas: number | null;
}

/**
 * O quadro societário de VÁRIAS empresas de uma vez.
 *
 * Existe para a calculadora saber quais sociedades podem ter quotas doadas. É
 * sempre a holding — a "Participações" —, e o que a identifica não é o nome: é ter
 * pessoa FÍSICA no quadro. Quem tem legítima é pessoa natural, então doação de
 * quotas com legítima só existe onde há PF sócia. Nas operacionais o sócio é a
 * própria holding; elas apareciam na lista da tela e não carregavam nada, porque
 * não têm doador possível.
 *
 * Filtrar por nome seria frágil: a São Bento Agro é patrimonial e não tem
 * "Participações" no nome, e nada obriga a próxima a ter.
 *
 * A leitura é uma consulta só, recortada pelos ids que a tela já conhece — sem
 * join aninhado, que no PostgREST exige `!inner` e quebra silencioso quando o
 * embed muda de nome.
 */
export function useQuadroDasEmpresas(empresaIds: string[]) {
  // A chave ordena os ids para não refazer a consulta quando só a ordem muda.
  const chave = [...empresaIds].sort().join('|');

  return useQuery({
    queryKey: ['itcd-quadro-das-empresas', chave],
    enabled: empresaIds.length > 0,
    queryFn: async (): Promise<LinhaDoQuadro[]> => {
      const { data, error } = await supabase
        .from('quadro_societario')
        .select('empresa_pessoa_id, socio_pessoa_id, quotas')
        .in('empresa_pessoa_id', empresaIds);

      // Sem fallback silencioso: erro sobe e a tela mostra, em vez de virar
      // uma lista vazia que parece "cliente sem sociedade".
      if (error) throw error;
      return data ?? [];
    },
  });
}
