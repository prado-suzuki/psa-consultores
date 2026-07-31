import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import { STALE_TIMES } from '@/lib/queryClient';

/**
 * De que cliente é cada projeto que aparece no feed.
 *
 * Fica fora da consulta do feed de propósito: o comentário já traz o
 * `project_id`, e o nome do cliente é dado de cadastro — muda pouco e é
 * compartilhado por todos os comentários do mesmo projeto. Assim o feed continua
 * paginando por cursor sem carregar o mesmo nome repetido em cada linha, e este
 * cache sobrevive à troca de página.
 *
 * O vínculo é buscado nas duas formas que o sistema usa, na mesma precedência do
 * painel de tarefas: `org_projects.external_client_id` e, quando ele está vazio,
 * o cliente da ordem de serviço do projeto (`ordem_servico.id_cliente`).
 *
 * São consultas separadas porque `external_client_id` não é FK declarada — sem
 * FK, o PostgREST não aceita embutir a tabela do cliente. É o mesmo caminho que
 * `useOrgProjects` já faz.
 *
 * A RLS continua valendo em cada passo: cliente (ou OS) que o usuário não pode
 * ver não volta na consulta e sai do mapa, e o bloco fica sem o nome.
 */

export const feedClientesQueryKey = (projectIds: string[]) =>
  ['feed-clientes', ...projectIds] as const;

/** Nome do cliente por id de projeto. Projeto sem cliente fica fora do mapa. */
export type ClientePorProjeto = ReadonlyMap<string, string>;

async function buscarClientes(projectIds: string[]): Promise<ClientePorProjeto> {
  const { data: projetos, error } = await supabase
    .from('org_projects')
    .select('id, external_client_id, ordem_servico_id')
    .in('id', projectIds);
  if (error) throw error;

  const clienteIdPorProjeto = new Map<string, string>();
  const projetosPorOs = new Map<string, string[]>();

  for (const projeto of projetos ?? []) {
    if (projeto.external_client_id) {
      clienteIdPorProjeto.set(projeto.id, projeto.external_client_id);
      continue;
    }
    if (projeto.ordem_servico_id) {
      const doMesmoOs = projetosPorOs.get(projeto.ordem_servico_id) ?? [];
      doMesmoOs.push(projeto.id);
      projetosPorOs.set(projeto.ordem_servico_id, doMesmoOs);
    }
  }

  if (projetosPorOs.size > 0) {
    const { data: ordens, error: erroOrdens } = await supabase
      .from('ordem_servico')
      .select('id, id_cliente')
      .in('id', [...projetosPorOs.keys()])
      .eq('excluido', false);
    if (erroOrdens) throw erroOrdens;

    for (const ordem of ordens ?? []) {
      if (!ordem.id_cliente) continue;
      for (const projectId of projetosPorOs.get(ordem.id) ?? []) {
        clienteIdPorProjeto.set(projectId, ordem.id_cliente);
      }
    }
  }

  if (clienteIdPorProjeto.size === 0) return new Map();

  const { data: clientes, error: erroClientes } = await supabase
    .from('cliente')
    .select('id, nome')
    .in('id', [...new Set(clienteIdPorProjeto.values())])
    .eq('excluido', false);
  if (erroClientes) throw erroClientes;

  const nomePorClienteId = new Map((clientes ?? []).map((cliente) => [cliente.id, cliente.nome]));

  const porProjeto = new Map<string, string>();
  for (const [projectId, clienteId] of clienteIdPorProjeto) {
    const nome = nomePorClienteId.get(clienteId);
    if (nome) porProjeto.set(projectId, nome);
  }
  return porProjeto;
}

/** Mapa estável do retorno enquanto não há dados — evita remontar o consumidor. */
const VAZIO: ClientePorProjeto = new Map();

/**
 * Recebe os ids de projeto da leva carregada do feed. A lista é ordenada antes
 * de virar chave de cache para a mesma leva não gerar entradas diferentes só por
 * ter chegado em outra ordem.
 */
export function useDomainFeedClientes(projectIds: string[]) {
  const ids = [...new Set(projectIds)].sort();

  const query = useQuery({
    queryKey: feedClientesQueryKey(ids),
    queryFn: () => buscarClientes(ids),
    enabled: ids.length > 0,
    // Cadastro: muda pouco e é lido a cada página nova do feed.
    staleTime: STALE_TIMES.MEDIUM,
  });

  return { clientePorProjeto: query.data ?? VAZIO };
}
