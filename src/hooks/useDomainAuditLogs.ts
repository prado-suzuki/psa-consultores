import { useQuery } from '@tanstack/react-query';
import { currentAmbiente } from '@/config/api';
import { supabase } from '@/integrations/supabase/client';
import { useProfilesNomeMap } from '@/hooks/useDomainProfiles';
import { resolverProdutoContratado, resolverVinculos } from '@/lib/auditProdutividade';
import type {
  HorasPorId, StatusPorId, VinculoPorId, VinculoProjeto, VinculoTarefa,
} from '@/lib/auditProdutividade';

export interface AuditLog {
  id: string;
  area: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  action: string;
  changed_fields: Record<string, { old: unknown; new: unknown }> | null;
  performed_by: string;
  performed_at: string;
  details: string | null;
}

function buildMap(data: { id: string; label: string }[] | null) {
  const map: Record<string, string> = {};
  data?.forEach((item) => {
    map[item.id] = item.label;
  });
  return map;
}

export function useDomainAuditLookupMaps() {
  const { data: profiles = {} } = useProfilesNomeMap('profiles');

  const { data: projects = {} } = useQuery({
    queryKey: ['audit-lookup-projects'],
    queryFn: async () => {
      const { data } = await supabase.from('org_projects').select('id, name');
      return buildMap(data?.map((item) => ({ id: item.id, label: item.name })) ?? null);
    },
  });

  const { data: areas = {} } = useQuery({
    queryKey: ['audit-lookup-areas'],
    queryFn: async () => {
      const { data } = await supabase.from('estrutura_areas').select('id, name');
      const map: Record<string, string> = {};
      (data || []).forEach((item) => {
        map[item.id] = item.name;
      });
      return map;
    },
  });

  const { data: clients = {} } = useQuery({
    queryKey: ['audit-lookup-clients'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cliente')
        .select('id, nome')
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente);
      return buildMap(data?.map((item) => ({ id: item.id, label: item.nome })) ?? null);
    },
  });

  const { data: contribuintes = {} } = useQuery({
    queryKey: ['audit-lookup-contribuintes'],
    queryFn: async () => {
      const { data } = await supabase
        .from('contribuinte')
        .select('id, nome_razao_social')
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente);
      return buildMap(
        data?.map((item) => ({ id: item.id, label: item.nome_razao_social })) ?? null,
      );
    },
  });

  const { data: servicos = {} } = useQuery({
    queryKey: ['audit-lookup-servicos'],
    queryFn: async () => {
      const { data } = await supabase.from('servicos_prestados').select('id, nome');
      return buildMap(data?.map((item) => ({ id: item.id, label: item.nome })) ?? null);
    },
  });

  const { data: tasks = {} } = useQuery({
    queryKey: ['audit-lookup-tasks'],
    queryFn: async () => {
      const { data } = await supabase.from('org_tasks').select('id, title');
      return buildMap(data?.map((item) => ({ id: item.id, label: item.title })) ?? null);
    },
  });

  return { profiles, projects, areas, clients, contribuintes, servicos, tasks };
}

/**
 * Janela usada na aba Produtividade. A agregação precisa da série inteira do
 * período (não dos 200 últimos como a tabela de histórico), por isso a query é
 * separada: filtra por `performed_at` e sobe o limite.
 */
export function useDomainAuditProdutividade(area: 'tax' | 'osg', dias: number) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - dias);
  // Chave por dia: mantém o cache estável dentro do mesmo dia em vez de
  // invalidar a cada render por causa dos milissegundos do `new Date()`.
  const cutoffDia = cutoff.toISOString().slice(0, 10);

  return useQuery({
    queryKey: ['audit-produtividade', area, cutoffDia],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('area', area)
        .gte('performed_at', `${cutoffDia}T00:00:00.000Z`)
        .order('performed_at', { ascending: false })
        .limit(5000);

      if (error) throw error;
      return data as unknown as AuditLog[];
    },
  });
}

/** Lotes de 200 ids para não estourar o tamanho da URL do filtro `in`. */
function emLotes(ids: string[]): string[][] {
  const lotes: string[][] = [];
  for (let i = 0; i < ids.length; i += 200) lotes.push(ids.slice(i, i + 200));
  return lotes;
}

