/**
 * Resumo do trabalho da área Digital para a visão executiva do Board
 * (`/equipe/board/dashboard`, bloco "Áreas em um olhar").
 *
 * POR QUE ESTE ARQUIVO EXISTE
 * ---------------------------
 * O resumo atual do Board sai de `org_projects` + `org_tasks` (ver
 * `resumoPorArea` em `@/lib/boardExecutivo`). A Digital não cadastra ali: ela
 * cadastra em `sprint_deliverables` (entregáveis de sprint) e na tabela ANTIGA
 * `projects` — que NÃO é `org_projects`. Sem esta fonte a linha da Digital
 * simplesmente não existe no painel.
 *
 * Tudo aqui é função PURA: recebe o snapshot já buscado por
 * `@/hooks/useDomainTrabalhoDigital` e devolve os números. Nenhuma chamada
 * Supabase, nenhum `new Date()` — a janela e o dia de referência vêm por
 * parâmetro para o resultado ser determinístico (testável).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. REGRA DE ATRIBUIÇÃO DE ÁREA (e onde ela furа)
 * ─────────────────────────────────────────────────────────────────────────────
 * `sprint_deliverables` NÃO é exclusivo da Digital. Evidências:
 *   - `sprint_deliverables.process_id` → `processes.id`, e `processes` é do
 *     módulo MAPA, agrupado por área via `estrutura_equipes`
 *     (`src/hooks/useProcessMapping.ts:215-222`) — ou seja, processos de VÁRIAS
 *     áreas geram entregável.
 *   - `/equipe/digital/mapa` é descrita como "Lista de projetos do OSG
 *     (6 pilares)" (`src/config/protectedPages.ts:351-353`).
 *   - `/equipe/kanban`, `/equipe/sprints` e `/equipe/backlog` são `category:
 *     'geral'` com `requires_team_member` (`src/config/protectedPages.ts:39-108`)
 *     — não há recorte por área na rota.
 *   - o backlog filtra por CLUSTER (`sprint_backlog_items.cluster_id`,
 *     `src/hooks/useDomainBacklog.ts:15`), o que só faz sentido com mais de um
 *     cluster em jogo.
 * Conclusão: assumir "todo entregável é Digital" INFLARIA a Digital com
 * trabalho de Tax/OSG. A atribuição por equipe→área é obrigatória.
 *
 * Caminho adotado, na ordem:
 *   a) `entregavel.project_id` → `projects`;
 *   b) se `project_id` for NULL: `entregavel.sprint_id` → `sprints.project_id`
 *      → `projects`;
 *   c) do projeto: `equipe_id` → `estrutura_equipes.area_id` →
 *      `estrutura_areas.name`;
 *   d) fallback no texto livre `projects.area`;
 *   e) `classificarArea()` de `@/lib/boardExecutivo` transforma o nome no
 *      bucket (`tax`/`osg`/`dev`/`outros`).
 * (c)+(d) é o MESMO precedente já usado na tela de projetos
 * (`src/components/equipe/projetos/ProjectDetailsDialog.tsx:133-136`) e no MAPA
 * (`src/hooks/useProcessMapping.ts:218-221`). Não inventamos regra nova.
 *
 * ONDE ESSA REGRA FURA (medido em `diagnosticoDigital`, nunca escondido):
 *   - entregável sem `project_id` E sem `sprint_id`, ou cuja sprint tem
 *     `project_id` NULL → não há projeto → não há equipe → não há área. A
 *     migration `supabase/migrations/20260123162110_22af5ff9-...sql:2,8` fez
 *     `UPDATE sprint_deliverables SET project_id = NULL` e
 *     `UPDATE sprints SET project_id = NULL`, então esse buraco é HISTÓRICO e
 *     provavelmente grande. Esses entregáveis caem no bucket `outros` — NUNCA
 *     desaparecem — e entram em `diagnostico.semVinculoDeProjeto`.
 *   - projeto com `equipe_id` NULL: cai no texto `projects.area`, que é livre e
 *     não normalizado (`'Fiscal'`, `'Fixos/Previdenciário'`... ver
 *     `src/components/equipe/projetos/projectPresentation.tsx:50-58`). O que
 *     `classificarArea` não reconhece vira `outros`.
 *   - projeto sem equipe E sem texto → `outros`.
 *   - `equipe_id` aponta para equipe que a query não trouxe (RLS, inativa) →
 *     indistinguível de "sem equipe": cai no texto/`outros`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 2. VOCABULÁRIO DE STATUS (não inventado — tirado do banco e das telas)
 * ─────────────────────────────────────────────────────────────────────────────
 * `sprint_deliverables.status`: CHECK no banco em
 *   `supabase/migrations/20251209123459_31732be3-...sql:9`
 *   → `('pending','in_progress','completed')`, DEFAULT `'pending'`, NULLABLE.
 *   Confirmado no código: `src/hooks/useSprintDeliverables.ts:15`
 *   (`type DeliverableStatus`), `src/lib/equipeKanban.ts:269` (`BOARD_STATUSES`)
 *   e nos selects `src/components/equipe/sprint-detalhes/DeliverableDialogs.tsx:145-147`.
 *   CONCLUÍDO = `'completed'`. `null` é normalizado para `'pending'`, igual a
 *   `normalizeEquipeKanbanStatus` (`src/lib/equipeKanban.ts:271-273`).
 *
 * `projects.status`: sem CHECK no banco, apenas `DEFAULT 'active'`
 *   (`supabase/migrations/20251202173751_f7eec2a4-...sql:6`). O vocabulário real
 *   é o das telas: `'active' | 'completed' | 'blocked' | 'archived'`
 *   (`src/components/equipe/projetos/ProjectFilters.tsx:58-61`,
 *   `src/components/equipe/projetos/ProjectInfoTab.tsx:310-313`,
 *   `src/components/equipe/projetos/projectPresentation.tsx:16-28`).
 *   ATIVO = `'active'` (único). É o análogo de `['active','planned']` que o
 *   painel Tax/OSG usa em `org_projects` (`src/hooks/usePerformanceData.ts:120`)
 *   — `projects` não tem `'planned'`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 3. SUBTAREFAS (`parent_id`): CONTAMOS SÓ AS FOLHAS
 * ─────────────────────────────────────────────────────────────────────────────
 * Decisão: um entregável que é MÃE (existe outro entregável no escopo com
 * `parent_id` = o id dele) NÃO conta como entrega própria. Só folhas contam.
 * Motivo: a mãe é um agrupador — concluir as 3 filhas e depois a mãe geraria 4
 * entregas para 3 trabalhos, e a mãe herda o mesmo prazo, então a pontualidade
 * seria contada duas vezes. É o MESMO critério que o repo já aplica às horas:
 * "Tarefas-pai (têm subtarefas) não entram na soma de horas, pra não duplicar"
 * (`src/lib/analiseInteligente.ts:221-225`, via `kpiParentIds`) e
 * `src/lib/equipeKanban.ts:258-260`.
 * Divergência consciente: o KPI `completed` de `analiseInteligente.ts:214` conta
 * TODAS as linhas (mãe incluída) e portanto duplica. Aqui não replicamos esse
 * bug — este resumo vai para o sócio.
 * Mãe SEM nenhuma filha no escopo é folha (é uma tarefa comum) e conta.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 4. PONTUALIDADE: dado melhor que Tax/OSG, semântica DIFERENTE
 * ─────────────────────────────────────────────────────────────────────────────
 * A Digital tem `completed_at`, então dá para medir a entrega em si:
 * `dia(completed_at) <= due_date` = no prazo. Tax/OSG não tem isso — lá
 * `pontualidade` é "% de PROJETOS em dia" (`saudeProjetos` em boardExecutivo).
 * ATENÇÃO ao costurar na tela: no `ResumoArea` da Digital o campo
 * `pontualidade` é "% dos entregáveis concluídos na janela que saíram no
 * prazo". Mesmo nome, régua diferente — a UI precisa dizer isso na nota
 * metodológica, senão compara laranja com maçã.
 * Entregável `completed` com `completed_at` NULL não é no prazo nem atrasado:
 * é INDETERMINADO. Fica fora do numerador E do denominador e é contado em
 * `diagnostico.concluidosSemCompletedAt` — o `buildDeliverableStatusPayload`
 * (`src/lib/equipeKanban.ts:329-331`) sempre grava `completed_at`, mas dados
 * antigos e importações (`src/lib/excelImporter.ts`) podem não ter.
 * Entregável em aberto com `due_date` no passado é ATRASO: ele não entra na
 * pontualidade (é estoque, não fluxo da janela), mas empurra o projeto dele
 * para `em_risco`/`atrasado` — e aparece em `diagnostico.abertosVencidos`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 5. RISCO DE DUPLICIDADE AO CONCATENAR
 * ─────────────────────────────────────────────────────────────────────────────
 * `resumoDigital` devolve TODOS os buckets que encontrou (inclusive `tax`/`osg`,
 * dos entregáveis de MAPA). Concatenar tudo com `resumoPorArea` DUPLICA Tax e
 * OSG, porque são fontes diferentes contando coisas diferentes. Para só
 * ACRESCENTAR a Digital ao painel, filtre `linha.area === 'dev'`.
 */
