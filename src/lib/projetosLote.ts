import type { AreaKey } from '@/config/areaCategories';
import type { OrgProjectFormData } from '@/hooks/useOrgProjects';
import { OS_SITUACAO_TO_PROJECT_STATUS } from '@/lib/projetosCadastro';

// Criação de projetos em lote a partir de uma OS: 1 projeto por produto contratado.

/** Rotas do fluxo de lote de uma área. */
export interface LoteRoutes {
  /** Tela de criação em lote (o destino do seletor de OS). */
  lote: string;
  /** Onde "Cancelar" e o pós-criação caem. */
  projetos: string;
  /** Painel de Projetos e tarefas, dono do botão que abre o fluxo. */
  tarefas: string;
}

const LOTE_ROUTES_BY_AREA: Record<'tax' | 'osg', LoteRoutes> = {
  tax: {
    lote: '/equipe/tax/projetos/cadastro-lote',
    projetos: '/equipe/tax/projetos/cadastro',
    tarefas: '/equipe/tax/projetos/tarefas',
  },
  osg: {
    lote: '/equipe/osg/projetos/cadastro-lote',
    projetos: '/equipe/osg/projetos/cadastro',
    tarefas: '/equipe/osg/projetos/tarefas',
  },
};

/**
 * Rotas do lote da área. O fluxo existe em Tax e OSG (mesmo conteúdo, layouts
 * diferentes); as outras áreas não montam o painel de tarefas, então caem no Tax
 * em vez de navegar para uma rota inexistente.
 */
export function resolveLoteRoutes(area: AreaKey): LoteRoutes {
  return area === 'osg' ? LOTE_ROUTES_BY_AREA.osg : LOTE_ROUTES_BY_AREA.tax;
}

export interface LoteProduto {
  produtoSegmentoId: string;
  /** "CÓDIGO — Nome": identifica o produto na UI e no casamento com projetos. */
  produtoLabel: string;
  /** Só o nome do produto — é o nome padrão do projeto. */
  produtoNome: string;
}

/** Snapshot enviado pelo seletor de OS (via location.state) para a tela de lote. */
export interface LoteFromOs {
  clientId: string;
  clientName: string;
  ordemServicoId: string;
  osNumero: string;
  startDate: string;
  endDate: string;
  /** status do projeto já convertido da situação da OS (OS_SITUACAO_TO_PROJECT_STATUS) */
  status: string;
  description: string;
  produtos: LoteProduto[];
}

export interface LoteFromOsLocationState {
  loteFromOs: LoteFromOs;
}

/** Campos comuns a todos os projetos do lote (editáveis no topo). */
export interface LoteCommon {
  startDate: string;
  endDate: string;
  status: string;
  description: string;
}

/** Estado de uma linha (= um produto) da tela de lote. */
export interface LoteRow {
  produtoSegmentoId: string;
  produtoLabel: string;
  include: boolean;
  name: string;
  equipeId: string;
  estruturaAreaId: string;
  leaderIds: string[];
  responsibleId: string;
  memberIds: string[];
  /** Permite escolher membros de qualquer área, não só da equipe selecionada. */
  isMultidisciplinar: boolean;
  /**
   * Projeto sem executor fixo (ex.: Canal de Chamados): cada chamado vira uma
   * tarefa delegada a qualquer membro, então não há Responsável Executor.
   */
  semExecutorFixo: boolean;
}

/**
 * OS candidata a virar projetos, no formato que o seletor recebe da RPC
 * `get_ordens_by_client_name` (ver useClienteOrdens).
 */
export interface LoteOsCandidata {
  id: string;
  numero_os: string | null;
  situacao: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  observacoes?: string | null;
}

/** Produto contratado da OS, no formato de useOsProdutosContratados. */
export interface LoteOsProdutoContratado {
  produto_segmento_id: string;
  produto_codigo: string | null;
  produto_nome: string | null;
}

