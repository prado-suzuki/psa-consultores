import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { currentAmbiente } from '@/config/api';

export type StatusClienteFiltro = 'ativos' | 'inativos' | 'todos';

export interface RepresentantePendente {
  id_representante: string;
  nome: string;
  email: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_ativo: boolean | null;
}

interface RawRow {
  id_representante: string;
  nome: string;
  email: string | null;
  id_cliente: string;
  cliente: { id: string; nome: string; ativo: boolean | null } | null;
}

/**
 * Lista representantes que ainda NÃO possuem usuário no sistema (user_id IS NULL),
 * com email válido, do ambiente atual e do cliente conforme filtro de status.
 *
 * Usado pela sub-ferramenta "Carga de chamados" em Gerenciar dados.
 */
export const useRepresentantesSemUsuario = (
  status: StatusClienteFiltro,
  enabled: boolean = true,
) => {
  return useQuery({
    queryKey: ['representantes-sem-usuario', currentAmbiente, status],
    enabled,
    staleTime: 30_000,
    queryFn: async (): Promise<RepresentantePendente[]> => {
      let q = supabase
        .from('representante')
        .select(
          'id_representante, nome, email, id_cliente, cliente!inner(id, nome, ativo, ambiente, excluido)',
        )
        .eq('excluido', false)
        .is('user_id', null)
        .not('email', 'is', null)
        .neq('email', '')
        .eq('cliente.ambiente', currentAmbiente)
        .eq('cliente.excluido', false)
        .order('nome', { ascending: true })
        .limit(2000);

      if (status === 'ativos') q = q.eq('cliente.ativo', true);
      else if (status === 'inativos') q = q.or('ativo.is.null,ativo.eq.false', { foreignTable: 'cliente' });

      const { data, error } = await q;
      if (error) throw error;

      const rows = (data ?? []) as unknown as RawRow[];
      return rows
        .filter((r) => r.cliente && isValidEmail(r.email))
        .map<RepresentantePendente>((r) => ({
          id_representante: r.id_representante,
          nome: r.nome,
          email: r.email!.trim().toLowerCase(),
          cliente_id: r.cliente!.id,
          cliente_nome: r.cliente!.nome,
          cliente_ativo: r.cliente!.ativo,
        }));
    },
  });
};
