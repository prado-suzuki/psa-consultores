// Agregação de produtividade por colaborador a partir de `audit_logs`.
// Funções puras: recebem os logs já carregados pela hook e devolvem as linhas
// da tabela / o CSV. Não falam com Supabase.
//
// IMPORTANTE — honestidade das métricas: `audit_logs` registra EVENTOS de
// Create/Update/Delete, não sessões. Portanto NÃO existe aqui "tempo de uso",
// "tempo médio por processo" nem "tela principal": essas colunas exigem uma
// tabela de telemetria de navegação que o sistema ainda não tem. Toda métrica
// abaixo é contável direto dos eventos, sem estimativa.

import type { AuditLog } from '@/hooks/useDomainAuditLogs';

/** Horas de uma tarefa (`org_tasks.estimated_hours` / `actual_hours`). */
export interface HorasTarefa {
  planejadas: number | null;
  executadas: number | null;
}

export type HorasPorId = Record<string, HorasTarefa>;

/** `entity_id` (tarefa, subtarefa ou projeto) → `cliente.id`. */
export type ClientePorId = Record<string, string>;

/** `entity_id` → id da outra ponta (contribuinte ou serviço prestado). */
export type VinculoPorId = Record<string, string>;

/** Colunas de vínculo de `org_tasks` usadas para achar cliente, CNPJ e produto. */
export interface VinculoTarefa {
  id: string;
  client_id: string | null;
  contribuinte_id: string | null;
  servico_id: string | null;
  project_id: string | null;
}

/** Colunas de vínculo de `org_projects` — o fallback de cada cadeia. */
export interface VinculoProjeto {
  id: string;
  contribuinte_id: string | null;
  servico_id: string | null;
  ordem_servico_id: string | null;
}

export interface VinculosItens {
  /** Sempre em `cliente.id`, com contribuinte normalizado para o cliente dono. */
  clientePorId: ClientePorId;
  /** `contribuinte.id` — o CNPJ, granularidade abaixo do cliente. */
  contribuintePorId: VinculoPorId;
  /** `servicos_prestados.id` — o serviço executado no item. */
  servicoPorId: VinculoPorId;
  /** `ordem_servico.id` do projeto do item. */
  osPorId: VinculoPorId;
}

/**
 * Resolve, para cada item tocado, o cliente, o contribuinte, o serviço e a OS.
 *
 * A cadeia é sempre "o que está na tarefa, senão o que está no projeto dela":
 * - cliente: `client_id` → cliente do `contribuinte_id` → cliente do projeto;
 * - contribuinte: `contribuinte_id` da tarefa → do projeto;
 * - serviço: `servico_id` da tarefa → do projeto;
 * - OS: só existe no projeto (`ordem_servico_id`).
 *
 * Normalizar contribuinte para cliente é o que impede contar o mesmo cliente
 * duas vezes quando uma tarefa aponta para o cliente e outra para um CNPJ dele.
 * Já a contagem de contribuintes fica em `contribuintePorId` justamente porque é
 * uma pergunta diferente — quantos CNPJs, não quantos clientes.
 *
 * `org_projects.external_client_id` fica de fora de propósito: aponta para
 * outra tabela de clientes e misturar as duas inflaria a contagem.
 */
export function resolverVinculos(
  tarefas: VinculoTarefa[],
  projetos: VinculoProjeto[],
  clienteDoContribuinte: Record<string, string>,
): VinculosItens {
  const clientePorId: ClientePorId = {};
  const contribuintePorId: VinculoPorId = {};
  const servicoPorId: VinculoPorId = {};
  const osPorId: VinculoPorId = {};

  for (const projeto of projetos) {
    if (projeto.contribuinte_id) {
      contribuintePorId[projeto.id] = projeto.contribuinte_id;
      const cliente = clienteDoContribuinte[projeto.contribuinte_id];
      if (cliente) clientePorId[projeto.id] = cliente;
    }
    if (projeto.servico_id) servicoPorId[projeto.id] = projeto.servico_id;
    if (projeto.ordem_servico_id) osPorId[projeto.id] = projeto.ordem_servico_id;
  }

  for (const tarefa of tarefas) {
    const contribuinte = tarefa.contribuinte_id
      ?? (tarefa.project_id ? contribuintePorId[tarefa.project_id] : undefined);
    if (contribuinte) contribuintePorId[tarefa.id] = contribuinte;

    const cliente = tarefa.client_id
      ?? (contribuinte ? clienteDoContribuinte[contribuinte] : undefined)
      ?? (tarefa.project_id ? clientePorId[tarefa.project_id] : undefined);
    if (cliente) clientePorId[tarefa.id] = cliente;

    const servico = tarefa.servico_id
      ?? (tarefa.project_id ? servicoPorId[tarefa.project_id] : undefined);
    if (servico) servicoPorId[tarefa.id] = servico;

    const os = tarefa.project_id ? osPorId[tarefa.project_id] : undefined;
    if (os) osPorId[tarefa.id] = os;
  }

  return { clientePorId, contribuintePorId, servicoPorId, osPorId };
}