/**
 * Rótulo do produto no formato "CÓDIGO — Nome", igual ao que a aba de OS gerava.
 * `findProdutosJaCriados` casa projeto e produto por este texto, então mudar o
 * formato faz produtos já criados voltarem a parecer disponíveis.
 */
export function buildProdutoLabel(produto: LoteOsProdutoContratado): string {
  const { produto_codigo: codigo, produto_nome: nome } = produto;
  if (codigo && nome) return `${codigo} — ${nome}`;
  return codigo || nome || produto.produto_segmento_id;
}

/**
 * Nome do produto sem a sigla — é ele que vira o nome padrão do projeto.
 * Cai no código e depois no id só para nunca gerar projeto sem nome.
 */
export function buildProdutoNome(produto: LoteOsProdutoContratado): string {
  return produto.produto_nome || produto.produto_codigo || produto.produto_segmento_id;
}

/**
 * Monta o snapshot que a tela de lote consome, a partir do cliente escolhido,
 * da OS e dos seus produtos contratados. Substitui o `buildLoteState` que vivia
 * no NewClientModal, onde os dados vinham do rascunho do formulário.
 */
export function buildLoteFromOs(
  cliente: { id: string; nome: string },
  os: LoteOsCandidata,
  produtos: LoteOsProdutoContratado[],
): LoteFromOs {
  return {
    clientId: cliente.id,
    clientName: cliente.nome?.trim() || '',
    ordemServicoId: os.id,
    osNumero: os.numero_os || '',
    startDate: os.data_inicio || '',
    endDate: os.data_fim || '',
    status: OS_SITUACAO_TO_PROJECT_STATUS[os.situacao || ''] || 'active',
    description: os.observacoes || '',
    produtos: produtos.map(produto => ({
      produtoSegmentoId: produto.produto_segmento_id,
      produtoLabel: buildProdutoLabel(produto),
      produtoNome: buildProdutoNome(produto),
    })),
  };
}

/**
 * Situações de OS que ainda podem virar projeto. Concluída e cancelada ficam de
 * fora; suspensa continua sendo contrato vigente, só pausado.
 */
export const OS_SITUACOES_ABERTAS = ['em_andamento', 'suspenso'];

/** OS aberta com produtos, já restrita ao ambiente atual (ver useOsAbertasComProdutos). */
export interface LoteOsAberta extends LoteOsCandidata {
  cliente_id: string;
  produtos: LoteOsProdutoContratado[];
}

/** Uma OS oferecida no seletor, já com o que decide se ela tem o que criar. */
export interface LoteOsOption {
  os: LoteOsCandidata;
  /** Snapshot pronto para a tela de lote. */
  state: LoteFromOs;
  total: number;
  /** Produtos que ainda não viraram projeto. Zero = nada a criar nesta OS. */
  disponiveis: number;
}

/**
 * OS abertas de cada cliente, com quantos produtos ainda não viraram projeto.
 *
 * O casamento cliente↔OS é por id. Já foi por NOME, espelhando a RPC
 * `get_ordens_by_client_name` (que expande o id para todos os clientes de mesmo
 * nome, em qualquer ambiente), mas isso furava o isolamento de ambiente: o
 * seletor listava o cliente do ambiente atual por causa de uma OS do outro, e na
 * prática quase todo cliente aparecia. Cada OS agora só conta para o cliente que
 * ela referencia — e `useOsAbertasComProdutos` já entrega apenas OS de clientes
 * do ambiente atual.
 */