import {
  BOARD_AREAS,
  BOARD_AREA_LABEL,
  classificarArea,
  saudeProjetos,
  type BoardAreaKey,
  type ProjetoSaude,
  type ResumoArea,
} from '@/lib/boardExecutivo';

// ── Vocabulário de status (ver bloco 2 do cabeçalho) ─────────────────────
/** Valores aceitos pelo CHECK de `sprint_deliverables.status`. */
export const STATUS_ENTREGAVEL = ['pending', 'in_progress', 'completed'] as const;
/** O único status de `sprint_deliverables` que significa CONCLUÍDO. */
export const STATUS_ENTREGAVEL_CONCLUIDO = 'completed';
/** Vocabulário real de `projects.status` (o banco não tem CHECK). */
export const STATUS_PROJETO = ['active', 'completed', 'blocked', 'archived'] as const;
/** O único status de `projects` que significa ATIVO. */
export const STATUS_PROJETO_ATIVO = 'active';

// ── Entrada ──────────────────────────────────────────────────────────────
/** Linha de `projects` (a tabela ANTIGA, não `org_projects`). */
export interface ProjetoDigital {
  id: string;
  status: string | null;
  equipe_id: string | null;
  /** Texto livre legado — fallback de área quando não há equipe. */
  area: string | null;
  /** `DATE` (`YYYY-MM-DD`) ou null. */
  end_date: string | null;
}