/**
 * Produto contratado na OS de cada item, em `produto_segmento.id`.
 *
 * O produto não fica gravado no projeto nem na tarefa: o que fica gravado é o
 * `servico_id`. O produto se resolve cruzando esse serviço com os produtos
 * contratados na OS do projeto (`os_produtos_contratados` × `produto_servico`) —
 * a mesma regra que a tela de cadastro de projeto usa em
 * `resolveProdutoIdByServico`, para os dois lugares mostrarem o mesmo produto.
 *
 * Regras, nesta ordem:
 * 1. serviço do item que também está em algum produto contratado na OS → esse
 *    produto (empate resolvido pelo menor id, para o número não dançar entre
 *    carregamentos);
 * 2. sem cruzamento, mas a OS tem um único produto contratado → esse produto;
 * 3. caso contrário fica sem produto — a agregação joga no bucket próprio em vez
 *    de escolher um produto no chute.
 */
export function resolverProdutoContratado(
  servicoPorId: VinculoPorId,
  osPorId: VinculoPorId,
  produtosPorOs: Record<string, string[]>,
  produtosPorServico: Record<string, string[]>,
): VinculoPorId {
  const produtoPorId: VinculoPorId = {};

  for (const [itemId, osId] of Object.entries(osPorId)) {
    const produtosDaOs = produtosPorOs[osId];
    if (!produtosDaOs?.length) continue;

    const servico = servicoPorId[itemId];
    const doServico = servico ? produtosPorServico[servico] ?? [] : [];
    const candidatos = produtosDaOs.filter(produto => doServico.includes(produto));

    const escolhido = candidatos.length > 0
      ? [...candidatos].sort()[0]
      : (produtosDaOs.length === 1 ? produtosDaOs[0] : undefined);

    if (escolhido) produtoPorId[itemId] = escolhido;
  }

  return produtoPorId;
}

export interface LinhaProdutividade {
  /** `performed_by` — id do profile. */
  userId: string;
  /** Nome resolvido; cai para 'Desconhecido' quando o profile não é visível. */
  nome: string;
  /**
   * Tarefas e subtarefas distintas que a pessoa levou a concluído no período — o
   * equivalente de "processos executados". Projeto NÃO entra aqui: finalizar um
   * projeto é outro tipo de entrega e tem coluna própria. Sai do
   * `changed_fields.status` que já vem nos logs. Ver `ehConclusao`.
   */
  processosExecutados: number;
  /** Projetos distintos que a pessoa levou a Concluído (`status` = completed). */
  projetosFinalizados: number;
  /**
   * Clientes diferentes em que a pessoa tocou no período (qualquer ação, não só
   * conclusão). Item sem cliente vinculado não entra na contagem.
   */
  clientesDistintos: number;
  /** Contribuintes (CNPJs) diferentes em que a pessoa tocou no período. */
  contribuintesDistintos: number;
  /** Soma de `estimated_hours` dos itens concluídos; null se nenhum tinha estimativa. */
  horasPlanejadas: number | null;
  /** Soma de `actual_hours` dos itens concluídos; null se nenhum tinha apontamento. */
  horasExecutadas: number | null;
  /** Denominador do tempo médio — quantos itens concluídos têm horas apontadas. */
  itensComHorasExecutadas: number;
  /** horasExecutadas ÷ itensComHorasExecutadas. Null quando não há apontamento. */
  tempoMedioProcesso: number | null;
  registros: number;
  criacoes: number;
  edicoes: number;
  exclusoes: number;
  /** Entidades distintas tocadas (por `entity_id`). */
  itensDistintos: number;
  /** Dias do calendário com pelo menos um registro. */
  diasAtivos: number;
  /** registros / diasAtivos — razão com denominador real, nunca fabricada. */
  mediaPorDiaAtivo: number;
  /** Tipo de entidade mais frequente (`entity_type` bruto) ou null se vazio. */
  tipoMaisFrequente: string | null;
  /** ISO do registro mais recente. */
  ultimoRegistro: string;
}