/**
 * Horas, status atual, cliente, contribuinte e produto contratado dos itens
 * tocados no período. Lê só colunas que já existem — `org_tasks` (horas,
 * `status`, `client_id`, `contribuinte_id`, `servico_id`), `org_projects`
 * (`status`, `contribuinte_id`, `servico_id`, `ordem_servico_id`), `contribuinte.cliente_id`,
 * `os_produtos_contratados`, `produto_servico` e `produto_segmento`.
 * Nenhuma migração.
 *
 * A chave inclui os ids ordenados de propósito: eles mudam quando os logs
 * mudam, e sem isso o React Query devolveria dados defasados após um refetch.
 */
export function useDomainOrgTasksProdutividade(ids: { tarefas: string[]; projetos: string[] }) {
  const tarefasIds = [...ids.tarefas].sort();
  const projetosIds = [...ids.projetos].sort();

  return useQuery({
    queryKey: ['org-tasks-produtividade', tarefasIds, projetosIds],
    enabled: tarefasIds.length > 0 || projetosIds.length > 0,
    queryFn: async () => {
      const respostasTarefas = await Promise.all(emLotes(tarefasIds).map(lote =>
        supabase
          .from('org_tasks')
          .select('id, estimated_hours, actual_hours, status, client_id, contribuinte_id, servico_id, project_id')
          .in('id', lote),
      ));

      const horas: HorasPorId = {};
      // Status de hoje, não o do momento do log: é o que diz se o item tocado no
      // período segue aberto. Tarefa e projeto compartilham o mapa porque o id é
      // uuid — não há colisão entre as duas tabelas.
      const statusPorId: StatusPorId = {};
      // Quem ainda existe hoje. O log sobrevive à exclusão do item, então sem
      // isso a fila de pendências acusaria vínculo faltando em item apagado —
      // pendência que ninguém consegue resolver.
      const existePorId: Record<string, true> = {};
      /** Tarefa/subtarefa → projeto dela, para achar o item órfão. */
      const projetoPorItem: VinculoPorId = {};
      const tarefas: VinculoTarefa[] = [];
      for (const { data, error } of respostasTarefas) {
        if (error) throw error;
        for (const tarefa of data ?? []) {
          horas[tarefa.id] = { planejadas: tarefa.estimated_hours, executadas: tarefa.actual_hours };
          existePorId[tarefa.id] = true;
          if (tarefa.status) statusPorId[tarefa.id] = tarefa.status;
          if (tarefa.project_id) projetoPorItem[tarefa.id] = tarefa.project_id;
          tarefas.push({
            id: tarefa.id,
            client_id: tarefa.client_id,
            contribuinte_id: tarefa.contribuinte_id,
            servico_id: tarefa.servico_id,
            project_id: tarefa.project_id,
          });
        }
      }

      // Projetos tocados diretamente + os projetos das tarefas, que são o
      // fallback de cliente/contribuinte/produto quando a tarefa não tem
      // vínculo próprio.
      const projetosNecessarios = new Set(projetosIds);
      tarefas.forEach(t => { if (t.project_id) projetosNecessarios.add(t.project_id); });

      const respostasProjetos = await Promise.all(emLotes([...projetosNecessarios]).map(lote =>
        supabase
          .from('org_projects')
          .select('id, name, status, contribuinte_id, external_client_id, servico_id, ordem_servico_id')
          .in('id', lote),
      ));

      const projetos: VinculoProjeto[] = [];
      const nomePorProjeto: Record<string, string> = {};
      for (const { data, error } of respostasProjetos) {
        if (error) throw error;
        for (const projeto of data ?? []) {
          existePorId[projeto.id] = true;
          if (projeto.status) statusPorId[projeto.id] = projeto.status;
          nomePorProjeto[projeto.id] = projeto.name;
          projetos.push(projeto);
        }
      }

      // contribuinte → cliente: normaliza para não contar o mesmo cliente duas
      // vezes quando um item aponta para o cliente e outro para um CNPJ dele.
      const contribuintesIds = new Set<string>();
      tarefas.forEach(t => { if (t.contribuinte_id) contribuintesIds.add(t.contribuinte_id); });
      projetos.forEach(p => { if (p.contribuinte_id) contribuintesIds.add(p.contribuinte_id); });

      const clienteDoContribuinte: Record<string, string> = {};
      if (contribuintesIds.size > 0) {
        const respostas = await Promise.all(emLotes([...contribuintesIds]).map(lote =>
          supabase
            .from('contribuinte')
            .select('id, cliente_id')
            .in('id', lote)
            .eq('excluido', false)
            .eq('ambiente', currentAmbiente),
        ));
        for (const { data, error } of respostas) {
          if (error) throw error;
          for (const c of data ?? []) clienteDoContribuinte[c.id] = c.cliente_id;
        }
      }

      const vinculos = resolverVinculos(tarefas, projetos, clienteDoContribuinte);

      // Nome só dos clientes que apareceram — a fila de pendências mostra "de
      // quem é o item", e id de cliente na tela não diz nada a ninguém.
      const clientesIds = [...new Set(Object.values(vinculos.clientePorId))];
      const nomePorCliente: Record<string, string> = {};
      if (clientesIds.length > 0) {
        const respostas = await Promise.all(emLotes(clientesIds).map(lote =>
          supabase
            .from('cliente')
            .select('id, nome')
            .in('id', lote)
            .eq('excluido', false)
            .eq('ambiente', currentAmbiente),
        ));
        for (const { data, error } of respostas) {
          if (error) throw error;
          for (const c of data ?? []) nomePorCliente[c.id] = c.nome;
        }
      }

      // Produto contratado: OS → os_produtos_contratados, cruzado com o serviço
      // do item via produto_servico. Ver `resolverProdutoContratado`.
      const osIds = [...new Set(Object.values(vinculos.osPorId))];
      const produtosPorOs: Record<string, string[]> = {};
      if (osIds.length > 0) {
        const respostas = await Promise.all(emLotes(osIds).map(lote =>
          // os_produtos_contratados não está no schema tipado — cast justificado
          (supabase.from('os_produtos_contratados' as never) as never as {
            select: (cols: string) => { in: (col: string, vals: string[]) => Promise<{
              data: { ordem_servico_id: string; produto_segmento_id: string }[] | null;
              error: unknown;
            }> };
          })
            .select('ordem_servico_id, produto_segmento_id')
            .in('ordem_servico_id', lote),
        ));
        for (const { data, error } of respostas) {
          if (error) throw error;
          for (const row of data ?? []) {
            (produtosPorOs[row.ordem_servico_id] ??= []).push(row.produto_segmento_id);
          }
        }
      }

      const servicosIds = [...new Set(Object.values(vinculos.servicoPorId))];
      const produtosPorServico: Record<string, string[]> = {};
      if (servicosIds.length > 0) {
        const respostas = await Promise.all(emLotes(servicosIds).map(lote =>
          supabase
            .from('produto_servico')
            .select('servico_prestado_id, produto_segmento_id')
            .in('servico_prestado_id', lote),
        ));
        for (const { data, error } of respostas) {
          if (error) throw error;
          for (const row of data ?? []) {
            (produtosPorServico[row.servico_prestado_id] ??= []).push(row.produto_segmento_id);
          }
        }
      }

      const produtoPorId = resolverProdutoContratado(
        vinculos.servicoPorId, vinculos.osPorId, produtosPorOs, produtosPorServico,
      );

      // Nome só dos produtos que apareceram, no formato "código — nome" usado
      // nas telas de OS e de cadastro de projeto.
      const produtosIds = [...new Set(Object.values(produtoPorId))];
      const nomePorProduto: Record<string, string> = {};
      if (produtosIds.length > 0) {
        const respostas = await Promise.all(emLotes(produtosIds).map(lote =>
          supabase.from('produto_segmento').select('id, codigo, nome').in('id', lote),
        ));
        for (const { data, error } of respostas) {
          if (error) throw error;
          for (const p of data ?? []) {
            nomePorProduto[p.id] = [p.codigo, p.nome].filter(Boolean).join(' — ');
          }
        }
      }

      // `produtosPorOs` e `produtosPorServico` saem daqui crus de propósito: é
      // com eles que a aba Não resolvidos explica POR QUE o produto não fechou
      // (OS sem produto contratado × serviço que não casa), sem refazer query.
      return {
        horas, statusPorId, existePorId, projetoPorItem,
        ...vinculos, produtoPorId,
        nomePorProduto, nomePorProjeto, nomePorCliente,
        produtosPorOs, produtosPorServico,
      };
    },
  });
}

export function useDomainAuditLogs(
  area: 'tax' | 'osg',
  entityFilter: string,
  actionFilter: string,
) {
  return useQuery({
    queryKey: ['audit-logs', area, entityFilter, actionFilter],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('area', area)
        .order('performed_at', { ascending: false })
        .limit(200);

      if (entityFilter !== 'all') query = query.eq('entity_type', entityFilter);
      if (actionFilter !== 'all') query = query.eq('action', actionFilter);

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as AuditLog[];
    },
  });
}