/** Linha de `sprints` — só serve de ponte entregável → projeto. */
export interface SprintDigital {
  id: string;
  project_id: string | null;
}

/** Linha de `sprint_deliverables`. */
export interface EntregavelDigital {
  id: string;
  status: string | null;
  /** `DATE` NOT NULL no banco (`YYYY-MM-DD`). */
  due_date: string;
  /** `TIMESTAMPTZ` nullable. */
  completed_at: string | null;
  project_id: string | null;
  sprint_id: string | null;
  parent_id: string | null;
}

/** `estrutura_equipes` já achatada com o nome da área (padrão `useEstruturaEquipes`). */
export interface EquipeAreaDigital {
  id: string;
  area_name: string | null;
}

/**
 * Janela de análise. Recebida por parâmetro: esta biblioteca NUNCA chama
 * `new Date()`. `ateISO` também é o "hoje" das contas de atraso.
 */
export interface JanelaDigital {
  desdeISO: string;
  ateISO: string;
}

export interface EntradaDigital {
  entregaveis: EntregavelDigital[];
  projetos: ProjetoDigital[];
  sprints: SprintDigital[];
  equipes: EquipeAreaDigital[];
  janela: JanelaDigital;
}

// ── Datas: dia-calendário de Brasília, sem depender do fuso da máquina ───
const OFFSET_BRASILIA_MS = -3 * 60 * 60 * 1000;
const DIA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Dia-calendário (`YYYY-MM-DD`) de um instante, em Brasília (UTC-3).
 *
 * Ler os componentes UTC direto marcaria uma conclusão das 21h de Brasília como
 * sendo do dia seguinte (e viraria "atraso" de graça); ler os componentes
 * locais dependeria do fuso de quem roda o teste. Somamos o offset e lemos em
 * UTC: mesmo resultado em qualquer máquina.
 */