export interface ResumoProdutividade {
  colaboradoresAtivos: number;
  /** Tarefas/subtarefas levadas a concluído por qualquer colaborador no período. */
  processosExecutados: number;
  /** Projetos levados a Concluído no período. */
  projetosFinalizados: number;
  /** Clientes distintos atendidos pela equipe no período. */
  clientesDistintos: number;
  /** Contribuintes (CNPJs) distintos atendidos pela equipe no período. */
  contribuintesDistintos: number;
  registros: number;
  itensDistintos: number;
  /** Dias do calendário com atividade de qualquer colaborador. */
  diasComAtividade: number;
}

/** `performed_at` ISO → chave de dia (YYYY-MM-DD), sem depender de timezone local. */
function diaDoRegistro(performedAt: string): string {
  return performedAt.slice(0, 10);
}

/**
 * Valores de status que significam "concluído" no sistema. `done` é o enum
 * `fiscal_task_status` (tarefas e subtarefas); `completed` aparece nos demais
 * status traduzidos como "Concluída". Se um enum novo de conclusão entrar no
 * banco, some aqui — é o único ponto a mexer.
 */
const STATUS_CONCLUIDO = new Set(['done', 'completed']);

/** Distingue conclusão de projeto de conclusão de tarefa/subtarefa. */
function ehProjeto(log: AuditLog): boolean {
  return log.entity_type === 'project';
}

/**
 * Um log conta como conclusão quando a própria edição levou o status para
 * concluído. Só `updated` entra: criar um item já concluído não é execução de
 * trabalho registrada, e reabrir + concluir de novo não infla a contagem
 * porque o chamador acumula `entity_id` distintos.
 */
export function ehConclusao(log: AuditLog): boolean {
  if (log.action !== 'updated') return false;
  const mudancaStatus = log.changed_fields?.status;
  if (!mudancaStatus) return false;
  return STATUS_CONCLUIDO.has(String(mudancaStatus.new));
}

interface Acumulador {
  userId: string;
  /** Tarefas/subtarefas concluídas — base de processos executados e das horas. */
  concluidos: Set<string>;
  /** Projetos finalizados. */
  projetos: Set<string>;
  registros: number;
  criacoes: number;
  edicoes: number;
  exclusoes: number;
  itens: Set<string>;
  dias: Set<string>;
  tipos: Map<string, number>;
  ultimoRegistro: string;
}

/**
 * Ids de tarefas/subtarefas concluídas no período — a lista que o chamador usa
 * para buscar as horas em `org_tasks`. Projeto fica fora: o id não existe
 * naquela tabela e projeto não tem horas apontadas.
 */
export function idsConcluidos(logs: AuditLog[]): string[] {
  const ids = new Set<string>();
  for (const log of logs) {
    if (log.entity_type === 'project') continue;
    if (ehConclusao(log)) ids.add(log.entity_id);
  }
  return [...ids];
}

/** Ids tocados por qualquer ação, separados por tabela de destino. */
export function idsTocados(logs: AuditLog[]): { tarefas: string[]; projetos: string[] } {
  const tarefas = new Set<string>();
  const projetos = new Set<string>();
  for (const log of logs) {
    if (log.entity_type === 'project') projetos.add(log.entity_id);
    else tarefas.add(log.entity_id);
  }
  return { tarefas: [...tarefas], projetos: [...projetos] };
}