export function buildLoteOsOptionsByClient(
  clientes: Array<{ id: string; nome: string }>,
  osRows: LoteOsAberta[],
  projetos: Array<{ name: string; ordem_servico_id: string | null; produto_segmento_id?: string | null }>,
): Map<string, LoteOsOption[]> {
  const osByClientId = new Map<string, LoteOsAberta[]>();
  for (const os of osRows) {
    const rows = osByClientId.get(os.cliente_id) || [];
    rows.push(os);
    osByClientId.set(os.cliente_id, rows);
  }

  const projetosByOs = new Map<string, Array<{ name: string; produto_segmento_id?: string | null }>>();
  for (const projeto of projetos) {
    if (!projeto.ordem_servico_id) continue;
    const rows = projetosByOs.get(projeto.ordem_servico_id) || [];
    rows.push(projeto);
    projetosByOs.set(projeto.ordem_servico_id, rows);
  }

  const result = new Map<string, LoteOsOption[]>();
  for (const cliente of clientes) {
    const rows = osByClientId.get(cliente.id);
    if (!rows?.length) continue;
    const options = rows.map(os => {
      const state = buildLoteFromOs(cliente, os, os.produtos);
      const jaCriados = findProdutosJaCriados(
        projetosByOs.get(os.id) || [],
        state.clientName,
        state.osNumero,
        state.produtos,
      );
      return {
        os,
        state,
        total: state.produtos.length,
        disponiveis: state.produtos.length - jaCriados.length,
      };
    });
    options.sort((a, b) => (a.os.numero_os || '').localeCompare(b.os.numero_os || '', 'pt-BR', { numeric: true }));
    result.set(cliente.id, options);
  }
  return result;
}

/**
 * Nome que o lote gerava até 2026-07: "Cliente — OS nº — CÓDIGO — Nome".
 *
 * Não é mais o padrão (ver buildInitialRows). Sobrevive só para
 * `findProdutosJaCriados` continuar reconhecendo os projetos criados nesse
 * formato — que são todos os anteriores à mudança.
 */
export function buildLegacyLoteProjectName(clientName: string, osNumero: string, produtoLabel: string): string {
  const base = clientName?.trim() ? `${clientName.trim()} — OS ${osNumero}` : `OS ${osNumero}`;
  return produtoLabel ? `${base} — ${produtoLabel}` : base;
}

/** Normaliza para comparar nomes: espaço a mais ou caixa diferente não é outro projeto. */
function normalizeProjectName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Produtos da OS que já têm projeto criado — evita criar o mesmo projeto duas vezes.
 *
 * O caminho certo é `produto_segmento_id`: desde a migration 20260814140000 o
 * projeto guarda qual produto ele é, e aí a detecção é exata — renomear o
 * projeto não muda nada.
 *
 * O casamento por NOME sobrevive só para o projeto antigo que ficou sem produto
 * gravado (o backfill não preenche quando é ambíguo). São três formas:
 *
 * 1. o nome padrão atual — só o nome do produto;
 * 2. o padrão antigo "Cliente — OS nº — CÓDIGO — Nome", para reconhecer os
 *    projetos criados antes da mudança;
 * 3. qualquer nome que ainda contenha o rótulo "CÓDIGO — Nome", para o projeto
 *    que alguém renomeou mantendo a sigla.
 *
 * Renomear apagando essas marcas escapa da detecção — limite conhecido, e agora
 * restrito ao legado. A comparação é sempre dentro de UMA OS, então nomes curtos
 * iguais entre clientes diferentes não se confundem.
 *
 * @param projetosDaOs projetos já existentes DESTA OS (filtrar antes de chamar).
 */
