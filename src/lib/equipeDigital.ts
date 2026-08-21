// Quem é "a equipe" nas telas da Rotina.
//
// `profiles_safe` NÃO serve para essa pergunta: a checagem de papel que ela faz por dentro
// (`has_role_or_higher(auth.uid(), 'team_member')`) é sobre quem chama, não sobre quem é listado.
// Para qualquer pessoa interna ela devolve todos os perfis do sistema, clientes e representantes
// do portal inclusive. Era por isso que representante de cliente aparecia no filtro de responsável
// do Kanban. O recorte certo é a estrutura de equipes do cluster Digital, que é o que a tela de
// Sprint já fazia.
//
// `profiles_safe` continua sendo a fonte dos nomes: ela expõe só id e nome, sem e-mail nem
// telefone, e é a única leitura de perfil liberada para quem não é admin.

import { supabase } from '@/integrations/supabase/client';

export const DIGITAL_CLUSTER_ID = '952435d2-ef26-4829-80a2-e186dc61158c';

export interface PerfilEquipe {
  id: string;
  first_name: string;
  last_name: string;
}

interface EquipeDigitalRow {
  gestor_id: string | null;
  estrutura_equipe_membros: Array<{ user_id: string | null }> | null;
}

/**
 * Ids das pessoas do cluster Digital: os gestores das equipes e os membros delas.
 *
 * Uma consulta só, usando embed do PostgREST: a área entra como `!inner` apenas para filtrar o
 * cluster. Todas as tabelas de estrutura são legíveis por `team_member` ou acima, então isso não
 * depende de papel de admin nem de objeto novo no banco.
 */
export async function fetchIdsEquipeDigital(): Promise<string[]> {
  const { data } = await supabase
    .from('estrutura_equipes')
    .select('gestor_id, estrutura_areas!inner(cluster_id), estrutura_equipe_membros(user_id)')
    .eq('estrutura_areas.cluster_id', DIGITAL_CLUSTER_ID);

  return Array.from(
    new Set(
      ((data ?? []) as unknown as EquipeDigitalRow[])
        .flatMap((equipe) => [
          equipe.gestor_id,
          ...(equipe.estrutura_equipe_membros ?? []).map((membro) => membro.user_id),
        ])
        .filter((userId): userId is string => Boolean(userId)),
    ),
  );
}

/** Pessoas da equipe Digital com nome, em ordem alfabética, prontas para um seletor. */
export async function fetchPerfisEquipeDigital(): Promise<PerfilEquipe[]> {
  return fetchNomesDosPerfis(await fetchIdsEquipeDigital());
}

/** Nome das pessoas de uma lista de ids. Sem ids, não consulta. */
export async function fetchNomesDosPerfis(userIds: string[]): Promise<PerfilEquipe[]> {
  if (userIds.length === 0) return [];

  const { data } = await supabase
    .from('profiles_safe')
    .select('id, first_name, last_name')
    .in('id', userIds)
    .order('first_name');

  return (data ?? []) as PerfilEquipe[];
}