export function agregarProdutividade(
  logs: AuditLog[],
  nomePorId: Record<string, string>,
  horasPorId: HorasPorId = {},
  clientePorId: ClientePorId = {},
  contribuintePorId: VinculoPorId = {},
): LinhaProdutividade[] {
  const porUsuario = new Map<string, Acumulador>();

  for (const log of logs) {
    let acc = porUsuario.get(log.performed_by);
    if (!acc) {
      acc = {
        userId: log.performed_by,
        concluidos: new Set(),
        projetos: new Set(),
        registros: 0,
        criacoes: 0,
        edicoes: 0,
        exclusoes: 0,
        itens: new Set(),
        dias: new Set(),
        tipos: new Map(),
        ultimoRegistro: log.performed_at,
      };
      porUsuario.set(log.performed_by, acc);
    }

    acc.registros += 1;
    if (log.action === 'created') acc.criacoes += 1;
    else if (log.action === 'updated') acc.edicoes += 1;
    else if (log.action === 'deleted') acc.exclusoes += 1;

    if (ehConclusao(log)) {
      if (ehProjeto(log)) acc.projetos.add(log.entity_id);
      else acc.concluidos.add(log.entity_id);
    }

    acc.itens.add(log.entity_id);
    acc.dias.add(diaDoRegistro(log.performed_at));
    acc.tipos.set(log.entity_type, (acc.tipos.get(log.entity_type) ?? 0) + 1);
    if (log.performed_at > acc.ultimoRegistro) acc.ultimoRegistro = log.performed_at;
  }

  return [...porUsuario.values()]
    .map((acc): LinhaProdutividade => {
      const diasAtivos = acc.dias.size;
      let tipoMaisFrequente: string | null = null;
      let maiorContagem = 0;
      for (const [tipo, contagem] of acc.tipos) {
        if (contagem > maiorContagem) {
          maiorContagem = contagem;
          tipoMaisFrequente = tipo;
        }
      }

      // Horas somadas por item concluído (não por log), então reabrir e concluir
      // de novo o mesmo item nunca soma as horas dele duas vezes.
      let planejadas = 0;
      let executadas = 0;
      let comPlanejadas = 0;
      let comExecutadas = 0;
      for (const id of acc.concluidos) {
        const horas = horasPorId[id];
        if (!horas) continue;
        if (horas.planejadas != null) { planejadas += horas.planejadas; comPlanejadas += 1; }
        if (horas.executadas != null) { executadas += horas.executadas; comExecutadas += 1; }
      }

      // Cliente e contribuinte contam sobre TODOS os itens tocados, não só os
      // concluídos: a pergunta é em quantos clientes a pessoa trabalhou.
      const clientes = new Set<string>();
      const contribuintes = new Set<string>();
      for (const id of acc.itens) {
        const cliente = clientePorId[id];
        if (cliente) clientes.add(cliente);
        const contribuinte = contribuintePorId[id];
        if (contribuinte) contribuintes.add(contribuinte);
      }

      return {
        userId: acc.userId,
        nome: nomePorId[acc.userId]?.trim() || 'Desconhecido',
        processosExecutados: acc.concluidos.size,
        projetosFinalizados: acc.projetos.size,
        clientesDistintos: clientes.size,
        contribuintesDistintos: contribuintes.size,
        horasPlanejadas: comPlanejadas > 0 ? planejadas : null,
        horasExecutadas: comExecutadas > 0 ? executadas : null,
        itensComHorasExecutadas: comExecutadas,
        tempoMedioProcesso: comExecutadas > 0 ? executadas / comExecutadas : null,
        registros: acc.registros,
        criacoes: acc.criacoes,
        edicoes: acc.edicoes,
        exclusoes: acc.exclusoes,
        itensDistintos: acc.itens.size,
        diasAtivos,
        mediaPorDiaAtivo: diasAtivos > 0 ? acc.registros / diasAtivos : 0,
        tipoMaisFrequente,
        ultimoRegistro: acc.ultimoRegistro,
      };
    })
    .sort((a, b) => b.registros - a.registros || a.nome.localeCompare(b.nome, 'pt-BR'));
}

/** Colunas ordenáveis da tabela — todas as da linha. */
export type ColunaProdutividade =
  | 'nome' | 'processosExecutados' | 'projetosFinalizados'
  | 'clientesDistintos' | 'contribuintesDistintos'
  | 'horasExecutadas' | 'tempoMedioProcesso'
  | 'registros' | 'criacoes' | 'edicoes' | 'exclusoes'
  | 'itensDistintos' | 'diasAtivos' | 'mediaPorDiaAtivo'
  | 'tipoMaisFrequente' | 'ultimoRegistro';

/**
 * As duas leituras da mesma base de logs, em abas separadas:
 * - `produtividade`: resultado entregue (o que foi concluído, para quantos
 *   clientes, em quanto tempo) — é onde o gestor olha KPI;
 * - `atividade`: uso do sistema (criou, editou, excluiu, quando).
 *
 * Separar existe porque as 14 colunas juntas não cabiam na tela e o número que
 * importa se perdia no meio das contagens de evento.
 */
export type VisaoProdutividade = 'produtividade' | 'atividade';

