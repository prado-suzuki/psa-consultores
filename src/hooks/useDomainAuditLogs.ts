import { useQuery } from '@tanstack/react-query';
import { currentAmbiente } from '@/config/api';
import { supabase } from '@/integrations/supabase/client';
import { useProfilesNomeMap } from '@/hooks/useDomainProfiles';
import { areasDoEscopo, type AuditArea } from '@/lib/auditAreas';
import { resolverProdutoContratado, resolverVinculos } from '@/lib/auditProdutividade';
import type { JanelaAuditoria } from '@/lib/auditPeriodos';
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
 * Teto de linhas por consulta. Períodos longos (um semestre, todo o histórico)
 * podem passar disso, e aí a série volta cortada nos mais recentes — quem exibe
 * precisa avisar em vez de apresentar o corte como se fosse o total. Ver
 * `AuditLimiteAviso`.
 */
export const LIMITE_LOGS_AUDITORIA = 5000;

/**
 * Série de logs de um período, usada pelas abas agregadas (Pessoas,
 * Produtividade, Atividade, Produtos e Não resolvidos). Diferente da tabela de
 * histórico, que mostra os 200 últimos: aqui a agregação precisa do período
 * inteiro, por isso a query é separada, filtra por `performed_at` e sobe o limite.
 *
 * A janela vem pronta de `janelaDoPeriodo` — em datas, não em "quantos dias" —
 * porque o seletor tem tanto "últimos N dias" quanto recortes de calendário.
 * Datas em vez de timestamp mantêm o cache estável dentro do mesmo dia.
 *
 * `area` aceita o consolidado ('todas'): o Board lê Tax e OSG na mesma tela. Com
 * uma área só, o `in` é equivalente ao `eq` de antes.
 */
export function useDomainAuditProdutividade(area: AuditArea, janela: JanelaAuditoria) {
  const { desde, ate } = janela;

  return useQuery({
    queryKey: ['audit-produtividade', area, desde ?? 'inicio', ate ?? 'agora'],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .in('area', areasDoEscopo(area));

      if (desde) query = query.gte('performed_at', `${desde}T00:00:00.000Z`);
      // Fim inclusivo: o dia escolhido entra inteiro.
      if (ate) query = query.lte('performed_at', `${ate}T23:59:59.999Z`);

      const { data, error } = await query
        .order('performed_at', { ascending: false })
        .limit(LIMITE_LOGS_AUDITORIA);

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
 * (`status`, `contribuinte_id`, `servico_id`, `ordem_servico_id`,
 * `produto_segmento_id`), `contribuinte.cliente_id`, `os_produtos_contratados`,
 * `produto_servico` e `produto_segmento`. Nenhuma migração.
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
          .select('id, name, status, contribuinte_id, external_client_id, servico_id, ordem_servico_id, produto_segmento_id')
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

      // Produto: o que o projeto declara em `produto_segmento_id` manda; a OS e o
      // serviço abaixo são o fallback de projeto antigo, que não tem a coluna
      // preenchida. Ver `resolverProdutoContratado`.
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
        vinculos.produtoExplicitoPorId, vinculos.servicoPorId, vinculos.osPorId,
        produtosPorOs, produtosPorServico,
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
  area: AuditArea,
  entityFilter: string,
  actionFilter: string,
) {
  return useQuery({
    queryKey: ['audit-logs', area, entityFilter, actionFilter],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .in('area', areasDoEscopo(area))
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
