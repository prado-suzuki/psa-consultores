/**
 * Métricas do painel Operacional (`/equipe/board/performance`) — o painel do
 * sócio.
 *
 * Regra que dá nome ao arquivo: **o recorte tem que valer para tudo que a tela
 * afirma**. Três dos cinco KPIs eram globais e o filtro "certificava" um número
 * que não era do escopo escolhido.
 *
 * O recorte hoje é por CLUSTER (o seletor global de cliente do Board), não mais
 * por área. Isso resolveu a última exceção: a economia validada era
 * necessariamente global porque `process_improvements` só tem `cluster_id` e o
 * filtro era por área. Agora ela também é recortável. Todo KPI segue rotulando
 * o escopo real — número global com cliente escolhido diz o motivo.
 *
 * Funções PURAS: recebem o snapshot já buscado pelos hooks e devolvem números e
 * rótulos. Nada de cálculo dentro do `.tsx`. Testado em
 * `performanceOperacional.test.ts`.
 *
 * Princípio herdado de `boardExecutivo.ts` / `@/utils/roiCalculator`: razão sem
 * denominador devolve `null` e a UI declara a ausência de base ("sem entregas
 * no período", "escopo vazio") — NUNCA um número ou classificação fabricados.
 */
import { differenceInCalendarDays, differenceInDays, parseISO } from 'date-fns';
import {
  BOARD_AREAS, BOARD_AREA_LABEL, bucketDePageCategories, bucketDoItem, classificarArea,
  type BoardAreaKey,
} from '@/lib/boardExecutivo';

/** Escopo efetivo de um número: recortado pela área ou necessariamente global. */
export type EscopoTipo = 'area' | 'global';

// ── Aninhamento do PostgREST ─────────────────────────────────────────────
/** Relação aninhada do PostgREST: objeto quando to-one, array quando to-many. */
type Aninhado<T> = T | T[] | null | undefined;