/** Ordem de todas as colunas — base do CSV completo e do type union. */
export const TODAS_AS_COLUNAS: ColunaProdutividade[] = [
  'nome', 'processosExecutados', 'projetosFinalizados',
  'clientesDistintos', 'contribuintesDistintos', 'horasExecutadas', 'tempoMedioProcesso',
  'registros', 'criacoes', 'edicoes', 'exclusoes',
  'itensDistintos', 'diasAtivos', 'mediaPorDiaAtivo', 'tipoMaisFrequente', 'ultimoRegistro',
];

/**
 * Colunas de cada aba, na ordem de exibição. `nome` aparece nas duas porque é a
 * chave da linha. Tabela e CSV leem daqui — a exportação sai igual ao que a
 * pessoa está vendo.
 */
export const COLUNAS_POR_VISAO: Record<VisaoProdutividade, ColunaProdutividade[]> = {
  produtividade: [
    'nome', 'processosExecutados', 'projetosFinalizados',
    'clientesDistintos', 'contribuintesDistintos', 'horasExecutadas', 'tempoMedioProcesso',
  ],
  atividade: [
    'nome', 'registros', 'criacoes', 'edicoes', 'exclusoes',
    'itensDistintos', 'diasAtivos', 'mediaPorDiaAtivo', 'tipoMaisFrequente', 'ultimoRegistro',
  ],
};

/** Coluna que já vem ordenada ao abrir cada aba — o ranking que ela responde. */
export const ORDENACAO_INICIAL: Record<VisaoProdutividade, ColunaProdutividade> = {
  produtividade: 'processosExecutados',
  atividade: 'registros',
};

export type DirecaoOrdenacao = 'asc' | 'desc';

const COLUNAS_TEXTO: ColunaProdutividade[] = ['nome', 'tipoMaisFrequente'];

/** Colunas cujo valor pode não existir; sem valor vai sempre para o fim. */
function semValor(linha: LinhaProdutividade, coluna: ColunaProdutividade): boolean {
  switch (coluna) {
    case 'tipoMaisFrequente': return linha.tipoMaisFrequente === null;
    case 'horasExecutadas': return linha.horasExecutadas === null;
    case 'tempoMedioProcesso': return linha.tempoMedioProcesso === null;
    default: return false;
  }
}

/**
 * Direção do primeiro clique numa coluna: texto começa A→Z, número e data
 * começam do maior/mais recente — que é o que interessa em ranking.
 */
export function direcaoInicial(coluna: ColunaProdutividade): DirecaoOrdenacao {
  return COLUNAS_TEXTO.includes(coluna) ? 'asc' : 'desc';
}

export function ordenarProdutividade(
  linhas: LinhaProdutividade[],
  coluna: ColunaProdutividade,
  direcao: DirecaoOrdenacao,
): LinhaProdutividade[] {
  const fator = direcao === 'asc' ? 1 : -1;
  const desempate = (a: LinhaProdutividade, b: LinhaProdutividade) =>
    a.nome.localeCompare(b.nome, 'pt-BR');

  return [...linhas].sort((a, b) => {
    // Linha sem valor na coluna (ex.: nenhuma hora apontada) fica sempre no fim,
    // independente da direção — "vazio" nunca ocupa o topo do ranking.
    const aVazio = semValor(a, coluna);
    const bVazio = semValor(b, coluna);
    if (aVazio || bVazio) {
      if (aVazio && bVazio) return desempate(a, b);
      return aVazio ? 1 : -1;
    }

    const cmp = compararColuna(a, b, coluna);
    return cmp !== 0 ? cmp * fator : desempate(a, b);
  });
}

function compararColuna(
  a: LinhaProdutividade,
  b: LinhaProdutividade,
  coluna: ColunaProdutividade,
): number {
  switch (coluna) {
    case 'nome':
      return a.nome.localeCompare(b.nome, 'pt-BR');
    // Ordena pelo `entity_type` bruto: para os tipos existentes (project,
    // subtask, task) a ordem alfabética coincide com a dos rótulos exibidos.
    case 'tipoMaisFrequente':
      return (a.tipoMaisFrequente ?? '').localeCompare(b.tipoMaisFrequente ?? '', 'pt-BR');
    // ISO 8601 ordena corretamente como string.
    case 'ultimoRegistro':
      return a.ultimoRegistro.localeCompare(b.ultimoRegistro);
    // Nulos já foram tratados em `semValor` antes de chegar aqui.
    case 'horasExecutadas':
      return (a.horasExecutadas ?? 0) - (b.horasExecutadas ?? 0);
    case 'tempoMedioProcesso':
      return (a.tempoMedioProcesso ?? 0) - (b.tempoMedioProcesso ?? 0);
    default:
      return a[coluna] - b[coluna];
  }
}