export function diaBrasilia(instanteISO: string | null | undefined): string | null {
  if (!instanteISO) return null;
  const t = Date.parse(instanteISO);
  if (Number.isNaN(t)) return null;
  return new Date(t + OFFSET_BRASILIA_MS).toISOString().slice(0, 10);
}

/** Valida/normaliza uma coluna `DATE` (`due_date`, `end_date`). */
export function diaDeData(data: string | null | undefined): string | null {
  if (!data) return null;
  const dia = data.slice(0, 10);
  return DIA_ISO.test(dia) ? dia : null;
}

function msDoDia(dia: string): number {
  const [ano, mes, d] = dia.split('-').map(Number);
  return Date.UTC(ano, mes - 1, d);
}

/** Dias corridos de `dia` até `referencia` (positivo = `dia` no futuro). */
function diasAte(dia: string, referencia: string): number {
  return Math.round((msDoDia(dia) - msDoDia(referencia)) / 86_400_000);
}

// ── Resolução de área ────────────────────────────────────────────────────
/** De onde saiu o nome da área — usado no diagnóstico de honestidade. */
export type OrigemArea = 'equipe' | 'texto' | 'nenhuma';

export interface AreaResolvida {
  area: BoardAreaKey;
  areaName: string | null;
  origem: OrigemArea;
}

/**
 * Área de um projeto: `equipe_id` → `estrutura_equipes.area_id` →
 * `estrutura_areas.name`, com fallback no texto livre `projects.area`.
 * Mesmo precedente de `ProjectDetailsDialog.tsx:133-136`.
 */
export function resolverAreaProjeto(
  projeto: ProjetoDigital | null | undefined,
  equipes: EquipeAreaDigital[] | Map<string, EquipeAreaDigital>,
): AreaResolvida {
  if (!projeto) return { area: 'outros', areaName: null, origem: 'nenhuma' };

  const porId = equipes instanceof Map ? equipes : indexarEquipes(equipes);
  const daEquipe = projeto.equipe_id ? porId.get(projeto.equipe_id)?.area_name : null;
  if (daEquipe) return { area: classificarArea(daEquipe), areaName: daEquipe, origem: 'equipe' };

  const doTexto = projeto.area?.trim();
  if (doTexto) return { area: classificarArea(doTexto), areaName: doTexto, origem: 'texto' };

  return { area: 'outros', areaName: null, origem: 'nenhuma' };
}

/** Como o entregável chegou (ou não) até um projeto. */
export type OrigemVinculo = 'projeto' | 'sprint' | 'nenhum';

export interface AreaEntregavelResolvida extends AreaResolvida {
  projetoId: string | null;
  vinculo: OrigemVinculo;
}

/**
 * Área de um entregável: `project_id` direto; se NULL, `sprint_id` →
 * `sprints.project_id`. Sem projeto resolvível, cai em `outros` com
 * `vinculo: 'nenhum'` — jamais é descartado.
 */