function primeiro<T>(valor: Aninhado<T>): T | null {
  if (!valor) return null;
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

// ── Pessoa → áreas (via equipe) ──────────────────────────────────────────
export interface MembroEquipeBruto {
  user_id: string | null;
  equipe?: Aninhado<{
    area?: Aninhado<{
      name?: string | null;
      page_categories?: string[] | null;
      cluster_id?: string | null;
    }>;
  }>;
}

export interface MembroEquipeArea {
  user_id: string | null;
  area_name: string | null;
  /** Bucket declarado pela área (por ID, não pelo nome). */
  area_key?: BoardAreaKey | null;
  /**
   * Cluster da área da equipe. É o recorte do seletor global de cliente: ID
   * puro, sem bucket nem palpite por nome — e por isso alcança clusters que a
   * classificação por nome jogava em "Outros".
   */
  cluster_id?: string | null;
}

/**
 * Achata `estrutura_equipe_membros → estrutura_equipes → estrutura_areas` em
 * `{ user_id, area_name }`. Uma linha por vínculo (uma pessoa em duas equipes
 * gera duas linhas) — assim a contagem de "membros ativos" não muda.
 */
export function normalizarMembrosEquipe(linhas: MembroEquipeBruto[]): MembroEquipeArea[] {
  return (linhas || []).map((l) => {
    const equipe = primeiro(l?.equipe);
    const area = primeiro(equipe?.area);
    return {
      user_id: l?.user_id ?? null,
      area_name: area?.name ?? null,
      // `page_categories` é a fonte canônica: sobrevive a renomear a área.
      area_key: bucketDePageCategories(area?.page_categories),
      cluster_id: area?.cluster_id ?? null,
    };
  });
}

/**
 * `user_id` → clusters em que a pessoa atua, via equipe → área → cluster.
 *
 * Gêmeo de `mapaAreasPorPessoa`, mas por ID: enquanto aquele depende de a área
 * declarar `page_categories` ou de o nome casar com tax/osg/dev, este só
 * precisa da FK que a área já tem. Pessoa cuja área não tem cluster fica de
 * fora do mapa — e `pessoaNoRecorte` a trata como "não é deste recorte".
 */
export function mapaClustersPorPessoa(membros: MembroEquipeArea[]): Map<string, Set<string>> {
  const mapa = new Map<string, Set<string>>();
  for (const m of membros || []) {
    if (!m?.user_id || !m.cluster_id) continue;
    const atual = mapa.get(m.user_id) ?? new Set<string>();
    atual.add(m.cluster_id);
    mapa.set(m.user_id, atual);
  }
  return mapa;
}

/**
 * `user_id` → áreas em que a pessoa atua. Uma pessoa pode estar em mais de uma
 * equipe, portanto em mais de uma área: o valor é um conjunto, não um único
 * bucket.
 */
export function mapaAreasPorPessoa(membros: MembroEquipeArea[]): Map<string, Set<BoardAreaKey>> {
  const mapa = new Map<string, Set<BoardAreaKey>>();
  for (const m of membros || []) {
    if (!m?.user_id) continue;
    const atual = mapa.get(m.user_id) ?? new Set<BoardAreaKey>();
    atual.add(bucketDoItem(m));
    mapa.set(m.user_id, atual);
  }
  return mapa;
}

/**
 * A pessoa pertence ao recorte?
 *
 * A `chave` é um bucket de área (`'tax'`) OU um id de cluster — a função não
 * precisa saber qual, só compara com o conjunto que o mapa guarda. É isso que
 * deixa o mesmo predicado servir ao filtro de área e ao seletor global de
 * cliente, com o mapa correspondente (`mapaAreasPorPessoa` /
 * `mapaClustersPorPessoa`).
 *
 * `''` e `'todas'` aceitam qualquer pessoa; sem vínculo cadastrado, a pessoa
 * não é do recorte.
 */
export function pessoaNoRecorte(
  mapa: Map<string, Set<string>>,
  userId: string | null | undefined,
  chave: string,
): boolean {
  if (!chave || chave === 'todas') return true;
  if (!userId) return false;
  return mapa.get(userId)?.has(chave) ?? false;
}

export interface EscopoPessoas<T> {
  pessoas: T[];
  escopo: EscopoTipo;
}

/**
 * Recorta pessoas pelo vínculo da equipe — por área ou por cluster, conforme o
 * mapa recebido. Sem NENHUM vínculo cadastrado o recorte é impossível: devolve
 * todas e marca `global`, para a tela dizer que a lista não está filtrada (em
 * vez de mostrar uma lista vazia que parece "ninguém trabalhou").
 */
export function pessoasNoEscopo<T extends { id: string }>(
  pessoas: T[],
  mapa: Map<string, Set<string>>,
  chave: string,
): EscopoPessoas<T> {
  const todas = pessoas || [];
  if (!chave || chave === 'todas') return { pessoas: todas, escopo: 'global' };
  if (mapa.size === 0) return { pessoas: todas, escopo: 'global' };
  return { pessoas: todas.filter((p) => pessoaNoRecorte(mapa, p.id, chave)), escopo: 'area' };
}

// `mapaAreaPorProjeto`, `areaDaTarefa` e `filtrarTarefasPorArea` foram removidos
// junto com o filtro de área da tela: o recorte de tarefa agora é
// `filtrarTarefasPorProjetos` (@/lib/boardExecutivo), que segue o projeto já
// recortado por cluster em vez de reclassificar a tarefa por bucket.

// ── Tempo médio (desvio de prazo das entregas) ───────────────────────────
export interface TarefaOperacional {
  status?: string | null;
  assigned_to?: string | null;
  updated_at?: string | null;
  due_date?: string | null;
  project_id?: string | null;
}

export interface DesvioPrazo {
  /**
   * Desvio médio ASSINADO em dias vs. o prazo: negativo = entregou antes,
   * positivo = entregou depois. `null` sem amostra.
   */
  dias: number | null;
  /** Tarefas que sustentam a média (concluídas COM prazo e COM data de conclusão). */
  amostra: number;
  /** Quantas dessas entregas saíram DEPOIS do prazo. */
  atrasadas: number;
}

/**
 * Desvio médio das entregas em relação ao prazo.
 *
 * A fórmula histórica da tela era `Math.abs(Math.max(1, diff))`, o que criava um
 * PISO DE 1 DIA: entrega adiantada em 10 dias e entrega pontual contavam as duas
 * como "1 dia". O indicador nunca podia ficar abaixo de 1 e só sabia medir
 * atraso — um time que entrega adiantado aparecia igual a um que estoura o prazo
 * por um dia. Agora a média é assinada e sem piso, e vem acompanhada de quantas
 * entregas de fato passaram do prazo.
 */
export function desvioMedioEntrega(tarefas: TarefaOperacional[]): DesvioPrazo {
  const concluidas = (tarefas || []).filter(
    (t) => t?.status === 'done' && t.updated_at && t.due_date,
  );
  if (concluidas.length === 0) return { dias: null, amostra: 0, atrasadas: 0 };
  let soma = 0;
  let atrasadas = 0;
  for (const t of concluidas) {
    const diff = differenceInDays(parseISO(t.updated_at as string), parseISO(t.due_date as string));
    soma += diff;
    if (diff > 0) atrasadas += 1;
  }
  return { dias: soma / concluidas.length, amostra: concluidas.length, atrasadas };
}

// ── Metas do ciclo ───────────────────────────────────────────────────────
export interface MetaCiclo {
  id?: string;
  nivel?: string | null;
  peso?: number | null;
  progresso_atual?: number | null;
  status?: string | null;
  responsavel_id?: string | null;
}

export interface EscopoMetas {
  metas: MetaCiclo[];
  escopo: EscopoTipo;
  /** Metas cujo responsável não tem vínculo equipe→área (não atribuíveis). */
  semVinculoDeArea: number;
}

/**
 * `metas` não tem coluna de área. A única atribuição possível é
 * `responsavel_id` → equipe → área. Quando NENHUMA meta é atribuível o número
 * volta a ser global e a tela precisa dizer isso — é melhor um 0% rotulado
 * "todas as áreas" do que um 0% que finge ser da área filtrada.
 */
export function metasNoEscopo(
  metas: MetaCiclo[],
  mapa: Map<string, Set<string>>,
  chave: string,
): EscopoMetas {
  const todas = metas || [];
  const semVinculoDeArea = todas.filter((m) => !m?.responsavel_id || !mapa.has(m.responsavel_id)).length;
  if (!chave || chave === 'todas') return { metas: todas, escopo: 'global', semVinculoDeArea };
  const atribuiveis = todas.length - semVinculoDeArea;
  if (atribuiveis === 0) return { metas: todas, escopo: 'global', semVinculoDeArea };
  return {
    metas: todas.filter((m) => pessoaNoRecorte(mapa, m.responsavel_id, chave)),
    escopo: 'area',
    semVinculoDeArea,
  };
}

export interface ResumoMetas {
  total: number;
  /** Metas de nível individual — as únicas que entram no progresso. */
  individuais: number;
  /** Média de progresso das individuais; 0 quando não há individuais. */
  progresso: number;
  emRisco: number;
}

export function resumoMetas(metas: MetaCiclo[]): ResumoMetas {
  const todas = metas || [];
  const individuais = todas.filter((m) => m?.nivel === 'individual');
  const progresso = individuais.length > 0
    ? Math.round(individuais.reduce((a, m) => a + (m.progresso_atual ?? 0), 0) / individuais.length)
    : 0;
  return {
    total: todas.length,
    individuais: individuais.length,
    progresso,
    emRisco: todas.filter((m) => (m?.progresso_atual ?? 0) < 70 && m?.status === 'ativa').length,
  };
}

// ── Contribuição individual (entregas da janela) ─────────────────────────
export interface PessoaBasica {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
}

export interface ContribuicaoMembro {
  id: string;
  nome: string;
  iniciais: string;
  /** Tarefas concluídas na janela. É o número principal do card. */
  entregas: number;
  /** Entregas que dão para julgar prazo (têm `due_date` e data de conclusão). */
  comPrazo: number;
  noPrazo: number;
  /** % de entregas no prazo. `null` quando não há entrega com prazo definido. */
  pontualidade: number | null;
  /** PPR do ciclo (metas), NÃO da janela. `null` sem meta individual. */
  pprCiclo: number | null;
}

function nomeDe(p: PessoaBasica): string {
  return `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim();
}

function iniciaisDe(p: PessoaBasica): string {
  return `${p?.first_name?.[0] ?? ''}${p?.last_name?.[0] ?? ''}`.toUpperCase();
}

/** Entregue no prazo = concluída em dia igual ou anterior ao `due_date`. */
function entregouNoPrazo(t: TarefaOperacional): boolean {
  if (!t.updated_at || !t.due_date) return false;
  return differenceInCalendarDays(parseISO(t.updated_at), parseISO(t.due_date)) <= 0;
}

/**
 * O card "Contribuição Individual" mostrava o PPR do ciclo como valor principal
 * de um recorte de 7/30/90 dias: sem meta cadastrada, TODA a equipe aparecia com
 * 0 e chip vermelho "Abaixo" — enquanto as tarefas concluídas no período eram
 * calculadas e jogadas fora. Agora o número da janela é a ENTREGA da janela; o
 * PPR vira coluna secundária explícita.
 *
 * Fica de fora quem não tem entrega no período nem meta individual — sem base,
 * não há o que dizer sobre a pessoa.
 */
export function contribuicaoNoPeriodo(
  pessoas: PessoaBasica[],
  tarefas: TarefaOperacional[],
  metas: MetaCiclo[],
): ContribuicaoMembro[] {
  const porPessoa = new Map<string, { entregas: number; comPrazo: number; noPrazo: number }>();
  for (const t of tarefas || []) {
    if (!t?.assigned_to || t.status !== 'done') continue;
    const atual = porPessoa.get(t.assigned_to) ?? { entregas: 0, comPrazo: 0, noPrazo: 0 };
    atual.entregas += 1;
    if (t.due_date && t.updated_at) {
      atual.comPrazo += 1;
      if (entregouNoPrazo(t)) atual.noPrazo += 1;
    }
    porPessoa.set(t.assigned_to, atual);
  }

  const todasMetas = metas || [];

  return (pessoas || [])
    .map((p) => {
      const agg = porPessoa.get(p.id) ?? { entregas: 0, comPrazo: 0, noPrazo: 0 };
      const individuais = todasMetas.filter((m) => m?.responsavel_id === p.id && m?.nivel === 'individual');
      const somaPesos = individuais.reduce((a, m) => a + (m.peso ?? 1), 0);
      const somaProg = individuais.reduce((a, m) => a + (m.progresso_atual ?? 0) * (m.peso ?? 1), 0);
      return {
        id: p.id,
        nome: nomeDe(p) || 'Sem nome',
        iniciais: iniciaisDe(p) || '??',
        entregas: agg.entregas,
        comPrazo: agg.comPrazo,
        noPrazo: agg.noPrazo,
        pontualidade: agg.comPrazo > 0 ? Math.round((agg.noPrazo / agg.comPrazo) * 100) : null,
        pprCiclo: somaPesos > 0 ? Math.round(somaProg / somaPesos) : null,
      };
    })
    .filter((m) => m.entregas > 0 || m.pprCiclo !== null)
    .sort((a, b) => {
      if (b.entregas !== a.entregas) return b.entregas - a.entregas;
      const pa = a.pontualidade ?? -1;
      const pb = b.pontualidade ?? -1;
      if (pb !== pa) return pb - pa;
      return a.nome.localeCompare(b.nome, 'pt-BR');
    });
}

export type VarianteClassificacao = 'ppr-s' | 'ppr-a' | 'ppr-p' | 'ppr-b' | 'gy';

/**
 * Chip de classificação só quando existe base para classificar. Sem entrega, ou
 * sem prazo cadastrado, o rótulo é neutro — "Abaixo" era uma acusação sem dado.
 */
export function classificarContribuicao(
  m: Pick<ContribuicaoMembro, 'entregas' | 'pontualidade'>,
): { variant: VarianteClassificacao; label: string } {
  if (!m || m.entregas === 0) return { variant: 'gy', label: 'sem entregas' };
  if (m.pontualidade === null) return { variant: 'gy', label: 'sem prazo definido' };
  if (m.pontualidade >= 100) return { variant: 'ppr-s', label: 'Supera' };
  if (m.pontualidade >= 85) return { variant: 'ppr-a', label: 'Atende' };
  if (m.pontualidade >= 70) return { variant: 'ppr-p', label: 'Parcial' };
  return { variant: 'ppr-b', label: 'Abaixo' };
}

// ── Rótulos honestos ─────────────────────────────────────────────────────
/**
 * Chip da coluna Área: variante pela classificação canônica, texto pelo cadastro.
 * `outros` (e área ausente) usa o chip neutro — o `BoardChip` só tem cor para os
 * buckets nomeados, e área desconhecida NÃO pode herdar a cor de uma área real.
 */
export function chipDeArea(
  areaName: string | null | undefined,
  areaKey?: BoardAreaKey | null,
): { variant: Exclude<BoardAreaKey, 'outros'> | 'gy'; label: string } {
  const nome = (areaName ?? '').trim();
  const bucket = areaKey ?? classificarArea(nome);
  // Sem nome mas com cluster resolvido, o rótulo vem do bucket — o projeto tem
  // dono conhecido, só não tem área cadastrada.
  if (!nome) {
    return bucket === 'outros'
      ? { variant: 'gy', label: 'Sem área' }
      : { variant: bucket, label: BOARD_AREA_LABEL[bucket] };
  }
  return { variant: bucket === 'outros' ? 'gy' : bucket, label: nome };
}

/** Nome curto do recorte de área para os rótulos da tela. */
/**
 * Rótulo do escopo REAL de um número, para o seletor global de cliente.
 *
 * Substituiu `rotuloArea`/`rotuloEscopo`, removidos com o filtro de área.
 * Recebe o NOME já resolvido (o mapa de clusters vive no hook, não aqui) e
 * mantém a regra que importa: número que caiu para global com cliente escolhido
 * diz o motivo, em vez de se passar por recortado.
 */
export function rotuloEscopoCliente(escopo: EscopoTipo, nomeCliente: string | null): string {
  if (!nomeCliente) return 'todos os clientes';
  if (escopo === 'area') return nomeCliente;
  return 'todos os clientes (sem vínculo de equipe)';
}

export function rotuloJanela(periodo: string): string {
  if (periodo === 'ciclo') return 'ciclo ativo';
  const casa = /^(\d+)d$/.exec(periodo ?? '');
  return casa ? `últimos ${casa[1]} dias` : 'últimos 30 dias';
}

/** Fontes que falharam, para o banner de erro dizer O QUE está faltando. */
export function listarFalhas(fontes: { rotulo: string; falhou: boolean }[]): string[] {
  return (fontes || []).filter((f) => f?.falhou).map((f) => f.rotulo);
}