/** Bucket dos itens cujo produto contratado não foi identificado. */
export const PRODUTO_SEM_VINCULO = 'sem-produto';

function nomeDoProduto(produtoId: string, nomePorProduto: Record<string, string>): string {
  if (produtoId === PRODUTO_SEM_VINCULO) return 'Sem produto identificado';
  return nomePorProduto[produtoId]?.trim() || 'Produto fora do catálogo';
}

export interface LinhaProduto {
  /** `servicos_prestados.id` ou `PRODUTO_SEM_VINCULO`. */
  produtoId: string;
  nome: string;
  /** Tarefas/subtarefas concluídas no período desse produto. */
  concluidos: number;
  horasPlanejadas: number | null;
  horasExecutadas: number | null;
  /** Denominador do tempo médio — concluídos com horas apontadas. */
  itensComHorasExecutadas: number;
  /** horasExecutadas ÷ itensComHorasExecutadas. */
  tempoMedio: number | null;
}

/**
 * Tempo médio por tipo de produto contratado na OS, sobre as tarefas concluídas
 * no período — pela equipe toda, não por pessoa. O produto de cada item vem de
 * `resolverProdutoContratado`.
 *
 * O item sem produto identificado vai para um bucket próprio em vez de
 * desaparecer da tabela: um "Sem produto identificado" grande é projeto sem OS
 * ou sem serviço casado, e esconder isso faria a média dos outros produtos
 * parecer mais completa do que é.
 *
 * Ordena por tempo médio decrescente — a pergunta que a tabela responde — com
 * quem não tem apontamento no fim.
 */
export function agregarPorProduto(
  logs: AuditLog[],
  horasPorId: HorasPorId,
  produtoPorId: VinculoPorId,
  nomePorProduto: Record<string, string>,
): LinhaProduto[] {
  // Um item concluído entra uma vez só, mesmo com vários logs de conclusão.
  const concluidos = new Set<string>();
  for (const log of logs) {
    if (ehConclusao(log) && !ehProjeto(log)) concluidos.add(log.entity_id);
  }

  interface Acc {
    concluidos: number;
    planejadas: number;
    executadas: number;
    comPlanejadas: number;
    comExecutadas: number;
  }
  const porProduto = new Map<string, Acc>();

  for (const id of concluidos) {
    const produtoId = produtoPorId[id] ?? PRODUTO_SEM_VINCULO;
    let acc = porProduto.get(produtoId);
    if (!acc) {
      acc = { concluidos: 0, planejadas: 0, executadas: 0, comPlanejadas: 0, comExecutadas: 0 };
      porProduto.set(produtoId, acc);
    }
    acc.concluidos += 1;

    const horas = horasPorId[id];
    if (!horas) continue;
    if (horas.planejadas != null) { acc.planejadas += horas.planejadas; acc.comPlanejadas += 1; }
    if (horas.executadas != null) { acc.executadas += horas.executadas; acc.comExecutadas += 1; }
  }

  return [...porProduto.entries()]
    .map(([produtoId, acc]): LinhaProduto => ({
      produtoId,
      nome: nomeDoProduto(produtoId, nomePorProduto),
      concluidos: acc.concluidos,
      horasPlanejadas: acc.comPlanejadas > 0 ? acc.planejadas : null,
      horasExecutadas: acc.comExecutadas > 0 ? acc.executadas : null,
      itensComHorasExecutadas: acc.comExecutadas,
      tempoMedio: acc.comExecutadas > 0 ? acc.executadas / acc.comExecutadas : null,
    }))
    .sort((a, b) => {
      if (a.tempoMedio === null || b.tempoMedio === null) {
        if (a.tempoMedio === b.tempoMedio) return b.concluidos - a.concluidos;
        return a.tempoMedio === null ? 1 : -1;
      }
      return b.tempoMedio - a.tempoMedio || b.concluidos - a.concluidos;
    });
}

export interface LinhaProdutoPessoa extends LinhaProduto {
  /**
   * Itens em que a pessoa tocou nesse produto — inclui o que ainda não foi
   * concluído. É o que responde "em que produtos ela está mexendo", enquanto
   * `concluidos` responde "o que ela já entregou".
   */
  itensTocados: number;
}