export function resolverAreaEntregavel(
  entregavel: EntregavelDigital,
  projetos: ProjetoDigital[] | Map<string, ProjetoDigital>,
  sprints: SprintDigital[] | Map<string, SprintDigital>,
  equipes: EquipeAreaDigital[] | Map<string, EquipeAreaDigital>,
): AreaEntregavelResolvida {
  const projetosPorId = projetos instanceof Map ? projetos : indexarPorId(projetos);
  const sprintsPorId = sprints instanceof Map ? sprints : indexarPorId(sprints);

  let projetoId = entregavel.project_id;
  let vinculo: OrigemVinculo = projetoId ? 'projeto' : 'nenhum';

  if (!projetoId && entregavel.sprint_id) {
    const daSprint = sprintsPorId.get(entregavel.sprint_id)?.project_id ?? null;
    if (daSprint) {
      projetoId = daSprint;
      vinculo = 'sprint';
    }
  }

  // `project_id`/`sprints.project_id` preenchido mas o projeto não veio na
  // query (apagado ou barrado por RLS): o vínculo existe no dado, a área é que
  // não resolve. `projetoId` fica null para não indexar um projeto inexistente,
  // mas `vinculo` preserva a informação de que havia um ponteiro.
  const projeto = projetoId ? projetosPorId.get(projetoId) ?? null : null;
  const resolvida = resolverAreaProjeto(projeto, equipes);
  return { ...resolvida, projetoId: projeto ? projetoId : null, vinculo };
}

function indexarEquipes(equipes: EquipeAreaDigital[]) {
  return new Map(equipes.map((e) => [e.id, e]));
}

function indexarPorId<T extends { id: string }>(itens: T[]) {
  return new Map(itens.map((i) => [i.id, i]));
}

// ── Folhas vs. tarefas-mãe (ver bloco 3 do cabeçalho) ────────────────────
/** Ids dos entregáveis que são MÃE de algum outro entregável do escopo. */
export function idsDeTarefasMae(entregaveis: EntregavelDigital[]): Set<string> {
  const presentes = new Set(entregaveis.map((e) => e.id));
  const maes = new Set<string>();
  for (const e of entregaveis) {
    // `parent_id` órfão (mãe fora do escopo) não promove ninguém a mãe.
    if (e.parent_id && presentes.has(e.parent_id)) maes.add(e.parent_id);
  }
  return maes;
}

/** Só as folhas contam como entrega — mãe é agrupador, contaria em dobro. */
export function somenteFolhas(entregaveis: EntregavelDigital[]): EntregavelDigital[] {
  const maes = idsDeTarefasMae(entregaveis);
  return entregaveis.filter((e) => !maes.has(e.id));
}

// ── Pontualidade do entregável ───────────────────────────────────────────
export type ClassePontualidade =
  /** Concluído com `completed_at` dentro da janela e `<= due_date`. */
  | 'no_prazo'
  /** Concluído com `completed_at` dentro da janela e depois do `due_date`. */
  | 'atrasado'
  /** `completed` sem `completed_at` (ou data inválida): não dá para julgar. */
  | 'indeterminado'
  /** Concluído, mas fora da janela pedida — não é entrega DESTE período. */
  | 'fora_da_janela'
  /** Em aberto e `due_date` já passou: atraso de estoque, não de fluxo. */
  | 'aberto_vencido'
  /** Em aberto e ainda no prazo: nada a julgar. */
  | 'aberto_no_prazo';

/** `null`/valor fora do CHECK viram `'pending'`, igual a `normalizeEquipeKanbanStatus`. */
function statusNormalizado(status: string | null | undefined): string {
  return status && (STATUS_ENTREGAVEL as readonly string[]).includes(status) ? status : 'pending';
}

/**
 * Classifica UM entregável. `diaReferencia` é o "hoje" (vem da janela) e
 * `janela` delimita quais conclusões pertencem ao período.
 */
export function classificarPontualidade(
  entregavel: EntregavelDigital,
  janela: JanelaDigital,
  diaReferencia: string,
): ClassePontualidade {
  const vencimento = diaDeData(entregavel.due_date);
  const concluido = statusNormalizado(entregavel.status) === STATUS_ENTREGAVEL_CONCLUIDO;

  if (!concluido) {
    if (vencimento && diasAte(vencimento, diaReferencia) < 0) return 'aberto_vencido';
    return 'aberto_no_prazo';
  }

  const diaConclusao = diaBrasilia(entregavel.completed_at);
  if (!diaConclusao) return 'indeterminado';

  const t = Date.parse(entregavel.completed_at as string);
  const desde = Date.parse(janela.desdeISO);
  const ate = Date.parse(janela.ateISO);
  const janelaValida = !Number.isNaN(desde) && !Number.isNaN(ate);
  if (janelaValida && (t < desde || t > ate)) return 'fora_da_janela';

  // Sem `due_date` legível não há prazo para comparar — não inventamos um.
  if (!vencimento) return 'indeterminado';
  return diasAte(diaConclusao, vencimento) <= 0 ? 'no_prazo' : 'atrasado';
}

