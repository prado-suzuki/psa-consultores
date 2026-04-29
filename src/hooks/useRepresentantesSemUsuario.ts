import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { currentAmbiente } from '@/config/api';

export type StatusClienteFiltro = 'ativos' | 'inativos' | 'todos';
export type TipoClienteFiltro = 'fixos' | 'pontuais' | 'todos';

export interface RepresentantePendente {
  id_representante: string;
  nome: string;
  email: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_ativo: boolean | null;
}

/**
 * Valida se um email é "real" o suficiente para ser usado em criação de usuário
 * e disparo de webhook. Bloqueia placeholders comuns como `xxxx@xxxx.xxx.xx`,
 * `teste@teste`, `email@email`, etc.
 */
const isValidEmail = (raw: string | null | undefined): raw is string => {
  if (!raw) return false;
  const email = raw.trim().toLowerCase();
  // Estrutura mínima: local@dominio.tld (TLD com 2+ chars)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)) return false;
  // Sequências claramente placeholder
  if (/x{3,}/i.test(email)) return false;
  if (/(placeholder|teste@teste|exemplo@exemplo|email@email|dominio\.com)/i.test(email)) return false;
  return true;
};

interface RawRow {
  id_representante: string;
  nome: string;
  email: string | null;
  id_cliente: string;
  cliente: { id: string; nome: string; ativo: boolean | null; fixo: string | null } | null;
}

/**
 * Lista representantes que ainda NÃO possuem usuário no sistema (user_id IS NULL),
 * com email válido, do ambiente atual e do cliente conforme filtros de status e tipo.
 *
 * Usado pela sub-ferramenta "Carga de chamados" em Gerenciar dados.
 */
export const useRepresentantesSemUsuario = (
  status: StatusClienteFiltro,
  enabled: boolean = true,
  tipo: TipoClienteFiltro = 'todos',
) => {
  return useQuery({
    queryKey: ['representantes-sem-usuario', currentAmbiente, status, tipo],
    enabled,
    staleTime: 30_000,
    queryFn: async (): Promise<RepresentantePendente[]> => {
      let q = supabase
        .from('representante')
        .select(
          'id_representante, nome, email, id_cliente, cliente!inner(id, nome, ativo, ambiente, excluido, fixo)',
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

      // Nota: filtro de `fixo` é aplicado client-side abaixo para garantir
      // consistência. O filtro server-side em embedded resource via PostgREST
      // tem comportamento inconsistente quando combinado com `!inner` + `.or()`,
      // o que estava deixando passar clientes pontuais mesmo com tipo='fixos'.

      const { data, error } = await q;
      if (error) throw error;

      const rows = (data ?? []) as unknown as RawRow[];
      return rows
        .filter((r) => {
          if (!r.cliente || !isValidEmail(r.email)) return false;
          if (tipo === 'fixos') return r.cliente.fixo === 'Sim';
          if (tipo === 'pontuais') return r.cliente.fixo !== 'Sim'; // inclui null e 'Não'
          return true;
        })
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
