/**
 * Métricas da visão executiva do Board (`/equipe/board/dashboard`) e do painel
 * Operacional (`/equipe/board/performance`).
 *
 * Funções PURAS: recebem o snapshot já buscado pelos hooks e devolvem os números
 * da tela. Duas telas consumiam cópias divergentes desta lógica — agora é fonte
 * única, testada em `boardExecutivo.test.ts`.
 *
 * Princípio herdado de `@/utils/roiCalculator` (ver NotasMetodologicasModal):
 * razão sem denominador (investimento ≈ 0) devolve `null` e a UI mostra
 * "em construção" — NUNCA um número fabricado.
 */
import { ratioRoi } from '@/utils/roiCalculator';

// ── Áreas ────────────────────────────────────────────────────────────────
export type BoardAreaKey = 'tax' | 'osg' | 'dev' | 'outros';

export const BOARD_AREAS: BoardAreaKey[] = ['tax', 'osg', 'dev', 'outros'];

export const BOARD_AREA_LABEL: Record<BoardAreaKey, string> = {
  tax: 'Tax',
  osg: 'OSG',
  dev: 'Dev',
  outros: 'Outros',
};

/**
 * Classifica o nome da área cadastrada em `estrutura_areas` num dos buckets da
 * visão executiva. O que não casa vira `outros` — antes caía silenciosamente em
 * Tax, inflando a área e sumindo com o resto.
 */
export function classificarArea(areaName: string | null | undefined): BoardAreaKey {
  const x = (areaName || '').toLowerCase();
  if (!x) return 'outros';
  if (x.includes('tax') || x.includes('fiscal') || x.includes('tribut')) return 'tax';
  if (x.includes('osg') || x.includes('societ')) return 'osg';
  if (x.includes('dev') || x.includes('digital') || x.includes('tecnolog')) return 'dev';
  return 'outros';
}

// ── Classificação por CLUSTER (âncora canônica) ──────────────────────────
export interface AreaComCluster {
  id: string;
  name: string | null;
  cluster_id: string | null;
  /** De-para canônico do sistema: `['tax']`, `['osg']`… (ver `useClusterIdByPageCategory`). */
  page_categories: string[] | null;
}

/**
 * Todo o sistema é organizado por CLUSTER — área é campo opcional em
 * `org_projects` e fica NULL em boa parte dos registros, o que jogava projeto de
 * time inteiro em "Outros". Aqui montamos o de-para cluster → bucket do painel:
 *
 * A fonte é UMA: `estrutura_areas.page_categories`, por ID — imune a renomear
 * área. Não há palpite por nome aqui.
 *
 * Havia um segundo passo, por nome do cluster, justificado no comentário como
 * "o caso da Digital, que não tem page_categories cadastrado". A Digital tem:
 * `['dev','rotina']` — a justificativa estava stale. E o passo classificava por
 * substring: `TAX LEGAL`, área do cluster **Prado Advogados**, virava `tax`
 * porque o nome contém "tax". Cluster sem área que declare categoria agora fica
 * fora do mapa e cai em `outros`, que é a resposta honesta.
 */
/**
 * Bucket declarado em `estrutura_areas.page_categories` — o de-para canônico do
 * sistema, por ID. `null` quando a área não declara nenhuma categoria conhecida.
 */
export function bucketDePageCategories(cats: string[] | null | undefined): BoardAreaKey | null {
  return (cats ?? [])
    .map((c) => ((BOARD_AREAS as string[]).includes(c) ? (c as BoardAreaKey) : null))
    .find((c): c is BoardAreaKey => c !== null && c !== 'outros') ?? null;
}