export interface PontualidadeEntregaveis {
  noPrazo: number;
  atrasados: number;
  /** `completed` sem `completed_at` legível: fora do numerador E do denominador. */
  indeterminados: number;
  /** Em aberto com `due_date` vencido (estoque, não fluxo da janela). */
  abertosVencidos: number;
  /** Entregas julgadas na janela = `noPrazo + atrasados`. */
  julgados: number;
  /** `noPrazo / julgados` em %. `0` quando não há nada julgável. */
  pontualidade: number;
}

/** Pontualidade de uma lista JÁ reduzida a folhas. */
export function pontualidadeEntregaveis(
  folhas: EntregavelDigital[],
  janela: JanelaDigital,
  diaReferencia: string,
): PontualidadeEntregaveis {
  let noPrazo = 0;
  let atrasados = 0;
  let indeterminados = 0;
  let abertosVencidos = 0;

  for (const e of folhas) {
    switch (classificarPontualidade(e, janela, diaReferencia)) {
      case 'no_prazo':
        noPrazo += 1;
        break;
      case 'atrasado':
        atrasados += 1;
        break;
      case 'indeterminado':
        indeterminados += 1;
        break;
      case 'aberto_vencido':
        abertosVencidos += 1;
        break;
      default:
        break;
    }
  }

  const julgados = noPrazo + atrasados;
  return {
    noPrazo,
    atrasados,
    indeterminados,
    abertosVencidos,
    julgados,
    pontualidade: julgados > 0 ? Math.round((noPrazo / julgados) * 100) : 0,
  };
}

// ── Saúde do projeto (mesma régua do painel Operacional) ─────────────────
/**
 * `em_dia` / `em_risco` / `atrasado` de um projeto da Digital, com os MESMOS
 * limiares que `usePerformanceData.ts:160-170` aplica a `org_projects`, só
 * trocando `org_tasks` por folhas de `sprint_deliverables`. Sem isso a linha da
 * Digital não seria comparável com Tax/OSG na mesma tabela.
 */
export function saudeProjetoDigital(
  projeto: ProjetoDigital,
  folhasDoProjeto: EntregavelDigital[],
  diaReferencia: string,
): ProjetoSaude['computed_status'] {
  const total = folhasDoProjeto.length;
  let concluidas = 0;
  let vencidasAbertas = 0;
  for (const e of folhasDoProjeto) {
    const concluida = statusNormalizado(e.status) === STATUS_ENTREGAVEL_CONCLUIDO;
    if (concluida) {
      concluidas += 1;
      continue;
    }
    const vencimento = diaDeData(e.due_date);
    if (vencimento && diasAte(vencimento, diaReferencia) < 0) vencidasAbertas += 1;
  }

  const razaoAtraso = total > 0 ? vencidasAbertas / total : 0;
  // Projeto sem entregável nenhum não é "atrasado" por omissão — é o mesmo
  // `completionRatio = 1` de usePerformanceData.ts:161.
  const razaoConclusao = total > 0 ? concluidas / total : 1;
  const fim = diaDeData(projeto.end_date);
  const diasRestantes = fim ? diasAte(fim, diaReferencia) : 999;

  if ((fim && diasRestantes < 0) || razaoAtraso > 0.4) return 'atrasado';
  if (razaoAtraso > 0.2 || (diasRestantes < 15 && razaoConclusao < 0.7)) return 'em_risco';
  return 'em_dia';
}

// ── Preparo compartilhado ────────────────────────────────────────────────
interface FolhaClassificada {
  entregavel: EntregavelDigital;
  area: BoardAreaKey;
  projetoId: string | null;
  vinculo: OrigemVinculo;
  origemArea: OrigemArea;
}