export function findProdutosJaCriados(
  projetosDaOs: Array<{ name: string; produto_segmento_id?: string | null }>,
  clientName: string,
  osNumero: string,
  produtos: LoteProduto[],
): string[] {
  const produtosGravados = new Set(projetosDaOs
    .map(projeto => projeto.produto_segmento_id)
    .filter((id): id is string => Boolean(id)));
  // Só os projetos SEM produto gravado entram na comparação por nome: com a
  // coluna preenchida, o nome não decide nada.
  const nomesExistentes = projetosDaOs
    .filter(projeto => !projeto.produto_segmento_id)
    .map(projeto => normalizeProjectName(projeto.name));
  return produtos
    .filter(produto => {
      if (produtosGravados.has(produto.produtoSegmentoId)) return true;
      const esperado = normalizeProjectName(produto.produtoNome);
      const legado = normalizeProjectName(
        buildLegacyLoteProjectName(clientName, osNumero, produto.produtoLabel),
      );
      const rotulo = normalizeProjectName(produto.produtoLabel);
      return nomesExistentes.some(nome => (esperado !== '' && nome === esperado)
        || nome === legado
        || (rotulo !== '' && nome.includes(rotulo)));
    })
    .map(produto => produto.produtoSegmentoId);
}

/**
 * Constrói o estado inicial das linhas a partir do snapshot da OS.
 *
 * O nome padrão é só o nome do produto. Cliente, número da OS e sigla saíram da
 * concatenação porque a árvore de Projetos e tarefas já mostra os três acima do
 * projeto — tanto que ela tinha de desfazer o nome na exibição
 * (`shortProjectName`). O campo continua editável linha por linha.
 */
export function buildInitialRows(state: LoteFromOs): LoteRow[] {
  return state.produtos.map(produto => ({
    produtoSegmentoId: produto.produtoSegmentoId,
    produtoLabel: produto.produtoLabel,
    include: true,
    name: produto.produtoNome,
    equipeId: '',
    estruturaAreaId: '',
    leaderIds: [],
    responsibleId: '',
    memberIds: [],
    isMultidisciplinar: false,
    semExecutorFixo: false,
  }));
}

/** Converte uma linha + campos comuns no payload de criação de projeto. */
export function buildLoteFormData(
  clientId: string,
  ordemServicoId: string,
  common: LoteCommon,
  row: LoteRow,
): OrgProjectFormData {
  return {
    name: row.name.trim(),
    description: common.description,
    status: common.status,
    start_date: common.startDate,
    end_date: common.endDate,
    leader_ids: row.leaderIds,
    responsible_id: row.semExecutorFixo ? '' : row.responsibleId,
    external_client_id: clientId,
    estrutura_area_id: row.estruturaAreaId,
    equipe_id: row.equipeId,
    is_multidisciplinar: row.isMultidisciplinar,
    member_ids: row.memberIds,
    ordem_servico_id: ordemServicoId,
    servico_id: '',
    // A linha É o produto — é este campo que faz o projeto saber qual produto
    // ele atende, em vez de deixar isso implícito no nome.
    produto_segmento_id: row.produtoSegmentoId,
  };
}

/**
 * Valida uma linha incluída no lote (produto e cliente são fixos, não validados aqui).
 * Retorna a mensagem de erro ou null. Prefixa com o produto para localizar a linha.
 */
export function validateLoteRow(row: LoteRow, common: LoteCommon): string | null {
  const prefix = `${row.produtoLabel || 'Produto'}: `;
  if (!row.name.trim()) return `${prefix}Nome é obrigatório`;
  if (!row.equipeId) return `${prefix}Selecione a Equipe`;
  if (!common.status) return 'Selecione o Status';
  if (row.leaderIds.length === 0) return `${prefix}Selecione ao menos um Líder Geral`;
  // Sem executor fixo: o projeto não tem Responsável Executor (chamados são
  // delegados por tarefa), então o campo deixa de ser exigido.
  if (!row.semExecutorFixo && !row.responsibleId) return `${prefix}Selecione o Responsável Executor`;
  if (row.memberIds.length === 0) return `${prefix}Selecione ao menos um Membro do Projeto`;
  // Datas/status/descrição vêm da OS (não editáveis nesta tela); descrição é opcional.
  if (!common.startDate) return 'A OS não possui Data de Início';
  if (!common.endDate) return 'A OS não possui Data de Término';
  if (common.startDate > common.endDate) return 'Data de Término deve ser posterior à Data de Início';
  return null;
}
