import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Ambiente } from '@/config/api';
import type { ClienteRegiao } from '@/lib/clientesPorRegiao';

const STALE_TIME = 5 * 60 * 1000;

/**
 * Clientes com localização, para o mapa de calor do módulo Gerencial.
 *
 * ESCOPO REAL: esta query NÃO filtra por cluster de propósito — a tela
 * Gerencial quer a empresa toda. Mas o que volta é o que a RLS de `cliente`
 * permite: a policy `cliente_select_scoped` (migration
 * 20260713204649_eb71f65b-cce7-4bc8-a2f7-5260237f9493.sql, com o filtro de
 * soft-delete adicionado em 20260714174809) libera TUDO para `admin` e, para os
 * demais papéis internos, só os clientes dos clusters do usuário
 * (`cliente_visivel_para`). Por isso a tela fala "clientes visíveis no seu
 * acesso", nunca "empresa toda".
 *
 * `ativo`: traz ATIVOS E INATIVOS. O mapa responde "onde estão nossos
 * clientes", e um cliente inativo não deixou de ter existido naquela praça —
 * filtrar aqui esconderia presença histórica. Além disso `ativo` é anulável, e
 * um `.eq('ativo', true)` descartaria silenciosamente todos os registros com
 * `null`. A agregação conta os ativos separadamente (`ativos`), então a tela
 * mostra os dois números sem precisar de uma segunda query.
 */
export function useDomainClientesPorRegiao(ambiente: Ambiente) {
  return useQuery<ClienteRegiao[]>({
    queryKey: ['board-clientes-por-regiao', ambiente],
    staleTime: STALE_TIME,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cliente')
        .select('id, nome, uf, municipio, ativo')
        .eq('excluido', false)
        .eq('ambiente', ambiente)
        .order('nome');

      // Erro sobe: devolver [] aqui viraria "nenhum cliente no Brasil" na tela,
      // que é uma mentira indistinguível de base vazia.
      if (error) throw error;

      return (data ?? []) as ClienteRegiao[];
    },
  });
}