interface Preparado {
  folhas: FolhaClassificada[];
  projetosAtivos: { projeto: ProjetoDigital; area: BoardAreaKey }[];
  folhasPorProjeto: Map<string, EntregavelDigital[]>;
  diaReferencia: string;
}

function preparar(entrada: EntradaDigital): Preparado {
  const equipesPorId = indexarEquipes(entrada.equipes);
  const projetosPorId = indexarPorId(entrada.projetos);
  const sprintsPorId = indexarPorId(entrada.sprints);

  const folhas: FolhaClassificada[] = somenteFolhas(entrada.entregaveis).map((entregavel) => {
    const r = resolverAreaEntregavel(entregavel, projetosPorId, sprintsPorId, equipesPorId);
    return {
      entregavel,
      area: r.area,
      projetoId: r.projetoId,
      vinculo: r.vinculo,
      origemArea: r.origem,
    };
  });

  const folhasPorProjeto = new Map<string, EntregavelDigital[]>();
  for (const f of folhas) {
    if (!f.projetoId) continue;
    const lista = folhasPorProjeto.get(f.projetoId) ?? [];
    lista.push(f.entregavel);
    folhasPorProjeto.set(f.projetoId, lista);
  }

  const projetosAtivos = entrada.projetos
    .filter((p) => p.status === STATUS_PROJETO_ATIVO)
    .map((projeto) => ({ projeto, area: resolverAreaProjeto(projeto, equipesPorId).area }));

  // "Hoje" sai do fim da janela — nunca de `new Date()`.
  const diaReferencia = diaBrasilia(entrada.janela.ateISO) ?? diaDeData(entrada.janela.ateISO) ?? '';

  return { folhas, projetosAtivos, folhasPorProjeto, diaReferencia };
}

// ── Resumo por área, no formato do Board ─────────────────────────────────
/**
 * Uma linha por bucket de área, na FORMA EXATA de `ResumoArea` de
 * `@/lib/boardExecutivo`, para concatenar sem adaptador.
 *
 * Leitura de cada campo (as réguas NÃO são todas iguais às de Tax/OSG — ver
 * blocos 4 e 5 do cabeçalho):
 *   - `projetos`, `emDia`, `emRisco`, `atrasados`: projetos de `projects` com
 *     `status = 'active'`, classificados com os mesmos limiares do painel
 *     Operacional. Somam `projetos`.
 *   - `pontualidade`: % dos ENTREGÁVEIS concluídos na janela que saíram no
 *     prazo (`completed_at <= due_date`). Em Tax/OSG este campo é % de
 *     projetos em dia.
 *   - `concluidas`: folhas de `sprint_deliverables` concluídas DENTRO da janela,
 *     com `completed_at` legível (= `noPrazo + atrasados`). Concluído sem
 *     `completed_at` NÃO entra: não há como afirmar que foi neste período.
 *     Esse resto vive em `diagnostico.concluidosSemCompletedAt` — a integridade
 *     do período vale mais do que um total maior.
 *
 * Buckets sem projeto ativo, sem entrega e sem NENHUM entregável ficam fora.
 * Basta um entregável (mesmo aberto e sem área resolvida) para o bucket
 * aparecer: nada pode sumir silenciosamente.
 */
export function resumoDigital(entrada: EntradaDigital): ResumoArea[] {
  const { folhas, projetosAtivos, folhasPorProjeto, diaReferencia } = preparar(entrada);

  return BOARD_AREAS.map((area) => {
    const folhasDaArea = folhas.filter((f) => f.area === area);
    const projetosDaArea = projetosAtivos.filter((p) => p.area === area);

    const saude = saudeProjetos(
      projetosDaArea.map(({ projeto }) => ({
        area_name: null,
        computed_status: saudeProjetoDigital(
          projeto,
          folhasPorProjeto.get(projeto.id) ?? [],
          diaReferencia,
        ),
      })),
    );

    const pont = pontualidadeEntregaveis(
      folhasDaArea.map((f) => f.entregavel),
      entrada.janela,
      diaReferencia,
    );

    return {
      area,
      label: BOARD_AREA_LABEL[area],
      projetos: saude.total,
      emDia: saude.emDia,
      emRisco: saude.emRisco,
      atrasados: saude.atrasados,
      pontualidade: pont.pontualidade,
      concluidas: pont.julgados,
      _entregaveis: folhasDaArea.length,
    };
  })
    .filter((r) => r.projetos > 0 || r.concluidas > 0 || r._entregaveis > 0)
    .map(({ _entregaveis, ...linha }) => linha);
}