/**
 * Produtos em que cada pessoa mexeu no período, para expandir a linha dela.
 *
 * Diferente de `agregarPorProduto`: aqui a base são os itens TOCADOS, não só os
 * concluídos — senão quem está no meio de uma entrega apareceria sem produto
 * nenhum. As horas continuam saindo apenas dos itens concluídos, para bater com
 * as colunas de horas da linha da pessoa.
 *
 * Ordena por itens tocados desc, com desempate por nome.
 */
export function agregarProdutoPorPessoa(
  logs: AuditLog[],
  horasPorId: HorasPorId,
  produtoPorId: VinculoPorId,
  nomePorProduto: Record<string, string>,
): Record<string, LinhaProdutoPessoa[]> {
  interface Acc { tocados: Set<string>; concluidos: Set<string> }
  const porPessoa = new Map<string, Map<string, Acc>>();

  for (const log of logs) {
    let produtos = porPessoa.get(log.performed_by);
    if (!produtos) {
      produtos = new Map();
      porPessoa.set(log.performed_by, produtos);
    }

    const produtoId = produtoPorId[log.entity_id] ?? PRODUTO_SEM_VINCULO;
    let acc = produtos.get(produtoId);
    if (!acc) {
      acc = { tocados: new Set(), concluidos: new Set() };
      produtos.set(produtoId, acc);
    }

    acc.tocados.add(log.entity_id);
    if (ehConclusao(log) && !ehProjeto(log)) acc.concluidos.add(log.entity_id);
  }

  const resultado: Record<string, LinhaProdutoPessoa[]> = {};

  for (const [userId, produtos] of porPessoa) {
    resultado[userId] = [...produtos.entries()]
      .map(([produtoId, acc]): LinhaProdutoPessoa => {
        let planejadas = 0;
        let executadas = 0;
        let comPlanejadas = 0;
        let comExecutadas = 0;
        for (const id of acc.concluidos) {
          const horas = horasPorId[id];
          if (!horas) continue;
          if (horas.planejadas != null) { planejadas += horas.planejadas; comPlanejadas += 1; }
          if (horas.executadas != null) { executadas += horas.executadas; comExecutadas += 1; }
        }

        return {
          produtoId,
          nome: nomeDoProduto(produtoId, nomePorProduto),
          itensTocados: acc.tocados.size,
          concluidos: acc.concluidos.size,
          horasPlanejadas: comPlanejadas > 0 ? planejadas : null,
          horasExecutadas: comExecutadas > 0 ? executadas : null,
          itensComHorasExecutadas: comExecutadas,
          tempoMedio: comExecutadas > 0 ? executadas / comExecutadas : null,
        };
      })
      .sort((a, b) => b.itensTocados - a.itensTocados || a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  return resultado;
}

/** `12h`, `9,5h`, `—` quando não há valor. Uma casa decimal, vírgula. */
export function formatarHoras(valor: number | null): string {
  if (valor === null) return '—';
  const texto = Number.isInteger(valor) ? String(valor) : valor.toFixed(1).replace('.', ',');
  return `${texto}h`;
}

export function resumirProdutividade(
  logs: AuditLog[],
  clientePorId: ClientePorId = {},
  contribuintePorId: VinculoPorId = {},
): ResumoProdutividade {
  const usuarios = new Set<string>();
  const itens = new Set<string>();
  const dias = new Set<string>();
  const concluidos = new Set<string>();
  const projetos = new Set<string>();
  const clientes = new Set<string>();
  const contribuintes = new Set<string>();

  for (const log of logs) {
    usuarios.add(log.performed_by);
    itens.add(log.entity_id);
    dias.add(diaDoRegistro(log.performed_at));
    if (ehConclusao(log)) {
      if (ehProjeto(log)) projetos.add(log.entity_id);
      else concluidos.add(log.entity_id);
    }
    const cliente = clientePorId[log.entity_id];
    if (cliente) clientes.add(cliente);
    const contribuinte = contribuintePorId[log.entity_id];
    if (contribuinte) contribuintes.add(contribuinte);
  }

  return {
    colaboradoresAtivos: usuarios.size,
    processosExecutados: concluidos.size,
    projetosFinalizados: projetos.size,
    clientesDistintos: clientes.size,
    contribuintesDistintos: contribuintes.size,
    registros: logs.length,
    itensDistintos: itens.size,
    diasComAtividade: dias.size,
  };
}

function escapeCsv(valor: string): string {
  if (valor == null) return '';
  const precisa = /[;\n"]/.test(valor);
  return precisa ? `"${valor.replace(/"/g, '""')}"` : valor;
}

/** Número para célula de CSV pt-BR: vírgula decimal e vazio quando não há valor. */
function numeroCsv(valor: number | null): string {
  if (valor === null) return '';
  return Number.isInteger(valor) ? String(valor) : valor.toFixed(1).replace('.', ',');
}

interface CampoCsv {
  header: string;
  valor: (linha: LinhaProdutividade) => string | number;
}

/**
 * Colunas da tela → campos do CSV. Uma coluna pode virar mais de um campo: a
 * célula "Horas plan./exec." mostra dois números e o divisor da média, e no
 * arquivo cada um vira coluna própria para dar pra somar em planilha.
 */
const CAMPOS_CSV: Record<ColunaProdutividade, CampoCsv[]> = {
  nome: [{ header: 'colaborador', valor: l => escapeCsv(l.nome) }],
  processosExecutados: [{ header: 'processos_executados', valor: l => l.processosExecutados }],
  projetosFinalizados: [{ header: 'projetos_finalizados', valor: l => l.projetosFinalizados }],
  clientesDistintos: [{ header: 'clientes_distintos', valor: l => l.clientesDistintos }],
  contribuintesDistintos: [{ header: 'contribuintes_distintos', valor: l => l.contribuintesDistintos }],
  horasExecutadas: [
    { header: 'horas_planejadas', valor: l => numeroCsv(l.horasPlanejadas) },
    { header: 'horas_executadas', valor: l => numeroCsv(l.horasExecutadas) },
    { header: 'itens_com_horas_apontadas', valor: l => l.itensComHorasExecutadas },
  ],
  tempoMedioProcesso: [{ header: 'tempo_medio_processo_h', valor: l => numeroCsv(l.tempoMedioProcesso) }],
  registros: [{ header: 'registros', valor: l => l.registros }],
  criacoes: [{ header: 'criacoes', valor: l => l.criacoes }],
  edicoes: [{ header: 'edicoes', valor: l => l.edicoes }],
  exclusoes: [{ header: 'exclusoes', valor: l => l.exclusoes }],
  itensDistintos: [{ header: 'itens_distintos', valor: l => l.itensDistintos }],
  diasAtivos: [{ header: 'dias_ativos', valor: l => l.diasAtivos }],
  mediaPorDiaAtivo: [
    { header: 'media_por_dia_ativo', valor: l => l.mediaPorDiaAtivo.toFixed(1).replace('.', ',') },
  ],
  tipoMaisFrequente: [{ header: 'tipo_mais_frequente', valor: l => escapeCsv(l.tipoMaisFrequente ?? '') }],
  ultimoRegistro: [{ header: 'ultimo_registro', valor: l => l.ultimoRegistro }],
};

/**
 * CSV das colunas pedidas, na ordem pedida. Sem argumento exporta tudo — é o
 * dump completo; passando `COLUNAS_POR_VISAO[visao]` o arquivo sai igual à aba
 * que a pessoa está vendo.
 */
const CABECALHO_CSV_PRODUTO = [
  'produto', 'concluidos', 'horas_planejadas', 'horas_executadas',
  'itens_com_horas_apontadas', 'tempo_medio_h',
];

/** CSV da aba Produtos, na mesma ordem em que a tabela mostra as linhas. */
export function buildProdutosCsv(linhas: LinhaProduto[]): string {
  const sep = ';';
  const saida = [CABECALHO_CSV_PRODUTO.join(sep)];

  for (const linha of linhas) {
    saida.push([
      escapeCsv(linha.nome),
      linha.concluidos,
      numeroCsv(linha.horasPlanejadas),
      numeroCsv(linha.horasExecutadas),
      linha.itensComHorasExecutadas,
      numeroCsv(linha.tempoMedio),
    ].join(sep));
  }

  return saida.join('\n');
}

export function buildProdutividadeCsv(
  linhas: LinhaProdutividade[],
  colunas: ColunaProdutividade[] = TODAS_AS_COLUNAS,
): string {
  const sep = ';';
  const campos = colunas.flatMap(coluna => CAMPOS_CSV[coluna]);
  const saida = [campos.map(campo => campo.header).join(sep)];

  for (const linha of linhas) {
    saida.push(campos.map(campo => campo.valor(linha)).join(sep));
  }

  return saida.join('\n');
}