export function construirMapaDeClusters(entrada: {
  areas: AreaComCluster[];
}): {
  bucketDoCluster: Map<string, BoardAreaKey>;
  bucketDaArea: Map<string, BoardAreaKey>;
} {
  const bucketDoCluster = new Map<string, BoardAreaKey>();
  const bucketDaArea = new Map<string, BoardAreaKey>();

  for (const area of entrada.areas ?? []) {
    if (!area?.id) continue;
    const bucket = bucketDePageCategories(area.page_categories);
    if (bucket) {
      bucketDaArea.set(area.id, bucket);
      // Toda área que chega aqui declarou categoria, então não há mais disputa
      // entre fonte canônica e palpite: a primeira irmã do cluster resolve.
      if (area.cluster_id && !bucketDoCluster.has(area.cluster_id)) {
        bucketDoCluster.set(area.cluster_id, bucket);
      }
    }
  }

  return { bucketDoCluster, bucketDaArea };
}

/** Item já classificado na origem (pelo cluster) ou classificável pelo nome. */
export interface ItemComArea {
  area_name: string | null;
  /** Bucket resolvido por ID/cluster. Tem precedência sobre o nome. */
  area_key?: BoardAreaKey | null;
}

/** Bucket de um item: o resolvido por cluster vence o palpite pelo nome. */
export function bucketDoItem(item: ItemComArea): BoardAreaKey {
  return item.area_key ?? classificarArea(item.area_name);
}

// `filtrarPorArea` foi removido: o filtro de área saiu das telas do Board,
// substituído pelo seletor global de cliente abaixo. `bucketDoItem` continua —
// o rollup "Áreas em um olhar" ainda agrupa por área.

// ── Filtro por CLUSTER (o seletor global de cliente do Board) ─────────────

/**
 * Recorta qualquer coleção cujas linhas carreguem `cluster_id`.
 *
 * Diferente de `filtrarPorArea`, não há classificação nem palpite por nome: o
 * cluster é o ID que a própria linha traz. Foi por isso que ele substituiu a
 * área no seletor — a área dependia de casar texto e jogava em "Outros" tudo
 * que não casasse.
 *
 * Linha com `cluster_id` nulo NÃO entra quando há cliente selecionado: com
 * filtro ativo, "não sei de quem é" não pode virar "é deste". Sem filtro
 * (`cluster === ''`), a coleção passa inteira.
 */
export function filtrarPorCluster<T extends { cluster_id?: string | null }>(
  itens: T[],
  cluster: string,
): T[] {
  if (!cluster) return itens;
  return itens.filter((i) => i.cluster_id === cluster);
}

/**
 * Mantém só as tarefas dos projetos informados.
 *
 * Necessário porque `resumoPorArea` resolve a área da tarefa pelo projeto dela:
 * passar projetos já filtrados sem filtrar as tarefas faria toda tarefa de fora
 * do recorte cair em "Outros" — inflando uma linha que deveria ter sumido.
 * Tarefa sem `project_id` fica de fora pelo mesmo motivo do filtro de cluster.
 */
export function filtrarTarefasPorProjetos<T extends { project_id?: string | null }>(
  tarefas: T[],
  projetos: { id: string }[],
): T[] {
  const ids = new Set(projetos.map((p) => p.id));
  return (tarefas || []).filter((t) => !!t?.project_id && ids.has(t.project_id));
}

// ── Saúde dos projetos ───────────────────────────────────────────────────
export interface ProjetoSaude {
  area_name: string | null;
  computed_status: 'em_dia' | 'em_risco' | 'atrasado';
}

export interface SaudeProjetos {
  total: number;
  emDia: number;
  emRisco: number;
  atrasados: number;
  /** % de projetos em dia. 0 quando não há projetos no escopo. */
  pontualidade: number;
}

export function saudeProjetos(
  projetos: Array<Pick<ProjetoSaude, 'computed_status'>>,
): SaudeProjetos {
  let emDia = 0, emRisco = 0, atrasados = 0;
  for (const p of projetos) {
    if (p.computed_status === 'em_dia') emDia += 1;
    else if (p.computed_status === 'em_risco') emRisco += 1;
    else if (p.computed_status === 'atrasado') atrasados += 1;
  }
  const total = projetos.length;
  return {
    total,
    emDia,
    emRisco,
    atrasados,
    pontualidade: total > 0 ? Math.round((emDia / total) * 100) : 0,
  };
}