// ── Diagnóstico (o que a linha NÃO consegue dizer) ───────────────────────
export interface DiagnosticoDigital {
  /** Entregáveis lidos (todos, mãe incluída). */
  entregaveis: number;
  /** Tarefas-mãe descartadas da contagem para não duplicar. */
  tarefasMae: number;
  /** Folhas efetivamente medidas. */
  folhas: number;
  /** Folhas que chegaram ao projeto via `sprint_id` (não tinham `project_id`). */
  resolvidosViaSprint: number;
  /** Folhas sem `project_id` e sem sprint com projeto — caem em `outros`. */
  semVinculoDeProjeto: number;
  /** Folhas com ponteiro para projeto que não veio na query (apagado ou RLS). */
  projetoNaoEncontrado: number;
  /** Folhas cujo projeto existe mas não tem área (nem equipe, nem texto). */
  semAreaResolvida: number;
  /** Folhas cuja área veio do texto livre `projects.area`, não da estrutura. */
  areaPeloTextoLivre: number;
  /** `completed` sem `completed_at`: não conta como no prazo nem como atrasado. */
  concluidosSemCompletedAt: number;
  /** Em aberto com `due_date` vencido na data de referência. */
  abertosVencidos: number;
  /** Pontualidade consolidada (todas as áreas). */
  pontualidade: PontualidadeEntregaveis;
  /** Projetos de `projects` fora de `status = 'active'`, ignorados na contagem. */
  projetosNaoAtivos: number;
  /** Dia (Brasília) usado como "hoje" — derivado de `janela.ateISO`. */
  diaReferencia: string;
}

/**
 * Números que a linha do painel não tem onde mostrar, mas que o sócio precisa
 * ver antes de confiar nela. É aqui que os furos da atribuição aparecem.
 */
export function diagnosticoDigital(entrada: EntradaDigital): DiagnosticoDigital {
  const { folhas, diaReferencia } = preparar(entrada);
  const maes = idsDeTarefasMae(entrada.entregaveis);

  let resolvidosViaSprint = 0;
  let semVinculoDeProjeto = 0;
  let projetoNaoEncontrado = 0;
  let semAreaResolvida = 0;
  let areaPeloTextoLivre = 0;

  for (const f of folhas) {
    if (f.vinculo === 'sprint') resolvidosViaSprint += 1;
    if (f.vinculo === 'nenhum') semVinculoDeProjeto += 1;
    else if (!f.projetoId) projetoNaoEncontrado += 1;
    else if (f.origemArea === 'nenhuma') semAreaResolvida += 1;
    else if (f.origemArea === 'texto') areaPeloTextoLivre += 1;
  }

  const pont = pontualidadeEntregaveis(
    folhas.map((f) => f.entregavel),
    entrada.janela,
    diaReferencia,
  );

  return {
    entregaveis: entrada.entregaveis.length,
    tarefasMae: maes.size,
    folhas: folhas.length,
    resolvidosViaSprint,
    semVinculoDeProjeto,
    projetoNaoEncontrado,
    semAreaResolvida,
    areaPeloTextoLivre,
    concluidosSemCompletedAt: pont.indeterminados,
    abertosVencidos: pont.abertosVencidos,
    pontualidade: pont,
    projetosNaoAtivos: entrada.projetos.filter((p) => p.status !== STATUS_PROJETO_ATIVO).length,
    diaReferencia,
  };
}