// ── Série de tarefas concluídas por área ─────────────────────────────────
export type Granularidade = 'semana' | 'mes';

export interface TarefaConcluida {
  /** `org_tasks` não tem data de conclusão: `updated_at` é o proxy disponível. */
  updated_at: string;
  project_id: string | null;
  /** Prazo, quando houver. Sem prazo a entrega conta, mas fica fora da pontualidade. */
  due_date?: string | null;
}

/**
 * Data-calendário em São Paulo. Comparar as strings ISO cruas jogaria uma entrega
 * das 22h de Brasília para o dia seguinte (UTC), marcando atraso onde não houve.
 */
function diaSaoPaulo(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

/** Entregou até o dia do prazo (o próprio dia conta como no prazo). */
export function entregaNoPrazo(conclusaoISO: string, prazo: string): boolean {
  const dia = diaSaoPaulo(conclusaoISO);
  if (!dia) return false;
  return dia <= prazo.slice(0, 10);
}

export interface ProjetoArea extends ItemComArea {
  id: string;
}

export type SerieAreaPonto = { name: string } & Record<BoardAreaKey, number>;

/**
 * Granularidade honesta para a janela escolhida: janelas curtas viram semanas
 * (um único ponto mensal não é tendência), janelas longas viram meses.
 */
export function granularidadePara(dias: number): Granularidade {
  return dias <= 45 ? 'semana' : 'mes';
}

function chaveBucket(d: Date, granularidade: Granularidade): { key: string; label: string } {
  if (granularidade === 'mes') {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`;
    return { key, label };
  }
  // Semana começando na segunda-feira (ISO), rotulada pelo dia inicial.
  const base = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diaSemana = (base.getDay() + 6) % 7; // 0 = segunda
  base.setDate(base.getDate() - diaSemana);
  const key = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
  const label = `${String(base.getDate()).padStart(2, '0')}/${String(base.getMonth() + 1).padStart(2, '0')}`;
  return { key, label };
}

/**
 * Tarefas concluídas por período e área. Ordenada CRONOLOGICAMENTE pela chave —
 * a versão anterior usava a ordem de chegada das linhas do Postgres, então as
 * barras podiam aparecer fora de ordem (e o `slice(-3)` cortava o mês errado).
 */
export function serieTarefasPorArea(
  tarefas: TarefaConcluida[],
  projetos: ProjetoArea[],
  granularidade: Granularidade,
): SerieAreaPonto[] {
  const areaPorProjeto = new Map(projetos.map((p) => [p.id, bucketDoItem(p)]));
  const buckets = new Map<string, SerieAreaPonto>();

  for (const t of tarefas) {
    if (!t.updated_at) continue;
    const d = new Date(t.updated_at);
    if (Number.isNaN(d.getTime())) continue;
    const { key, label } = chaveBucket(d, granularidade);
    let ponto = buckets.get(key);
    if (!ponto) {
      ponto = { name: label, tax: 0, osg: 0, dev: 0, outros: 0 };
      buckets.set(key, ponto);
    }
    const area = t.project_id ? areaPorProjeto.get(t.project_id) ?? 'outros' : 'outros';
    ponto[area] += 1;
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, ponto]) => ponto);
}

// ── ROI / economia validada ──────────────────────────────────────────────
/**
 * Colunas reais de `process_improvements`. As telas antigas somavam
 * `total_savings_monthly`, coluna que NÃO existe no schema — o resultado era
 * R$ 0 permanente. A economia medida vive em `cost_saved_monthly` (mesma fonte
 * do painel Impacto) e o investimento em `implementation_cost` +
 * `one_time_external_cost`.
 */
export interface MelhoriaRoi {
  id: string;
  /** Cluster da melhoria — permite recortar a economia pelo cliente global. */
  cluster_id?: string | null;
  cost_saved_monthly: number | null;
  /**
   * Horas/mês devolvidas pela melhoria — a matéria-prima do FTE liberado que a
   * diretoria pede (28/08). Vinha da tabela mas ninguém lia.
   */
  time_saved_hours?: number | null;
  time_saved_percent?: number | null;
  baseline_time_hours?: number | null;
  improved_time_hours?: number | null;
  improvement_description?: string | null;
  /** Nome do processo em `processes` — o que a diretoria reconhece como ferramenta. */
  process_name?: string | null;
  process_area?: string | null;
  implementation_cost: number | null;
  one_time_external_cost: number | null;
  created_at: string | null;
}

export interface RoiConsolidado {
  economiaMensal: number;
  economiaAnual: number;
  investimento: number;
  /** null quando não há investimento cadastrado → UI mostra "em construção". */
  roiPct: number | null;
  /** Nº de melhorias avaliadas que compõem o número. */
  melhorias: number;
}

export function consolidarRoi(melhorias: MelhoriaRoi[]): RoiConsolidado {
  let economiaMensal = 0;
  let investimento = 0;
  for (const m of melhorias) {
    economiaMensal += m.cost_saved_monthly || 0;
    investimento += (m.implementation_cost || 0) + (m.one_time_external_cost || 0);
  }
  const economiaAnual = economiaMensal * 12;
  return {
    economiaMensal,
    economiaAnual,
    investimento,
    roiPct: ratioRoi(economiaAnual, investimento),
    melhorias: melhorias.length,
  };
}

/** Economia anual acumulada ao longo do tempo, para a área do gráfico. */
export function serieRoiAcumulado(melhorias: MelhoriaRoi[]): { name: string; value: number }[] {
  const comData = melhorias
    .filter((m) => !!m.created_at)
    .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
  let acumulado = 0;
  return comData.map((m) => {
    acumulado += (m.cost_saved_monthly || 0) * 12;
    const d = new Date(m.created_at as string);
    const label = Number.isNaN(d.getTime())
      ? '?'
      : `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`;
    return { name: label, value: Math.round(acumulado) };
  });
}

// ── Resumo por área (visão de sócio) ─────────────────────────────────────
export interface ResumoArea {
  area: BoardAreaKey;
  label: string;
  projetos: number;
  emDia: number;
  emRisco: number;
  atrasados: number;
  /**
   * % das ENTREGAS concluídas no período que saíram no prazo. `null` quando não
   * há entrega com prazo — a UI mostra "—" em vez de 0%.
   *
   * ATENÇÃO: já foi "% de projetos em dia". Mudou porque a área Digital entra no
   * resumo por outra fonte (`sprint_deliverables`) e só sabe medir pontualidade
   * de ENTREGA. Coluna que significa duas coisas conforme a linha é pior que
   * coluna ausente, então as duas fontes passaram a medir a mesma coisa.
   */
  pontualidade: number | null;
  concluidas: number;
  /** Entregas concluídas que TINHAM prazo — base da pontualidade. */
  comPrazo?: number;
}

export interface ProjetoResumo extends ProjetoSaude, ProjetoArea {}

/**
 * Uma linha por área com o essencial: quantos projetos, quantos fora de prazo,
 * entregas no período e % no prazo. Áreas sem nenhum projeto e sem nenhuma
 * entrega ficam fora (não polui a tela com zeros).
 */
export function resumoPorArea(
  projetos: ProjetoResumo[],
  tarefasConcluidas: TarefaConcluida[],
): ResumoArea[] {
  const areaPorProjeto = new Map(projetos.map((p) => [p.id, bucketDoItem(p)]));
  const entregas = new Map<BoardAreaKey, { concluidas: number; comPrazo: number; noPrazo: number }>();
  for (const t of tarefasConcluidas) {
    const area = t.project_id ? areaPorProjeto.get(t.project_id) ?? 'outros' : 'outros';
    const acc = entregas.get(area) ?? { concluidas: 0, comPrazo: 0, noPrazo: 0 };
    acc.concluidas += 1;
    if (t.due_date) {
      acc.comPrazo += 1;
      if (entregaNoPrazo(t.updated_at, t.due_date)) acc.noPrazo += 1;
    }
    entregas.set(area, acc);
  }

  return BOARD_AREAS.map((area) => {
    const doGrupo = projetos.filter((p) => bucketDoItem(p) === area);
    const saude = saudeProjetos(doGrupo);
    const e = entregas.get(area) ?? { concluidas: 0, comPrazo: 0, noPrazo: 0 };
    return {
      area,
      label: BOARD_AREA_LABEL[area],
      projetos: saude.total,
      emDia: saude.emDia,
      emRisco: saude.emRisco,
      atrasados: saude.atrasados,
      pontualidade: e.comPrazo > 0 ? Math.round((e.noPrazo / e.comPrazo) * 100) : null,
      concluidas: e.concluidas,
      comPrazo: e.comPrazo,
    };
  }).filter((r) => r.projetos > 0 || r.concluidas > 0);
}

// ── Resumo por área de CADASTRO (Bloco E, 21/08) ──────────────────────────
export interface AreaCadastro {
  id: string;
  name: string;
  is_active: boolean;
}

export interface ResumoAreaCadastro {
  id: string;
  label: string;
  projetos: number;
  emDia: number;
  emRisco: number;
  atrasados: number;
  pontualidade: number | null;
  concluidas: number;
  comPrazo?: number;
  /**
   * Unidade de trabalho da contagem de `concluidas` (Bloco E4, 21/08): tarefa
   * de projeto e entregável de sprint não são a mesma grandeza — dizer a
   * unidade por linha em vez de somar tudo numa coluna sem rótulo.
   */
  unidade: 'tarefas' | 'entregáveis';
}

interface ProjetoComArea {
  id: string;
  estrutura_area_id: string | null;
  computed_status: ProjetoSaude['computed_status'];
}

/**
 * Uma linha por área CADASTRADA — não por bucket de 4 categorias. Para o
 * "Áreas em um olhar" (Bloco E, 21/08): o propósito do bloco é o dono ver
 * TODAS as áreas sem entrar em cada uma, então a lista tem que vir do
 * CADASTRO (`estrutura_areas`), não do dado. Área sem movimento ainda
 * aparece, com zero — área ausente pareceria que ela não existe.
 *
 * Só áreas ATIVAS entram. As inativas ficam de fora por decisão (21/08):
 * no estado medido, todas pertencem ao mesmo cluster de uma área ativa, com
 * zero projeto — são estrutura antiga que virou equipe, não área esperando
 * dado. Reativar no cadastro é o que as traz de volta (o filtro é
 * `is_active`, não uma lista fixa).
 *
 * Tarefa cujo projeto não tem `estrutura_area_id` não entra em NENHUMA linha
 * daqui — é resíduo tratado em outro lugar (ver "Sem área atribuída", Bloco
 * E3), não silenciosamente somado a uma área que não fez o trabalho.
 */
export function resumoPorAreaCadastro(
  areas: AreaCadastro[],
  projetos: ProjetoComArea[],
  tarefasConcluidas: TarefaConcluida[],
): ResumoAreaCadastro[] {
  const areaPorProjeto = new Map(projetos.map((p) => [p.id, p.estrutura_area_id]));
  const entregas = new Map<string, { concluidas: number; comPrazo: number; noPrazo: number }>();
  for (const t of tarefasConcluidas) {
    const areaId = t.project_id ? areaPorProjeto.get(t.project_id) : null;
    if (!areaId) continue;
    const acc = entregas.get(areaId) ?? { concluidas: 0, comPrazo: 0, noPrazo: 0 };
    acc.concluidas += 1;
    if (t.due_date) {
      acc.comPrazo += 1;
      if (entregaNoPrazo(t.updated_at, t.due_date)) acc.noPrazo += 1;
    }
    entregas.set(areaId, acc);
  }

  return areas
    .filter((a) => a.is_active)
    .map((area) => {
      const doGrupo = projetos.filter((p) => p.estrutura_area_id === area.id);
      const saude = saudeProjetos(doGrupo);
      const e = entregas.get(area.id) ?? { concluidas: 0, comPrazo: 0, noPrazo: 0 };
      return {
        id: area.id,
        label: area.name,
        projetos: saude.total,
        emDia: saude.emDia,
        emRisco: saude.emRisco,
        atrasados: saude.atrasados,
        pontualidade: e.comPrazo > 0 ? Math.round((e.noPrazo / e.comPrazo) * 100) : null,
        concluidas: e.concluidas,
        comPrazo: e.comPrazo,
        unidade: 'tarefas' as const,
      };
    });
}

/**
 * Mistura uma linha extra (ex.: entregáveis de sprint da Digital, que não têm
 * como resolver `estrutura_area_id` — ver Bloco E3) numa lista de
 * `resumoPorAreaCadastro`, pelo id da área. Mesma regra de mesclagem de
 * `mesclarResumoArea`: contagens somam, pontualidade é média ponderada.
 */
export function mesclarResumoAreaCadastro(
  linhas: ResumoAreaCadastro[],
  areaId: string,
  extra: { concluidas: number; comPrazo?: number; pontualidade?: number | null },
): ResumoAreaCadastro[] {
  return linhas.map((r) => {
    if (r.id !== areaId) return r;
    const baseA = r.comPrazo ?? (r.pontualidade !== null ? r.concluidas : 0);
    const baseB = extra.comPrazo ?? (extra.pontualidade != null ? extra.concluidas : 0);
    const total = baseA + baseB;
    const pontualidade = total > 0
      ? Math.round((((r.pontualidade ?? 0) * baseA) + ((extra.pontualidade ?? 0) * baseB)) / total)
      : null;
    return {
      ...r,
      concluidas: r.concluidas + extra.concluidas,
      pontualidade,
      comPrazo: total,
      // Se a área não tinha NENHUMA tarefa de projeto, a unidade toda vem do
      // extra (hoje: sempre entregável de sprint da Digital — ver Bloco E3).
      unidade: r.concluidas === 0 ? 'entregáveis' : r.unidade,
    };
  });
}

/**
 * Junta duas linhas da MESMA área vindas de fontes diferentes (ex.: projetos da
 * Digital em `org_projects` + entregáveis de sprint). Contagens somam; a
 * pontualidade é média ponderada pela base de cada lado (`comPrazo`, ou
 * `concluidas` quando a fonte não expõe a base). Sem base dos dois lados,
 * devolve a que existir — e `null` se nenhuma existir.
 */
export function mesclarResumoArea(a: ResumoArea, b: ResumoArea): ResumoArea {
  const baseA = a.comPrazo ?? (a.pontualidade !== null ? a.concluidas : 0);
  const baseB = b.comPrazo ?? (b.pontualidade !== null ? b.concluidas : 0);
  const total = baseA + baseB;
  const pontualidade = total > 0
    ? Math.round((((a.pontualidade ?? 0) * baseA) + ((b.pontualidade ?? 0) * baseB)) / total)
    : null;
  return {
    area: a.area,
    label: a.label,
    projetos: a.projetos + b.projetos,
    emDia: a.emDia + b.emDia,
    emRisco: a.emRisco + b.emRisco,
    atrasados: a.atrasados + b.atrasados,
    pontualidade,
    concluidas: a.concluidas + b.concluidas,
    comPrazo: total,
  };
}
